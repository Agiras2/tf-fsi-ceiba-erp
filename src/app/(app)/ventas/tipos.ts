import type { Pagina } from "@/lib/esquemas/comunes";
import type { EstadoVenta, MedioPago } from "@/lib/esquemas/ventas";

type Ref = { id: number; nombre: string };

/** Fila del listado GET /api/ventas. */
export type FilaVenta = {
  id: number;
  fecha: string;
  estado: EstadoVenta;
  medioPago: MedioPago;
  total: number;
  items: number;
  sucursal: { id: number; codigo: string; nombre: string };
  cajero: Ref;
  cliente: { id: number; documento: string; nombre: string } | null;
};

export type ResumenVentas = { ventas: number; totalVendido: number; ticketPromedio: number; anuladas: number };

export type RespuestaVentas = Pagina<FilaVenta> & { resumen: ResumenVentas };

export type LineaVenta = {
  id: number;
  productoId: number;
  cantidad: number;
  precioUnitario: number;
  subtotal: number;
  /** Solo para administrador y gerente. */
  costoUnitario?: number;
  producto: { id: number; sku: string; nombre: string; unidad: string };
};

/** Detalle GET /api/ventas/{id} (tambien lo devuelven registrar y anular). */
export type Venta = Omit<FilaVenta, "items"> & {
  anuladaPor: Ref | null;
  fechaAnulacion: string | null;
  motivoAnulacion: string | null;
  /** Solo para administrador y gerente. */
  costoTotal?: number;
  utilidad?: number;
  detalles: LineaVenta[];
};
