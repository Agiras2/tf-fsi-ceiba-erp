import type { Pagina } from "@/lib/esquemas/comunes";
import type { EstadoOrden, OrigenOrden } from "@/lib/esquemas/compras";

type Ref = { id: number; nombre: string };

/** Fila del listado GET /api/ordenes-compra. */
export type FilaOrden = {
  id: number;
  estado: EstadoOrden;
  origen: OrigenOrden;
  total: number;
  fechaEsperada: string;
  fechaRecepcion: string | null;
  vencida: boolean;
  aTiempo: boolean | null;
  createdAt: string;
  ejecucionAgenteId: number | null;
  items: number;
  proveedor: Ref;
  sucursal: { id: number; codigo: string; nombre: string };
  creadaPor: Ref | null;
};

export type RespuestaOrdenes = Pagina<FilaOrden> & { resumen: Record<EstadoOrden, number> & { vencidas: number } };

export type LineaOrden = {
  id: number;
  productoId: number;
  cantidad: number;
  costoUnitario: number;
  subtotal: number;
  producto: { id: number; sku: string; nombre: string; unidad: string; activo: boolean };
};

/** Detalle GET /api/ordenes-compra/{id}. */
export type Orden = Omit<FilaOrden, "items" | "proveedor"> & {
  proveedor: Ref & { nit: string; tiempoEntregaDias: number };
  aprobadaPor: Ref | null;
  recibidaPor: Ref | null;
  fechaAprobacion: string | null;
  motivoCancelacion: string | null;
  observaciones: string | null;
  ejecucionAgente: { id: number; agente: string; fechaInicio: string } | null;
  detalles: LineaOrden[];
};

export type AccionesCompras = { crear: boolean; editar: boolean; aprobar: boolean; cancelar: boolean; recibir: boolean };

export type Proveedor = Ref & { tiempoEntregaDias: number };
export type Opcion = Ref;
