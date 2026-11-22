// ============================================================
// CeibaERP - Reglas y esquemas de ventas (docs/04-REQ RF-16 a RF-18, RN-01 a RN-06, RN-10)
// Compartido por cliente y servidor.
// ============================================================
import { z } from "@/lib/zod";
import { fecha, id, texto } from "./comunes";

export const MEDIOS_PAGO = ["EFECTIVO", "TARJETA_DEBITO", "TARJETA_CREDITO", "TRANSFERENCIA"] as const;
export type MedioPago = (typeof MEDIOS_PAGO)[number];

export const ETIQUETA_MEDIO_PAGO: Record<MedioPago, string> = {
  EFECTIVO: "Efectivo",
  TARJETA_DEBITO: "Tarjeta débito",
  TARJETA_CREDITO: "Tarjeta crédito",
  TRANSFERENCIA: "Transferencia",
};

export const ESTADOS_VENTA = ["REGISTRADA", "ANULADA"] as const;
export type EstadoVenta = (typeof ESTADOS_VENTA)[number];

export const ETIQUETA_ESTADO_VENTA: Record<EstadoVenta, string> = {
  REGISTRADA: "Registrada",
  ANULADA: "Anulada",
};

export const MAX_ITEMS_VENTA = 50;
export const MAX_CANTIDAD_ITEM = 1000;

/** Un item de la venta: solo producto y cantidad. El precio lo pone el servidor (RN-02). */
export const esquemaItemVenta = z
  .object({
    productoId: id,
    cantidad: z.coerce.number().int().min(1).max(MAX_CANTIDAD_ITEM),
  })
  .strict();

/**
 * RF-16: registrar una venta. Esquema estricto: si el cliente envia precios,
 * totales o la sucursal, la peticion se rechaza (RN-03, RN-05).
 */
export const esquemaVenta = z
  .object({
    clienteId: id.nullable().optional(),
    medioPago: z.enum(MEDIOS_PAGO),
    items: z.array(esquemaItemVenta).min(1, { message: "Agregue al menos un producto." }).max(MAX_ITEMS_VENTA),
  })
  .strict()
  .superRefine((d, ctx) => {
    const vistos = new Set<number>();
    d.items.forEach((it, i) => {
      if (vistos.has(it.productoId)) {
        ctx.addIssue({ code: "custom", path: ["items", i, "productoId"], message: "El producto está repetido; sume la cantidad en una sola línea." });
      }
      vistos.add(it.productoId);
    });
  });

/** RF-18 y RN-10: la anulacion exige un motivo. */
export const esquemaAnulacion = z.object({ motivo: texto(5, 200) }).strict();

/** Filtros del listado de ventas (RF-17). */
export const esquemaFiltrosVentas = z
  .object({
    desde: fecha.optional(),
    hasta: fecha.optional(),
    estado: z.enum([...ESTADOS_VENTA, "todos"]).default("todos"),
    medioPago: z.enum([...MEDIOS_PAGO, "todos"]).default("todos"),
  })
  .refine((f) => !f.desde || !f.hasta || f.desde <= f.hasta, {
    message: "La fecha inicial debe ser anterior o igual a la final.",
    path: ["hasta"],
  });

export type DatosVenta = z.infer<typeof esquemaVenta>;
export type ItemVenta = z.infer<typeof esquemaItemVenta>;
export type DatosAnulacion = z.infer<typeof esquemaAnulacion>;

/** Subtotal y total con aritmetica entera en centavos (evita errores de coma flotante). */
export function calcularTotales(items: { cantidad: number; precio: number }[]) {
  const lineas = items.map((it) => Math.round(it.precio * 100) * it.cantidad);
  return { subtotales: lineas.map((c) => c / 100), total: lineas.reduce((a, c) => a + c, 0) / 100 };
}
