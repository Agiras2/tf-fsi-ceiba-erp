import type { EstadoInventario } from "@/lib/esquemas/inventario";
import type { Pagina } from "@/lib/esquemas/comunes";

export type FilaInventario = {
  id: number;
  productoId: number;
  sucursalId: number;
  stock: number;
  stockMinimo: number;
  stockMaximo: number;
  estado: EstadoInventario;
  updatedAt: string;
  producto: {
    id: number; sku: string; nombre: string; unidad: string; precio: number; costo: number; proveedorId: number;
    categoria: { id: number; nombre: string };
  };
  sucursal: { id: number; codigo: string; nombre: string };
};

export type RespuestaInventario = Pagina<FilaInventario> & { resumen: Record<EstadoInventario, number> };

export type Movimiento = {
  id: number;
  tipo: "CARGA_INICIAL" | "VENTA" | "ANULACION_VENTA" | "RECEPCION_COMPRA" | "AJUSTE_ENTRADA" | "AJUSTE_SALIDA";
  cantidad: number;
  stockResultante: number;
  referenciaTipo: string | null;
  referenciaId: number | null;
  motivo: string | null;
  fecha: string;
  usuario: { nombre: string } | null;
};

export type AccionesInventario = { umbrales: boolean; ajustar: boolean; kardex: boolean };

export type Opcion = { id: number; nombre: string };
