// ============================================================
// CeibaERP - Consulta de auditoria (docs/04-REQ RF-05, RNF-05)
// ============================================================
import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/server/db";
import { z } from "@/lib/zod";
import { esquemaListado } from "@/lib/esquemas/comunes";
import { errorCampo, filtroId, pagina, paginar } from "./comun";

const fechaOpcional = z.preprocess(
  (v) => (v === "" || v == null ? undefined : v),
  z.string().regex(/^\d{4}-\d{2}-\d{2}$/, { message: "Use el formato AAAA-MM-DD." }).optional(),
);

/** Fecha local de Bogota (UTC-5, sin horario de verano) a instante UTC. */
function inicioDiaBogota(fecha: string, diasExtra = 0): Date {
  const [a, m, d] = fecha.split("-").map(Number);
  return new Date(Date.UTC(a, m - 1, d + diasExtra, 5));
}

export const servicioAuditoria = {
  async listar(params: URLSearchParams) {
    const p = esquemaListado.parse(Object.fromEntries(params));
    const desde = fechaOpcional.parse(params.get("desde"));
    const hasta = fechaOpcional.parse(params.get("hasta"));
    if (desde && hasta && desde > hasta) throw errorCampo("hasta", "La fecha final debe ser posterior a la inicial.");
    const entidad = params.get("entidad");

    const where: Prisma.AuditoriaWhereInput = {
      usuarioId: filtroId(params, "usuarioId"),
      entidad: entidad && entidad !== "todas" ? entidad : undefined,
      accion: p.q ? { contains: p.q.toUpperCase().replace(/\s+/g, "_") } : undefined,
      fecha: desde || hasta
        ? { gte: desde ? inicioDiaBogota(desde) : undefined, lt: hasta ? inicioDiaBogota(hasta, 1) : undefined }
        : undefined,
    };
    const [datos, total] = await Promise.all([
      prisma.auditoria.findMany({
        where, ...paginar(p), orderBy: [{ fecha: "desc" }, { id: "desc" }],
        include: { usuario: { select: { nombre: true, email: true } } },
      }),
      prisma.auditoria.count({ where }),
    ]);
    return pagina(datos, total, p);
  },

  /** Entidades registradas, para el filtro de la pantalla. */
  async entidades(): Promise<string[]> {
    const filas = await prisma.auditoria.findMany({ distinct: ["entidad"], select: { entidad: true }, orderBy: { entidad: "asc" } });
    return filas.map((f) => f.entidad);
  },
};
