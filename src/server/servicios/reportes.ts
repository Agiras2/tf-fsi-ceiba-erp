// ============================================================
// CeibaERP - Reportes exportables en CSV (docs/04-REQ RF-30)
// Usan el mismo servicio de KPI que el dashboard, con los mismos filtros.
// ============================================================
import { generarCsv, fechaCsv, type ColumnaCsv } from "@/server/csv";
import { ETIQUETA_MEDIO_PAGO, type MedioPago } from "@/lib/esquemas/ventas";
import { ETIQUETA_ESTADO_INVENTARIO } from "@/lib/esquemas/inventario";
import { hoyBogota } from "@/lib/fechas";
import {
  alertasInventario, cumplimientoProveedores, lineasVentas,
  type Alerta, type CumplimientoProveedor, type FiltrosKpi, type LineaVentaReporte,
} from "./kpi";
import { auditar, type Contexto } from "./comun";

export type ArchivoCsv = { nombre: string; contenido: string; filas: number };

const sufijo = (f: FiltrosKpi) => `${f.desde}_${f.hasta}${f.sucursalId ? `_suc${f.sucursalId}` : ""}`;

async function registrar(ctx: Contexto, reporte: string, f: Partial<FiltrosKpi>, filas: number) {
  await auditar(ctx, "REPORTE_EXPORTADO", "reporte", null, {
    reporte, filas,
    filtros: { desde: f.desde ?? null, hasta: f.hasta ?? null, sucursalId: f.sucursalId ?? null, categoriaId: f.categoriaId ?? null },
  });
}

/** Ventas detalladas por item (solo ventas registradas, igual que KPI-01). */
export async function reporteVentas(f: FiltrosKpi, ctx: Contexto): Promise<ArchivoCsv> {
  const filas = await lineasVentas(f);
  const columnas: ColumnaCsv<LineaVentaReporte>[] = [
    { titulo: "Fecha", valor: (r) => fechaCsv(r.fecha) },
    { titulo: "Venta", valor: (r) => r.venta_id },
    { titulo: "Sucursal", valor: (r) => r.sucursal },
    { titulo: "Cajero", valor: (r) => r.cajero },
    { titulo: "Documento cliente", valor: (r) => r.cliente_documento },
    { titulo: "Cliente", valor: (r) => r.cliente },
    { titulo: "Medio de pago", valor: (r) => ETIQUETA_MEDIO_PAGO[r.medio_pago as MedioPago] ?? r.medio_pago },
    { titulo: "SKU", valor: (r) => r.sku },
    { titulo: "Producto", valor: (r) => r.producto },
    { titulo: "Categoría", valor: (r) => r.categoria },
    { titulo: "Cantidad", valor: (r) => r.cantidad },
    { titulo: "Precio unitario", valor: (r) => r.precio_unitario },
    { titulo: "Costo unitario", valor: (r) => r.costo_unitario },
    { titulo: "Subtotal", valor: (r) => r.subtotal },
  ];
  await registrar(ctx, "ventas", f, filas.length);
  return { nombre: `ceiba-ventas_${sufijo(f)}.csv`, contenido: generarCsv(columnas, filas), filas: filas.length };
}

/** Inventario agotado o bajo minimo (situacion actual). */
export async function reporteInventarioCritico(f: Pick<FiltrosKpi, "sucursalId" | "categoriaId">, ctx: Contexto): Promise<ArchivoCsv> {
  const filas = await alertasInventario(f);
  const columnas: ColumnaCsv<Alerta>[] = [
    { titulo: "Sucursal", valor: (r) => r.sucursal },
    { titulo: "SKU", valor: (r) => r.sku },
    { titulo: "Producto", valor: (r) => r.producto },
    { titulo: "Categoría", valor: (r) => r.categoria },
    { titulo: "Proveedor", valor: (r) => r.proveedor },
    { titulo: "Tiempo de entrega (días)", valor: (r) => r.tiempoEntregaDias },
    { titulo: "Stock", valor: (r) => r.stock },
    { titulo: "Mínimo", valor: (r) => r.stockMinimo },
    { titulo: "Máximo", valor: (r) => r.stockMaximo },
    { titulo: "Estado", valor: (r) => ETIQUETA_ESTADO_INVENTARIO[r.estado] },
    { titulo: "Faltante hasta el máximo", valor: (r) => r.stockMaximo - r.stock },
    { titulo: "Con orden abierta", valor: (r) => (r.enPedido ? "Sí" : "No") },
  ];
  await registrar(ctx, "inventario-bajo-minimo", f, filas.length);
  const hoy = hoyBogota();
  return {
    nombre: `ceiba-inventario-bajo-minimo_${hoy}${f.sucursalId ? `_suc${f.sucursalId}` : ""}.csv`,
    contenido: generarCsv(columnas, filas),
    filas: filas.length,
  };
}

/** Cumplimiento de entregas por proveedor (KPI-06). */
export async function reporteCumplimiento(f: FiltrosKpi, ctx: Contexto): Promise<ArchivoCsv> {
  const filas = await cumplimientoProveedores(f);
  const columnas: ColumnaCsv<CumplimientoProveedor>[] = [
    { titulo: "Proveedor", valor: (r) => r.proveedor },
    { titulo: "NIT", valor: (r) => r.nit },
    { titulo: "Tiempo de entrega (días)", valor: (r) => r.tiempoEntregaDias },
    { titulo: "Órdenes que debían llegar", valor: (r) => r.debidas },
    { titulo: "A tiempo", valor: (r) => r.aTiempo },
    { titulo: "Tardías", valor: (r) => r.tardias },
    { titulo: "Pendientes vencidas", valor: (r) => r.pendientesVencidas },
    { titulo: "Cumplimiento (%)", valor: (r) => r.cumplimiento },
    { titulo: "Retraso promedio de las tardías (días)", valor: (r) => r.retrasoPromedioDias },
  ];
  await registrar(ctx, "cumplimiento-proveedores", f, filas.length);
  return { nombre: `ceiba-cumplimiento-proveedores_${sufijo(f)}.csv`, contenido: generarCsv(columnas, filas), filas: filas.length };
}
