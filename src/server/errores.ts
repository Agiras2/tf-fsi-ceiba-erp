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
  if (codigoPrisma === "P2002") return respuestaError(409, "DUPLICADO", "Ya existe un registro con ese valor único.");
  if (codigoPrisma === "P2025") return respuestaError(404, "NO_ENCONTRADO", "El recurso no existe.");
  if (codigoPrisma === "P2003") return respuestaError(409, "EN_USO", "El registro está relacionado con otros datos.");
  console.error("[CeibaERP] Error no controlado:", e);
  return respuestaError(500, "ERROR_INTERNO", "Ocurrió un error inesperado. Intente de nuevo.");
}
