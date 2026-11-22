// ============================================================
// CeibaERP - Errores de dominio y formato uniforme de respuesta
// (docs/04-REQ seccion 4.9)
// ============================================================
import { NextResponse } from "next/server";
import { ZodError } from "zod";

export class ErrorApi extends Error {
  constructor(
    public readonly status: number,
    public readonly codigo: string,
    mensaje: string,
    public readonly detalles: unknown[] = [],
  ) {
    super(mensaje);
    this.name = "ErrorApi";
  }
}

export const errores = {
  noAutenticado: () => new ErrorApi(401, "NO_AUTENTICADO", "Debe iniciar sesión para continuar."),
  sinPermiso: () => new ErrorApi(403, "SIN_PERMISO", "No tiene permiso para realizar esta operación."),
  noEncontrado: (recurso = "El recurso") => new ErrorApi(404, "NO_ENCONTRADO", `${recurso} no existe.`),
  conflicto: (codigo: string, mensaje: string) => new ErrorApi(409, codigo, mensaje),
  demasiadosIntentos: (mensaje: string) => new ErrorApi(429, "DEMASIADOS_INTENTOS", mensaje),
};

type CuerpoError = { error: { codigo: string; mensaje: string; detalles: unknown[] } };

export function respuestaError(status: number, codigo: string, mensaje: string, detalles: unknown[] = []) {
  return NextResponse.json<CuerpoError>({ error: { codigo, mensaje, detalles } }, { status });
}

/** Convierte cualquier error en una respuesta con el formato uniforme, sin exponer trazas. */
export function manejarError(e: unknown): NextResponse<CuerpoError> {
  if (e instanceof ErrorApi) return respuestaError(e.status, e.codigo, e.message, e.detalles);
  if (e instanceof ZodError) {
    const detalles = e.issues.map((i) => ({ campo: i.path.join("."), mensaje: i.message }));
    return respuestaError(400, "DATOS_INVALIDOS", "Los datos enviados no son válidos.", detalles);
  }
  const codigoPrisma = (e as { code?: string })?.code;
  if (codigoPrisma === "P2002") {
    const campos = camposUnicos(e);
    const detalles = campos.map((campo) => ({ campo, mensaje: "Ya existe un registro con este valor." }));
    const sufijo = campos.length ? `: ${campos.join(", ")}` : "";
    return respuestaError(409, "DUPLICADO", `Ya existe un registro con ese valor único${sufijo}.`, detalles);
  }
  if (codigoPrisma === "P2025") return respuestaError(404, "NO_ENCONTRADO", "El recurso no existe.");
  if (codigoPrisma === "P2003") return respuestaError(409, "EN_USO", "El registro está relacionado con otros datos.");
  if (esFallaDeConexion(e)) {
    console.error("[CeibaERP] Base de datos no disponible:", (e as Error)?.message?.slice(0, 200) ?? e);
    return respuestaError(503, "BD_NO_DISPONIBLE", "La base de datos no respondió a tiempo. Intente de nuevo en unos segundos.");
  }
  console.error("[CeibaERP] Error no controlado:", e);
  return respuestaError(500, "ERROR_INTERNO", "Ocurrió un error inesperado. Intente de nuevo.");
}

// P2028: no se pudo iniciar la transaccion a tiempo; P1001/P1002/P1008/P1017: servidor
// inalcanzable, tiempo agotado o conexion cerrada (DEF-05, docs/10-PRU).
const CODIGOS_CONEXION = new Set(["P1001", "P1002", "P1008", "P1017", "P2028"]);
const MENSAJES_CONEXION = /timeout exceeded when trying to connect|Connection terminated|ECONNRESET|ETIMEDOUT|ECONNREFUSED|Unable to start a transaction/i;

/** Falla transitoria de la conexion con la base de datos: se responde 503 y no 500. */
export function esFallaDeConexion(e: unknown): boolean {
  const codigo = (e as { code?: string })?.code;
  if (codigo && CODIGOS_CONEXION.has(codigo)) return true;
  return e instanceof Error && MENSAJES_CONEXION.test(e.message);
}

/** Campos de la restriccion de unicidad violada (formato clasico de Prisma o del adaptador pg). */
function camposUnicos(e: unknown): string[] {
  const meta = (e as { meta?: Record<string, unknown> })?.meta ?? {};
  const target = meta.target;
  if (Array.isArray(target)) return target.map(String);
  if (typeof target === "string") return [target];
  const causa = (meta.driverAdapterError as { cause?: { table?: string; constraint?: { fields?: unknown; index?: string } } })?.cause;
  const campos = causa?.constraint?.fields;
  if (Array.isArray(campos)) return campos.map((c) => aCamelCase(String(c).replace(/"/g, "")));
  // Con el adaptador pg llega el nombre del indice: "<tabla>_<columna>_key".
  const indice = causa?.constraint?.index;
  if (indice && causa?.table && indice.startsWith(`${causa.table}_`) && indice.endsWith("_key")) {
    return [aCamelCase(indice.slice(causa.table.length + 1, -4))];
  }
  return [];
}

function aCamelCase(columna: string): string {
  return columna.replace(/_([a-z])/g, (_, l: string) => l.toUpperCase());
}
