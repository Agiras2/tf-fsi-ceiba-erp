// ============================================================
// CeibaERP - Reglas y esquemas de inventario (docs/04-REQ RF-12 a RF-15)
// Compartido por cliente y servidor.
// ============================================================
import { z } from "@/lib/zod";
import { texto } from "./comunes";

export const ESTADOS_INVENTARIO = ["AGOTADO", "BAJO_MINIMO", "NORMAL", "SOBRESTOCK"] as const;
export type EstadoInventario = (typeof ESTADOS_INVENTARIO)[number];

export const ETIQUETA_ESTADO_INVENTARIO: Record<EstadoInventario, string> = {
  AGOTADO: "Agotado",
  BAJO_MINIMO: "Bajo mínimo",
  NORMAL: "Normal",
  SOBRESTOCK: "Sobrestock",
};

/** RN-12: estado del inventario segun el stock y sus umbrales. */
export function estadoInventario(stock: number, minimo: number, maximo: number): EstadoInventario {
  if (stock === 0) return "AGOTADO";
  if (stock <= minimo) return "BAJO_MINIMO";
  if (stock > maximo) return "SOBRESTOCK";
  return "NORMAL";
}

const entero = (min: number, max: number) => z.coerce.number().int().min(min).max(max);

/** RF-13 y RN-13: stock minimo >= 0 y maximo > minimo. */
export const esquemaUmbrales = z
  .object({ stockMinimo: entero(0, 100_000), stockMaximo: entero(1, 100_000) })
  .strict()
  .refine((d) => d.stockMaximo > d.stockMinimo, {
    message: "El máximo debe ser mayor que el mínimo.",
    path: ["stockMaximo"],
  });

/** RF-14 y RN-11: ajuste de entrada o salida con motivo obligatorio. */
export const esquemaAjuste = z
  .object({
    tipo: z.enum(["ENTRADA", "SALIDA"]),
    cantidad: entero(1, 100_000),
    motivo: texto(5, 200),
  })
  .strict();

export type DatosUmbrales = z.infer<typeof esquemaUmbrales>;
export type DatosAjuste = z.infer<typeof esquemaAjuste>;
