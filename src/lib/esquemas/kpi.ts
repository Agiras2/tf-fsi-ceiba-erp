// ============================================================
// CeibaERP - Filtros del dashboard y de los reportes (docs/06-KPI seccion 1)
// Compartido por cliente y servidor.
// ============================================================
import { z } from "@/lib/zod";
import { hoyBogota, sumarDias } from "@/lib/fechas";
import { fecha } from "./comunes";

export const DIAS_POR_DEFECTO = 30;
export const MAX_DIAS_PERIODO = 366;

export type Periodo = { desde: string; hasta: string };

/** Dias del periodo, ambos extremos incluidos. */
export function diasDelPeriodo(p: Periodo): number {
  return Math.round((Date.parse(`${p.hasta}T00:00:00Z`) - Date.parse(`${p.desde}T00:00:00Z`)) / 86_400_000) + 1;
}

/**
 * Ultimos dias completos hasta ayer (hora de Bogota). Se excluye hoy porque el dia
 * esta en curso y compararlo con un dia completo del periodo anterior sesgaria la variacion.
 */
export function periodoUltimosDias(dias: number, hoy: string = hoyBogota()): Periodo {
  const ayer = sumarDias(hoy, -1);
  return { desde: sumarDias(ayer, -(dias - 1)), hasta: ayer };
}

/** Periodo por defecto: los ultimos 30 dias completos. */
export function periodoPorDefecto(hoy: string = hoyBogota()): Periodo {
  return periodoUltimosDias(DIAS_POR_DEFECTO, hoy);
}

/** Periodo de igual duracion inmediatamente anterior (para la variacion). */
export function periodoAnterior(p: Periodo): Periodo {
  const n = diasDelPeriodo(p);
  return { desde: sumarDias(p.desde, -n), hasta: sumarDias(p.desde, -1) };
}

export const esquemaPeriodo = z
  .object({ desde: fecha, hasta: fecha })
  .refine((p) => p.desde <= p.hasta, { message: "La fecha inicial debe ser anterior o igual a la final.", path: ["hasta"] })
  .refine((p) => diasDelPeriodo(p) <= MAX_DIAS_PERIODO, {
    message: `El periodo puede tener como máximo ${MAX_DIAS_PERIODO} días.`, path: ["desde"],
  });

export const CRITERIOS_TOP = ["unidades", "valor"] as const;
export type CriterioTop = (typeof CRITERIOS_TOP)[number];
