// ============================================================
// CeibaERP - Utilidades compartidas por los servicios de dominio
// ============================================================
import type { Prisma } from "@/generated/prisma/client";
import type { SesionActiva } from "@/server/auth/autorizacion";
import { esquemaListado, type Pagina, type ParametrosListado } from "@/lib/esquemas/comunes";
import { ErrorApi } from "@/server/errores";
import { registrarAuditoria } from "@/server/auditoria";

/** Contexto de cada operacion: quien la hace y desde donde. */
export type Contexto = { sesion: SesionActiva; ip: string | null };

/** Lee los parametros comunes de listado desde la URL. */
export function leerListado(params: URLSearchParams): ParametrosListado {
  return esquemaListado.parse(Object.fromEntries(params));
}

/** Lee un filtro numerico opcional (ej. categoriaId) desde la URL. */
export function filtroId(params: URLSearchParams, nombre: string): number | undefined {
  const v = params.get(nombre);
  if (v === null || v === "" || v === "todos") return undefined;
  const n = Number(v);
  if (!Number.isInteger(n) || n <= 0) throw new ErrorApi(400, "DATOS_INVALIDOS", `El filtro ${nombre} no es válido.`);
  return n;
}

/** Filtro de estado activo/inactivo segun el parametro "activo". */
export function filtroActivo(activo: ParametrosListado["activo"]): boolean | undefined {
  return activo === "todos" ? undefined : activo === "true";
}

export function paginar(p: ParametrosListado) {
  return { skip: (p.pagina - 1) * p.tamano, take: p.tamano };
}

export function pagina<T>(datos: T[], total: number, p: ParametrosListado): Pagina<T> {
  return { datos, total, pagina: p.pagina, tamano: p.tamano };
}

/** Busqueda insensible a mayusculas en varios campos de texto. */
export function busqueda(q: string, campos: string[]) {
  if (!q) return {};
  return { OR: campos.map((c) => ({ [c]: { contains: q, mode: "insensitive" as const } })) };
}

/** Convierte Decimal de Prisma a number para la respuesta JSON. */
export function aNumero(v: Prisma.Decimal | number | null | undefined): number | null {
  if (v === null || v === undefined) return null;
  return typeof v === "number" ? v : v.toNumber();
}

/** Diferencias entre el registro anterior y los datos nuevos (para auditoria). */
export function cambios(antes: Record<string, unknown>, nuevos: Record<string, unknown>): Prisma.InputJsonObject {
  const resultado: Record<string, { antes: unknown; despues: unknown }> = {};
  for (const [k, v] of Object.entries(nuevos)) {
    if (v === undefined) continue;
    const anterior = antes[k] as unknown;
    const a = anterior instanceof Object && "toNumber" in anterior ? (anterior as Prisma.Decimal).toNumber() : anterior;
    if (a !== v) resultado[k] = { antes: a ?? null, despues: v };
  }
  return resultado as Prisma.InputJsonObject;
}

export async function auditar(
  ctx: Contexto,
  accion: string,
  entidad: string,
  entidadId: number | null,
  detalle?: Prisma.InputJsonValue,
  cliente?: Prisma.TransactionClient,
) {
  await registrarAuditoria(
    { usuarioId: ctx.sesion.usuarioId, accion, entidad, entidadId, detalle, ip: ctx.ip },
    cliente,
  );
}

/** Error 400 con detalle por campo (mismo formato que Zod). */
export function errorCampo(campo: string, mensaje: string) {
  return new ErrorApi(400, "DATOS_INVALIDOS", "Los datos enviados no son válidos.", [{ campo, mensaje }]);
}

/** Interfaz comun de los servicios CRUD expuestos por las rutas genericas. */
export interface ServicioCrud {
  listar(params: URLSearchParams, ctx: Contexto): Promise<Pagina<unknown>>;
  obtener(id: number, ctx: Contexto): Promise<unknown>;
  crear(datos: unknown, ctx: Contexto): Promise<unknown>;
  actualizar(id: number, datos: unknown, ctx: Contexto): Promise<unknown>;
  eliminar(id: number, ctx: Contexto): Promise<{ resultado: "eliminado" | "desactivado" }>;
}
