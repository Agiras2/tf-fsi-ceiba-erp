// ============================================================
// CeibaERP - Fechas del negocio en hora de Bogota (UTC-5, sin horario de verano)
// Compartido por cliente y servidor. Las fechas de los filtros se envian
// como "AAAA-MM-DD" y se interpretan como dias completos en Bogota.
// ============================================================

const OFFSET_BOGOTA_MS = -5 * 3600_000;
const DIA_MS = 86_400_000;

/** Fecha de hoy en Bogota como "AAAA-MM-DD". */
export function hoyBogota(ahora: Date = new Date()): string {
  return new Date(ahora.getTime() + OFFSET_BOGOTA_MS).toISOString().slice(0, 10);
}

/** Suma dias a una fecha "AAAA-MM-DD". */
export function sumarDias(fecha: string, dias: number): string {
  return new Date(Date.parse(`${fecha}T00:00:00Z`) + dias * DIA_MS).toISOString().slice(0, 10);
}

/** Valor para columnas DATE (medianoche UTC del dia indicado). */
export function aFechaDb(fecha: string): Date {
  return new Date(`${fecha}T00:00:00Z`);
}

/** Convierte una columna DATE leida de la BD a "AAAA-MM-DD". */
export function deFechaDb(fecha: Date): string {
  return fecha.toISOString().slice(0, 10);
}

/** Instante UTC en que empieza el dia indicado en Bogota. */
export function inicioDiaBogota(fecha: string): Date {
  return new Date(Date.parse(`${fecha}T00:00:00Z`) - OFFSET_BOGOTA_MS);
}

/** Rango [desde, hasta+1 dia) en UTC para filtrar columnas con fecha y hora. */
export function rangoBogota(desde?: string, hasta?: string): { gte?: Date; lt?: Date } {
  return {
    gte: desde ? inicioDiaBogota(desde) : undefined,
    lt: hasta ? inicioDiaBogota(sumarDias(hasta, 1)) : undefined,
  };
}

export const REGEX_FECHA = /^\d{4}-\d{2}-\d{2}$/;

/** Comprueba que el texto sea una fecha de calendario real (rechaza 2026-02-30). */
export function esFechaValida(fecha: string): boolean {
  if (!REGEX_FECHA.test(fecha)) return false;
  const d = new Date(`${fecha}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === fecha;
}
