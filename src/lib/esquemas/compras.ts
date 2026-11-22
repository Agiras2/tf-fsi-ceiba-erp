// ============================================================
// CeibaERP - Reglas y esquemas de ordenes de compra
// (docs/04-REQ RF-19 a RF-23, RN-06 a RN-09; docs/03-NEG seccion 8.1)
// Compartido por cliente y servidor.
// ============================================================
import { z } from "@/lib/zod";
import { fecha, id, texto, textoOpcional } from "./comunes";

export const ESTADOS_ORDEN = ["BORRADOR", "APROBADA", "RECIBIDA", "CANCELADA"] as const;
export type EstadoOrden = (typeof ESTADOS_ORDEN)[number];

export const ETIQUETA_ESTADO_ORDEN: Record<EstadoOrden, string> = {
  BORRADOR: "Borrador",
  APROBADA: "Aprobada",
  RECIBIDA: "Recibida",
  CANCELADA: "Cancelada",
};

export const ORIGENES_ORDEN = ["MANUAL", "AGENTE_INVENTARIO"] as const;
export type OrigenOrden = (typeof ORIGENES_ORDEN)[number];

export const ETIQUETA_ORIGEN_ORDEN: Record<OrigenOrden, string> = {
  MANUAL: "Manual",
  AGENTE_INVENTARIO: "Agente de IA",
};

/** RN-07: transiciones validas. Cualquier otra se rechaza con 409. */
export const TRANSICIONES_ORDEN: Record<EstadoOrden, readonly EstadoOrden[]> = {
  BORRADOR: ["APROBADA", "CANCELADA"],
  APROBADA: ["RECIBIDA", "CANCELADA"],
  RECIBIDA: [],
  CANCELADA: [],
};

export function transicionValida(desde: EstadoOrden, hacia: EstadoOrden): boolean {
  return TRANSICIONES_ORDEN[desde].includes(hacia);
}

/** Estados desde los que se puede llegar a "hacia" (para la actualizacion condicional). */
export function estadosOrigen(hacia: EstadoOrden): EstadoOrden[] {
  return ESTADOS_ORDEN.filter((e) => transicionValida(e, hacia));
}

/** RN-08: la entrega es a tiempo si se recibe en la fecha esperada o antes. */
export function entregaATiempo(fechaEsperada: string, fechaRecepcion: string): boolean {
  return fechaRecepcion <= fechaEsperada;
}

export const MAX_ITEMS_ORDEN = 60;

export const esquemaItemOrden = z
  .object({
    productoId: id,
    cantidad: z.coerce.number().int().min(1).max(100_000),
  })
  .strict();

const items = z
  .array(esquemaItemOrden)
  .min(1, { message: "Incluya al menos un producto con cantidad." })
  .max(MAX_ITEMS_ORDEN)
  .superRefine((lista, ctx) => {
    const vistos = new Set<number>();
    lista.forEach((it, i) => {
      if (vistos.has(it.productoId)) {
        ctx.addIssue({ code: "custom", path: [i, "productoId"], message: "El producto está repetido." });
      }
      vistos.add(it.productoId);
    });
  });

/**
 * RF-19: crear una orden en borrador. El costo unitario lo toma el servidor del
 * producto y la sucursal sale de la sesion (RN-05), por eso no se aceptan aqui.
 */
export const esquemaOrdenCompra = z
  .object({
    proveedorId: id,
    fechaEsperada: fecha,
    observaciones: textoOpcional(500),
    items,
  })
  .strict();

/** RF-20: editar un borrador. El proveedor no cambia; los items reemplazan a los anteriores. */
export const esquemaOrdenCompraEdicion = z
  .object({
    fechaEsperada: fecha.optional(),
    observaciones: textoOpcional(500),
    items: items.optional(),
  })
  .strict()
  .refine((d) => Object.values(d).some((v) => v !== undefined), { message: "No hay cambios para guardar." });

/** RF-21: cancelar exige motivo. */
export const esquemaCancelacionOrden = z.object({ motivo: texto(5, 200) }).strict();

/** Aprobar y recibir no llevan datos: el cuerpo debe venir vacio. */
export const esquemaSinDatos = z.object({}).strict();

export type DatosOrdenCompra = z.infer<typeof esquemaOrdenCompra>;
export type DatosOrdenCompraEdicion = z.infer<typeof esquemaOrdenCompraEdicion>;
