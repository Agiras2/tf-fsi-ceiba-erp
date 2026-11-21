// ============================================================
// CeibaERP - Registro de auditoria (docs/04-REQ RN-21)
// Un fallo al auditar no debe interrumpir la operacion principal.
// ============================================================
import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/server/db";

export type EventoAuditoria = {
  usuarioId?: number | null;
  accion: string;
  entidad: string;
  entidadId?: number | null;
  detalle?: Prisma.InputJsonValue;
  ip?: string | null;
};

export async function registrarAuditoria(ev: EventoAuditoria, cliente: Prisma.TransactionClient = prisma): Promise<void> {
  try {
    await cliente.auditoria.create({
      data: {
        usuarioId: ev.usuarioId ?? null,
        accion: ev.accion.slice(0, 40),
        entidad: ev.entidad.slice(0, 40),
        entidadId: ev.entidadId ?? null,
        detalle: ev.detalle,
        ip: ev.ip?.slice(0, 45) ?? null,
      },
    });
  } catch (e) {
    console.error("[CeibaERP] No se pudo registrar la auditoria:", (e as Error).message);
  }
}

/** IP del cliente segun los encabezados del proxy (Railway envia x-forwarded-for). */
export function ipDeSolicitud(headers: Headers): string | null {
  const reenviada = headers.get("x-forwarded-for");
  if (reenviada) return reenviada.split(",")[0].trim();
  return headers.get("x-real-ip");
}
