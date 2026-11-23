// ============================================================
// CeibaERP - Servicio unico de KPI, graficos, alertas y reportes (docs/06-KPI)
// Lo usan el dashboard, los reportes CSV y, en las Fases 6 y 7, las
// herramientas del chatbot y de los agentes: todos ven las mismas cifras.
// Las consultas siguen las de verificacion de docs/06-KPI, con los dias
// interpretados en hora de Bogota y las tablas calificadas con el esquema.
// ============================================================
import { Prisma } from "@/generated/prisma/client";
import { esquemaDb, prisma } from "@/server/db";
import { ErrorApi } from "@/server/errores";
import { sucursalPermitida } from "@/server/auth/autorizacion";
import { hoyBogota, inicioDiaBogota, sumarDias } from "@/lib/fechas";
import {
  diasDelPeriodo, esquemaPeriodo, periodoAnterior, periodoPorDefecto, type CriterioTop, type Periodo,
} from "@/lib/esquemas/kpi";
import { IDS_KPI, interpretar, valorKpi, type IdKpi, type ValorKpi } from "@/lib/kpi";
import type { FilaReposicion } from "@/lib/agentes";
import { filtroId, type Contexto } from "./comun";

export type FiltrosKpi = Periodo & { sucursalId: number | null; categoriaId: number | null };

/** Tabla calificada con el esquema de la conexion (nombres internos, nunca del usuario). */
const T = (tabla: string) => Prisma.raw(`"${esquemaDb}"."${tabla}"`);

const redondear = (n: number, d = 2) => Math.round(n * 10 ** d) / 10 ** d;
const pct = (parte: number, total: number) => (total > 0 ? redondear((parte / total) * 100) : null);

/**
 * Instante como timestamptz explicito (ISO con Z). Un Date como parametro se envia
 * sin zona horaria y PostgreSQL lo interpretaria en la zona de la sesion.
 */
const ts = (d: Date) => Prisma.sql`${d.toISOString()}::timestamptz`;

/** Limites del periodo: [inicio del primer dia, inicio del dia siguiente al ultimo) en Bogota. */
function limites(p: Periodo) {
  return { ini: ts(inicioDiaBogota(p.desde)), fin: ts(inicioDiaBogota(sumarDias(p.hasta, 1))) };
}

const condSucursal = (col: Prisma.Sql, id: number | null) => (id === null ? Prisma.sql`TRUE` : Prisma.sql`${col} = ${id}`);
const condCategoria = (id: number | null) => (id === null ? Prisma.sql`TRUE` : Prisma.sql`p.categoria_id = ${id}`);

/**
 * Lee periodo, sucursal y categoria de la URL. Sin fechas: ultimos 30 dias.
 * BODEGA y CAJERO quedan limitados a su sucursal (RN-05).
 */
export function leerFiltros(params: URLSearchParams, ctx: Contexto): FiltrosKpi {
  const defecto = periodoPorDefecto();
  const periodo = esquemaPeriodo.parse({
    desde: params.get("desde") || defecto.desde,
    hasta: params.get("hasta") || defecto.hasta,
  });
  return {
    ...periodo,
    sucursalId: sucursalPermitida(ctx.sesion, filtroId(params, "sucursalId")),
    categoriaId: filtroId(params, "categoriaId") ?? null,
  };
}

// ------------------------------------------------------------
// Consultas base de los KPI
// ------------------------------------------------------------

/** KPI-01, KPI-02, KPI-03 y el costo de lo vendido (KPI-08). */
async function resumenVentas(f: FiltrosKpi) {
  const { ini, fin } = limites(f);
  const [r] = await prisma.$queryRaw<{ ventas: number; num_ventas: number; costo: number }[]>`
    SELECT COALESCE(SUM(dv.subtotal), 0)::float8 AS ventas,
           COUNT(DISTINCT v.id)::int AS num_ventas,
           COALESCE(SUM(dv.cantidad * dv.costo_unitario), 0)::float8 AS costo
    FROM ${T("detalle_venta")} dv
    JOIN ${T("venta")} v ON v.id = dv.venta_id
    JOIN ${T("producto")} p ON p.id = dv.producto_id
    WHERE v.estado = 'REGISTRADA' AND v.fecha >= ${ini} AND v.fecha < ${fin}
      AND ${condSucursal(Prisma.sql`v.sucursal_id`, f.sucursalId)} AND ${condCategoria(f.categoriaId)}`;
  return {
    ventas: r.ventas,
    numVentas: r.num_ventas,
    costo: r.costo,
    ticket: r.num_ventas > 0 ? redondear(r.ventas / r.num_ventas) : null,
    margen: r.ventas > 0 ? redondear(((r.ventas - r.costo) / r.ventas) * 100) : null,
  };
}

/** KPI-04: situacion actual del inventario. */
async function agotamiento(f: FiltrosKpi) {
  const [r] = await prisma.$queryRaw<{ agotados: number; total: number }[]>`
    SELECT COUNT(*) FILTER (WHERE i.stock = 0)::int AS agotados, COUNT(*)::int AS total
    FROM ${T("inventario")} i JOIN ${T("producto")} p ON p.id = i.producto_id
    WHERE p.activo AND ${condSucursal(Prisma.sql`i.sucursal_id`, f.sucursalId)} AND ${condCategoria(f.categoriaId)}`;
  return { ...r, pct: pct(r.agotados, r.total) };
}

export type ProductoBajaRotacion = {
  productoId: number; sku: string; nombre: string; categoria: string;
  stock: number; unidadesVendidas: number; coberturaDias: number | null; valorInmovilizado: number;
};

/** KPI-05 con el detalle de cada producto (herramienta productosBajaRotacion). */
export async function productosBajaRotacion(f: FiltrosKpi, umbralDias = 60): Promise<ProductoBajaRotacion[]> {
  const { ini, fin } = limites(f);
  const dias = diasDelPeriodo(f);
  const filas = await prisma.$queryRaw<{
    producto_id: number; sku: string; nombre: string; categoria: string; stock: number;
    unidades: number; cobertura: number | null; valor: number;
  }[]>`
    WITH vendidos AS (
      SELECT dv.producto_id, SUM(dv.cantidad) AS unidades
      FROM ${T("detalle_venta")} dv JOIN ${T("venta")} v ON v.id = dv.venta_id
      WHERE v.estado = 'REGISTRADA' AND v.fecha >= ${ini} AND v.fecha < ${fin}
        AND ${condSucursal(Prisma.sql`v.sucursal_id`, f.sucursalId)}
      GROUP BY dv.producto_id
    ), existencias AS (
      SELECT i.producto_id, SUM(i.stock) AS stock
      FROM ${T("inventario")} i JOIN ${T("producto")} p ON p.id = i.producto_id
      WHERE p.activo AND ${condSucursal(Prisma.sql`i.sucursal_id`, f.sucursalId)} AND ${condCategoria(f.categoriaId)}
      GROUP BY i.producto_id
    )
    SELECT e.producto_id, p.sku, p.nombre, c.nombre AS categoria, e.stock::int AS stock,
           COALESCE(s.unidades, 0)::int AS unidades,
           CASE WHEN COALESCE(s.unidades, 0) = 0 THEN NULL
                ELSE (e.stock / (s.unidades::numeric / ${dias}))::float8 END AS cobertura,
           (e.stock * p.costo)::float8 AS valor
    FROM existencias e
    JOIN ${T("producto")} p ON p.id = e.producto_id
    JOIN ${T("categoria")} c ON c.id = p.categoria_id
    LEFT JOIN vendidos s ON s.producto_id = e.producto_id
    WHERE e.stock > 0
      AND (COALESCE(s.unidades, 0) = 0 OR e.stock / (s.unidades::numeric / ${dias}) > ${umbralDias})
    ORDER BY valor DESC, p.nombre`;
  return filas.map((r) => ({
    productoId: r.producto_id, sku: r.sku, nombre: r.nombre, categoria: r.categoria, stock: r.stock,
    unidadesVendidas: r.unidades, coberturaDias: r.cobertura === null ? null : Math.round(r.cobertura),
    valorInmovilizado: r.valor,
  }));
}

export type CumplimientoProveedor = {
  proveedorId: number; proveedor: string; nit: string; tiempoEntregaDias: number;
  debidas: number; aTiempo: number; tardias: number; pendientesVencidas: number;
  cumplimiento: number | null; retrasoPromedioDias: number | null;
};

/**
 * KPI-06 por proveedor (herramienta cumplimientoProveedores). Cuentan las ordenes
 * aprobadas o recibidas con fecha esperada en el periodo hasta hoy; una aprobada
 * sin recibir cuenta como incumplida.
 */
export async function cumplimientoProveedores(f: Pick<FiltrosKpi, "desde" | "hasta" | "sucursalId">): Promise<CumplimientoProveedor[]> {
  const hoy = hoyBogota();
  const hasta = f.hasta < hoy ? f.hasta : hoy;
  const filas = await prisma.$queryRaw<{
    id: number; nombre: string; nit: string; tiempo: number; debidas: number; a_tiempo: number;
    tardias: number; pendientes: number; retraso: number | null;
  }[]>`
    SELECT pr.id, pr.nombre, pr.nit, pr.tiempo_entrega_dias AS tiempo,
           COUNT(*)::int AS debidas,
           COUNT(*) FILTER (WHERE oc.estado = 'RECIBIDA' AND oc.fecha_recepcion <= oc.fecha_esperada)::int AS a_tiempo,
           COUNT(*) FILTER (WHERE oc.estado = 'RECIBIDA' AND oc.fecha_recepcion > oc.fecha_esperada)::int AS tardias,
           COUNT(*) FILTER (WHERE oc.estado = 'APROBADA')::int AS pendientes,
           (AVG(oc.fecha_recepcion - oc.fecha_esperada)
              FILTER (WHERE oc.estado = 'RECIBIDA' AND oc.fecha_recepcion > oc.fecha_esperada))::float8 AS retraso
    FROM ${T("orden_compra")} oc JOIN ${T("proveedor")} pr ON pr.id = oc.proveedor_id
    WHERE oc.estado IN ('APROBADA', 'RECIBIDA')
      AND oc.fecha_esperada BETWEEN ${f.desde}::date AND ${hasta}::date
      AND ${condSucursal(Prisma.sql`oc.sucursal_id`, f.sucursalId)}
    GROUP BY pr.id, pr.nombre, pr.nit, pr.tiempo_entrega_dias
    ORDER BY pr.nombre`;
  return filas.map((r) => ({
    proveedorId: r.id, proveedor: r.nombre, nit: r.nit, tiempoEntregaDias: r.tiempo,
    debidas: r.debidas, aTiempo: r.a_tiempo, tardias: r.tardias, pendientesVencidas: r.pendientes,
    cumplimiento: pct(r.a_tiempo, r.debidas),
    retrasoPromedioDias: r.retraso === null ? null : redondear(r.retraso, 1),
  }));
}

/** KPI-07: clientes con mas de una compra y clientes identificados con alguna compra. */
async function clientesRecurrentes(f: FiltrosKpi) {
  const { ini, fin } = limites(f);
  const [r] = await prisma.$queryRaw<{ recurrentes: number; identificados: number }[]>`
    SELECT COUNT(*) FILTER (WHERE t.compras > 1)::int AS recurrentes, COUNT(*)::int AS identificados
    FROM (
      SELECT v.cliente_id, COUNT(*) AS compras
      FROM ${T("venta")} v
      WHERE v.estado = 'REGISTRADA' AND v.cliente_id IS NOT NULL
        AND v.fecha >= ${ini} AND v.fecha < ${fin}
        AND ${condSucursal(Prisma.sql`v.sucursal_id`, f.sucursalId)}
      GROUP BY v.cliente_id
    ) t`;
  return r;
}

/** KPI-08: inventario inicial y final del periodo reconstruidos desde el kardex, al costo actual. */
async function inventarioValorizado(f: FiltrosKpi) {
  const { ini, fin } = limites(f);
  const [r] = await prisma.$queryRaw<{ inicial: number; final: number }[]>`
    WITH mov AS (
      SELECT m.producto_id, m.sucursal_id,
             SUM(m.cantidad) FILTER (WHERE m.fecha >= ${ini}) AS desde_inicio,
             SUM(m.cantidad) FILTER (WHERE m.fecha >= ${fin}) AS despues_fin
      FROM ${T("movimiento_inventario")} m
      WHERE m.fecha >= ${ini}
      GROUP BY m.producto_id, m.sucursal_id
    )
    SELECT COALESCE(SUM((i.stock - COALESCE(mov.desde_inicio, 0)) * p.costo), 0)::float8 AS inicial,
           COALESCE(SUM((i.stock - COALESCE(mov.despues_fin, 0)) * p.costo), 0)::float8 AS final
    FROM ${T("inventario")} i
    JOIN ${T("producto")} p ON p.id = i.producto_id
    LEFT JOIN mov ON mov.producto_id = i.producto_id AND mov.sucursal_id = i.sucursal_id
    WHERE ${condSucursal(Prisma.sql`i.sucursal_id`, f.sucursalId)} AND ${condCategoria(f.categoriaId)}`;
  return r;
}

function rotacion(costoVendido: number, inv: { inicial: number; final: number }) {
  const promedio = (inv.inicial + inv.final) / 2;
  return promedio > 0 ? redondear(costoVendido / promedio) : null;
}

// ------------------------------------------------------------
// Graficos y apoyo de la interpretacion
// ------------------------------------------------------------

export type VentasSucursal = { sucursalId: number; sucursal: string; ventas: number; numVentas: number; ticket: number | null; margen: number | null };

/** G-02 (herramienta ventasPorSucursal). */
export async function ventasPorSucursal(f: FiltrosKpi): Promise<VentasSucursal[]> {
  const { ini, fin } = limites(f);
  const filas = await prisma.$queryRaw<{ id: number; nombre: string; ventas: number; costo: number; num: number }[]>`
    WITH base AS (
      SELECT v.sucursal_id, v.id AS venta_id, dv.subtotal, dv.cantidad * dv.costo_unitario AS costo
      FROM ${T("detalle_venta")} dv
      JOIN ${T("venta")} v ON v.id = dv.venta_id
      JOIN ${T("producto")} p ON p.id = dv.producto_id
      WHERE v.estado = 'REGISTRADA' AND v.fecha >= ${ini} AND v.fecha < ${fin} AND ${condCategoria(f.categoriaId)}
    )
    SELECT s.id, s.nombre, COALESCE(SUM(b.subtotal), 0)::float8 AS ventas,
           COALESCE(SUM(b.costo), 0)::float8 AS costo, COUNT(DISTINCT b.venta_id)::int AS num
    FROM ${T("sucursal")} s LEFT JOIN base b ON b.sucursal_id = s.id
    WHERE s.activa AND ${condSucursal(Prisma.sql`s.id`, f.sucursalId)}
    GROUP BY s.id, s.nombre
    ORDER BY ventas DESC`;
  return filas.map((r) => ({
    sucursalId: r.id, sucursal: r.nombre, ventas: r.ventas, numVentas: r.num,
    ticket: r.num > 0 ? Math.round(r.ventas / r.num) : null,
    margen: r.ventas > 0 ? redondear(((r.ventas - r.costo) / r.ventas) * 100) : null,
  }));
}

/** G-01: ventas por dia del periodo y del anterior, alineadas por posicion. */
export async function ventasDiarias(f: FiltrosKpi) {
  const ant = periodoAnterior(f);
  const ini = ts(inicioDiaBogota(ant.desde));
  const fin = ts(inicioDiaBogota(sumarDias(f.hasta, 1)));
  const filas = await prisma.$queryRaw<{ dia: string; ventas: number }[]>`
    SELECT to_char((v.fecha AT TIME ZONE 'America/Bogota')::date, 'YYYY-MM-DD') AS dia,
           SUM(dv.subtotal)::float8 AS ventas
    FROM ${T("detalle_venta")} dv
    JOIN ${T("venta")} v ON v.id = dv.venta_id
    JOIN ${T("producto")} p ON p.id = dv.producto_id
    WHERE v.estado = 'REGISTRADA' AND v.fecha >= ${ini} AND v.fecha < ${fin}
      AND ${condSucursal(Prisma.sql`v.sucursal_id`, f.sucursalId)} AND ${condCategoria(f.categoriaId)}
    GROUP BY 1`;
  const porDia = new Map(filas.map((r) => [r.dia, r.ventas]));
  return Array.from({ length: diasDelPeriodo(f) }, (_, i) => {
    const dia = sumarDias(f.desde, i);
    const diaAnterior = sumarDias(ant.desde, i);
    return { dia, ventas: porDia.get(dia) ?? 0, diaAnterior, ventasAnterior: porDia.get(diaAnterior) ?? 0 };
  });
}

export type ProductoTop = { productoId: number; sku: string; nombre: string; categoria: string; unidades: number; valor: number };

/** G-03 (herramienta topProductos). */
export async function topProductos(f: FiltrosKpi, criterio: CriterioTop = "unidades", limite = 10): Promise<ProductoTop[]> {
  const { ini, fin } = limites(f);
  const orden = criterio === "valor" ? Prisma.raw("valor DESC, unidades DESC") : Prisma.raw("unidades DESC, valor DESC");
  const filas = await prisma.$queryRaw<{ id: number; sku: string; nombre: string; categoria: string; unidades: number; valor: number }[]>`
    SELECT p.id, p.sku, p.nombre, c.nombre AS categoria,
           SUM(dv.cantidad)::int AS unidades, SUM(dv.subtotal)::float8 AS valor
    FROM ${T("detalle_venta")} dv
    JOIN ${T("venta")} v ON v.id = dv.venta_id
    JOIN ${T("producto")} p ON p.id = dv.producto_id
    JOIN ${T("categoria")} c ON c.id = p.categoria_id
    WHERE v.estado = 'REGISTRADA' AND v.fecha >= ${ini} AND v.fecha < ${fin}
      AND ${condSucursal(Prisma.sql`v.sucursal_id`, f.sucursalId)} AND ${condCategoria(f.categoriaId)}
    GROUP BY p.id, p.sku, p.nombre, c.nombre
    ORDER BY ${orden}, p.nombre
    LIMIT ${Math.min(Math.max(limite, 1), 20)}`;
  return filas.map((r) => ({ productoId: r.id, sku: r.sku, nombre: r.nombre, categoria: r.categoria, unidades: r.unidades, valor: r.valor }));
}

export type EstadoSucursal = { sucursalId: number; sucursal: string; agotado: number; bajoMinimo: number; normal: number; sobrestock: number };

/** G-04: estado actual del inventario por sucursal (RN-12). */
export async function inventarioPorSucursal(f: Pick<FiltrosKpi, "sucursalId" | "categoriaId">): Promise<EstadoSucursal[]> {
  const filas = await prisma.$queryRaw<{ id: number; nombre: string; agotado: number; bajo: number; normal: number; sobre: number }[]>`
    SELECT s.id, s.nombre,
           COUNT(*) FILTER (WHERE i.stock = 0)::int AS agotado,
           COUNT(*) FILTER (WHERE i.stock > 0 AND i.stock <= i.stock_minimo)::int AS bajo,
           COUNT(*) FILTER (WHERE i.stock > i.stock_minimo AND i.stock <= i.stock_maximo)::int AS normal,
           COUNT(*) FILTER (WHERE i.stock > i.stock_maximo)::int AS sobre
    FROM ${T("inventario")} i
    JOIN ${T("producto")} p ON p.id = i.producto_id
    JOIN ${T("sucursal")} s ON s.id = i.sucursal_id
    WHERE p.activo AND s.activa AND ${condSucursal(Prisma.sql`i.sucursal_id`, f.sucursalId)} AND ${condCategoria(f.categoriaId)}
    GROUP BY s.id, s.nombre
    ORDER BY s.nombre`;
  return filas.map((r) => ({ sucursalId: r.id, sucursal: r.nombre, agotado: r.agotado, bajoMinimo: r.bajo, normal: r.normal, sobrestock: r.sobre }));
}

/** Margen bruto por categoria (IR-05; herramienta margenPorCategoria). */
export async function margenPorCategoria(f: FiltrosKpi) {
  const { ini, fin } = limites(f);
  const filas = await prisma.$queryRaw<{ id: number; nombre: string; ventas: number; costo: number }[]>`
    SELECT c.id, c.nombre, SUM(dv.subtotal)::float8 AS ventas, SUM(dv.cantidad * dv.costo_unitario)::float8 AS costo
    FROM ${T("detalle_venta")} dv
    JOIN ${T("venta")} v ON v.id = dv.venta_id
    JOIN ${T("producto")} p ON p.id = dv.producto_id
    JOIN ${T("categoria")} c ON c.id = p.categoria_id
    WHERE v.estado = 'REGISTRADA' AND v.fecha >= ${ini} AND v.fecha < ${fin}
      AND ${condSucursal(Prisma.sql`v.sucursal_id`, f.sucursalId)} AND ${condCategoria(f.categoriaId)}
    GROUP BY c.id, c.nombre`;
  return filas
    .map((r) => ({ categoriaId: r.id, categoria: r.nombre, ventas: r.ventas, margen: r.ventas > 0 ? redondear(((r.ventas - r.costo) / r.ventas) * 100) : null }))
    .sort((a, b) => (a.margen ?? 0) - (b.margen ?? 0));
}

export type Alerta = {
  inventarioId: number; sucursalId: number; sucursal: string; productoId: number; sku: string; producto: string;
  categoria: string; proveedor: string; tiempoEntregaDias: number; stock: number; stockMinimo: number; stockMaximo: number;
  estado: "AGOTADO" | "BAJO_MINIMO"; enPedido: boolean;
};

/** RF-28: productos agotados y bajo minimo, con si ya tienen una orden abierta. */
export async function alertasInventario(f: Pick<FiltrosKpi, "sucursalId" | "categoriaId">): Promise<Alerta[]> {
  const filas = await prisma.$queryRaw<{
    inventario_id: number; sucursal_id: number; sucursal: string; producto_id: number; sku: string; producto: string;
    categoria: string; proveedor: string; tiempo: number; stock: number; minimo: number; maximo: number; en_pedido: boolean;
  }[]>`
    SELECT i.id AS inventario_id, s.id AS sucursal_id, s.nombre AS sucursal, p.id AS producto_id, p.sku, p.nombre AS producto,
           c.nombre AS categoria, pr.nombre AS proveedor, pr.tiempo_entrega_dias AS tiempo,
           i.stock, i.stock_minimo AS minimo, i.stock_maximo AS maximo,
           EXISTS (
             SELECT 1 FROM ${T("orden_compra")} oc
             JOIN ${T("detalle_orden_compra")} d ON d.orden_compra_id = oc.id
             WHERE oc.sucursal_id = i.sucursal_id AND d.producto_id = i.producto_id AND oc.estado IN ('BORRADOR', 'APROBADA')
           ) AS en_pedido
    FROM ${T("inventario")} i
    JOIN ${T("producto")} p ON p.id = i.producto_id
    JOIN ${T("categoria")} c ON c.id = p.categoria_id
    JOIN ${T("proveedor")} pr ON pr.id = p.proveedor_id
    JOIN ${T("sucursal")} s ON s.id = i.sucursal_id
    WHERE p.activo AND s.activa AND i.stock <= i.stock_minimo
      AND ${condSucursal(Prisma.sql`i.sucursal_id`, f.sucursalId)} AND ${condCategoria(f.categoriaId)}
    ORDER BY (i.stock = 0) DESC, i.stock::float8 / GREATEST(i.stock_minimo, 1), p.nombre, s.nombre`;
  return filas.map((r) => ({
    inventarioId: r.inventario_id, sucursalId: r.sucursal_id, sucursal: r.sucursal, productoId: r.producto_id, sku: r.sku,
    producto: r.producto, categoria: r.categoria, proveedor: r.proveedor, tiempoEntregaDias: r.tiempo, stock: r.stock,
    stockMinimo: r.minimo, stockMaximo: r.maximo, estado: r.stock === 0 ? "AGOTADO" : "BAJO_MINIMO", enPedido: r.en_pedido,
  }));
}

// ------------------------------------------------------------
// Los ocho KPI con su variacion e interpretacion
// ------------------------------------------------------------

export type ResultadoKpis = {
  filtros: FiltrosKpi;
  periodoAnterior: Periodo;
  kpis: Record<IdKpi, ValorKpi>;
  extras: { numVentas: number; agotados: number; inventarios: number; clientesIdentificados: number; valorInmovilizado: number };
  interpretacion: ReturnType<typeof interpretar>;
};

/** RF-24 y RF-27 (herramienta consultarKpis). */
export async function consultarKpis(f: FiltrosKpi): Promise<ResultadoKpis> {
  const ant: FiltrosKpi = { ...f, ...periodoAnterior(f) };
  const [ventas, ventasAnt, agot, bajaRot, cumpl, cumplAnt, clientes, clientesAnt, inv, invAnt, sucursales, porSucursal, categorias] =
    await Promise.all([
      resumenVentas(f), resumenVentas(ant), agotamiento(f), productosBajaRotacion(f),
      cumplimientoProveedores(f), cumplimientoProveedores(ant), clientesRecurrentes(f), clientesRecurrentes(ant),
      inventarioValorizado(f), inventarioValorizado(ant), ventasPorSucursal(f), inventarioPorSucursal(f),
      margenPorCategoria(f),
    ]);

  const totalCumpl = (lista: CumplimientoProveedor[]) =>
    pct(lista.reduce((a, p) => a + p.aTiempo, 0), lista.reduce((a, p) => a + p.debidas, 0));

  const valores: Record<IdKpi, number | null> = {
    "KPI-01": ventas.ventas, "KPI-02": ventas.ticket, "KPI-03": ventas.margen, "KPI-04": agot.pct,
    "KPI-05": bajaRot.length, "KPI-06": totalCumpl(cumpl), "KPI-07": clientes.recurrentes,
    "KPI-08": rotacion(ventas.costo, inv),
  };
  const anteriores: Record<IdKpi, number | null> = {
    "KPI-01": ventasAnt.ventas, "KPI-02": ventasAnt.ticket, "KPI-03": ventasAnt.margen, "KPI-04": null,
    "KPI-05": null, "KPI-06": totalCumpl(cumplAnt), "KPI-07": clientesAnt.recurrentes,
    "KPI-08": rotacion(ventasAnt.costo, invAnt),
  };
  const kpis = Object.fromEntries(IDS_KPI.map((id) => [id, valorKpi(id, valores[id], anteriores[id])])) as Record<IdKpi, ValorKpi>;

  const valorInmovilizado = bajaRot.reduce((a, p) => a + p.valorInmovilizado, 0);
  const masTardio = [...cumpl]
    .map((p) => ({ nombre: p.proveedor, tardias: p.tardias + p.pendientesVencidas, debidas: p.debidas }))
    .sort((a, b) => b.tardias - a.tardias)[0] ?? null;
  const menorMargen = categorias.find((c) => c.margen !== null);

  const interpretacion = interpretar({
    kpis,
    sucursales: sucursales.map((s) => ({ nombre: s.sucursal, ventas: s.ventas })),
    agotadosPorSucursal: porSucursal.map((s) => ({ nombre: s.sucursal, agotados: s.agotado })),
    proveedorMasTardio: masTardio,
    bajaRotacion: { productos: bajaRot.length, valorInmovilizado },
    categoriaMenorMargen: menorMargen ? { nombre: menorMargen.categoria, margen: menorMargen.margen! } : null,
    clientes: { recurrentes: clientes.recurrentes, identificados: clientes.identificados },
  });

  return {
    filtros: f,
    periodoAnterior: periodoAnterior(f),
    kpis,
    extras: {
      numVentas: ventas.numVentas, agotados: agot.agotados, inventarios: agot.total,
      clientesIdentificados: clientes.identificados, valorInmovilizado,
    },
    interpretacion,
  };
}

/** RF-25: los cuatro graficos con los mismos filtros. */
export async function graficos(f: FiltrosKpi) {
  const [diarias, sucursales, top, inventario] = await Promise.all([
    ventasDiarias(f), ventasPorSucursal(f), topProductos(f, "unidades", 10), inventarioPorSucursal(f),
  ]);
  return { filtros: f, periodoAnterior: periodoAnterior(f), ventasDiarias: diarias, ventasPorSucursal: sucursales, topProductos: top, inventarioPorSucursal: inventario };
}

// ------------------------------------------------------------
// Reportes CSV (RF-30)
// ------------------------------------------------------------

export const MAX_FILAS_REPORTE = 100_000;

export type LineaVentaReporte = {
  venta_id: number; fecha: Date; sucursal: string; cajero: string; cliente_documento: string | null; cliente: string | null;
  medio_pago: string; sku: string; producto: string; categoria: string; cantidad: number;
  precio_unitario: number; costo_unitario: number; subtotal: number;
};

/** Ventas detalladas por item (solo registradas, igual que KPI-01). */
export async function lineasVentas(f: FiltrosKpi): Promise<LineaVentaReporte[]> {
  const { ini, fin } = limites(f);
  const filas = await prisma.$queryRaw<LineaVentaReporte[]>`
    SELECT v.id AS venta_id, v.fecha, s.nombre AS sucursal, u.nombre AS cajero,
           cl.documento AS cliente_documento, cl.nombre AS cliente, v.medio_pago::text AS medio_pago,
           p.sku, p.nombre AS producto, c.nombre AS categoria, dv.cantidad,
           dv.precio_unitario::float8 AS precio_unitario, dv.costo_unitario::float8 AS costo_unitario,
           dv.subtotal::float8 AS subtotal
    FROM ${T("detalle_venta")} dv
    JOIN ${T("venta")} v ON v.id = dv.venta_id
    JOIN ${T("sucursal")} s ON s.id = v.sucursal_id
    JOIN ${T("usuario")} u ON u.id = v.cajero_id
    LEFT JOIN ${T("cliente")} cl ON cl.id = v.cliente_id
    JOIN ${T("producto")} p ON p.id = dv.producto_id
    JOIN ${T("categoria")} c ON c.id = p.categoria_id
    WHERE v.estado = 'REGISTRADA' AND v.fecha >= ${ini} AND v.fecha < ${fin}
      AND ${condSucursal(Prisma.sql`v.sucursal_id`, f.sucursalId)} AND ${condCategoria(f.categoriaId)}
    ORDER BY v.fecha, v.id, dv.id
    LIMIT ${MAX_FILAS_REPORTE + 1}`;
  if (filas.length > MAX_FILAS_REPORTE) {
    throw new ErrorApi(400, "REPORTE_DEMASIADO_GRANDE", "El reporte supera 100.000 líneas. Reduzca el periodo o aplique filtros.");
  }
  return filas;
}

// ------------------------------------------------------------
// Consultas adicionales para las herramientas de IA (docs/07-IAG seccion 3)
// ------------------------------------------------------------

export const VENTANA_DEMANDA_DIAS = 28;

export type ProductoEnRiesgo = Omit<Alerta, "estado"> & {
  estado: "AGOTADO" | "BAJO_MINIMO" | "NORMAL" | "SOBRESTOCK";
  ventaDiaria: number;
  coberturaDias: number | null;
  motivo: "AGOTADO" | "BAJO_MINIMO" | "COBERTURA_MENOR_AL_TIEMPO_DE_ENTREGA";
};

/**
 * Productos en riesgo de agotamiento: agotados, bajo minimo o con cobertura menor al
 * tiempo de entrega del proveedor. La demanda es la venta diaria promedio de los
 * ultimos 28 dias completos (la misma base que usara el Agente 1).
 */
export async function productosEnRiesgo(f: Pick<FiltrosKpi, "sucursalId" | "categoriaId">): Promise<ProductoEnRiesgo[]> {
  const hoy = hoyBogota();
  const ini = ts(inicioDiaBogota(sumarDias(hoy, -VENTANA_DEMANDA_DIAS)));
  const fin = ts(inicioDiaBogota(hoy));
  const filas = await prisma.$queryRaw<{
    inventario_id: number; sucursal_id: number; sucursal: string; producto_id: number; sku: string; producto: string;
    categoria: string; proveedor: string; tiempo: number; stock: number; minimo: number; maximo: number;
    diaria: number; cobertura: number | null; en_pedido: boolean;
  }[]>`
    WITH demanda AS (
      SELECT v.sucursal_id, dv.producto_id, SUM(dv.cantidad)::numeric / ${VENTANA_DEMANDA_DIAS} AS diaria
      FROM ${T("detalle_venta")} dv JOIN ${T("venta")} v ON v.id = dv.venta_id
      WHERE v.estado = 'REGISTRADA' AND v.fecha >= ${ini} AND v.fecha < ${fin}
      GROUP BY v.sucursal_id, dv.producto_id
    )
    SELECT i.id AS inventario_id, s.id AS sucursal_id, s.nombre AS sucursal, p.id AS producto_id, p.sku, p.nombre AS producto,
           c.nombre AS categoria, pr.nombre AS proveedor, pr.tiempo_entrega_dias AS tiempo,
           i.stock, i.stock_minimo AS minimo, i.stock_maximo AS maximo,
           COALESCE(d.diaria, 0)::float8 AS diaria,
           CASE WHEN COALESCE(d.diaria, 0) = 0 THEN NULL ELSE (i.stock / d.diaria)::float8 END AS cobertura,
           EXISTS (
             SELECT 1 FROM ${T("orden_compra")} oc
             JOIN ${T("detalle_orden_compra")} dd ON dd.orden_compra_id = oc.id
             WHERE oc.sucursal_id = i.sucursal_id AND dd.producto_id = i.producto_id AND oc.estado IN ('BORRADOR', 'APROBADA')
           ) AS en_pedido
    FROM ${T("inventario")} i
    JOIN ${T("producto")} p ON p.id = i.producto_id
    JOIN ${T("categoria")} c ON c.id = p.categoria_id
    JOIN ${T("proveedor")} pr ON pr.id = p.proveedor_id
    JOIN ${T("sucursal")} s ON s.id = i.sucursal_id
    LEFT JOIN demanda d ON d.sucursal_id = i.sucursal_id AND d.producto_id = i.producto_id
    WHERE p.activo AND s.activa
      AND (i.stock = 0 OR i.stock <= i.stock_minimo OR (COALESCE(d.diaria, 0) > 0 AND i.stock / d.diaria < pr.tiempo_entrega_dias))
      AND ${condSucursal(Prisma.sql`i.sucursal_id`, f.sucursalId)} AND ${condCategoria(f.categoriaId)}
    ORDER BY (i.stock = 0) DESC, cobertura ASC NULLS LAST, p.nombre, s.nombre`;
  return filas.map((r) => {
    const estado = r.stock === 0 ? "AGOTADO" : r.stock <= r.minimo ? "BAJO_MINIMO" : r.stock > r.maximo ? "SOBRESTOCK" : "NORMAL";
    return {
      inventarioId: r.inventario_id, sucursalId: r.sucursal_id, sucursal: r.sucursal, productoId: r.producto_id, sku: r.sku,
      producto: r.producto, categoria: r.categoria, proveedor: r.proveedor, tiempoEntregaDias: r.tiempo, stock: r.stock,
      stockMinimo: r.minimo, stockMaximo: r.maximo, enPedido: r.en_pedido, estado,
      ventaDiaria: redondear(r.diaria), coberturaDias: r.cobertura === null ? null : redondear(r.cobertura, 1),
      motivo: estado === "AGOTADO" ? "AGOTADO" : estado === "BAJO_MINIMO" ? "BAJO_MINIMO" : "COBERTURA_MENOR_AL_TIEMPO_DE_ENTREGA",
    };
  });
}

/** Ventas por semana (lunes a domingo) y categoria (herramienta tendenciaVentas). */
export async function tendenciaSemanal(f: FiltrosKpi) {
  const { ini, fin } = limites(f);
  return prisma.$queryRaw<{ semana: string; categoria: string; ventas: number; unidades: number }[]>`
    SELECT to_char(date_trunc('week', v.fecha AT TIME ZONE 'America/Bogota')::date, 'YYYY-MM-DD') AS semana,
           c.nombre AS categoria, SUM(dv.subtotal)::float8 AS ventas, SUM(dv.cantidad)::int AS unidades
    FROM ${T("detalle_venta")} dv
    JOIN ${T("venta")} v ON v.id = dv.venta_id
    JOIN ${T("producto")} p ON p.id = dv.producto_id
    JOIN ${T("categoria")} c ON c.id = p.categoria_id
    WHERE v.estado = 'REGISTRADA' AND v.fecha >= ${ini} AND v.fecha < ${fin}
      AND ${condSucursal(Prisma.sql`v.sucursal_id`, f.sucursalId)} AND ${condCategoria(f.categoriaId)}
    GROUP BY 1, 2
    ORDER BY 1, 2`;
}

/** Clientes con mas compras en el periodo (herramienta clientesRecurrentes). Sin datos de contacto. */
export async function clientesConMasCompras(f: FiltrosKpi, limite = 10) {
  const { ini, fin } = limites(f);
  return prisma.$queryRaw<{ cliente: string; compras: number; total: number }[]>`
    SELECT cl.nombre AS cliente, COUNT(*)::int AS compras, SUM(v.total)::float8 AS total
    FROM ${T("venta")} v JOIN ${T("cliente")} cl ON cl.id = v.cliente_id
    WHERE v.estado = 'REGISTRADA' AND v.fecha >= ${ini} AND v.fecha < ${fin}
      AND ${condSucursal(Prisma.sql`v.sucursal_id`, f.sucursalId)}
    GROUP BY cl.id, cl.nombre
    ORDER BY compras DESC, total DESC, cl.nombre
    LIMIT ${Math.min(Math.max(limite, 1), 20)}`;
}

/**
 * Datos para el calculo de reposicion del Agente 1 (docs/07-IAG 5.2): por producto activo
 * en cada sucursal activa, existencias, umbrales, venta diaria de los ultimos 28 dias
 * completos y unidades en transito (ordenes BORRADOR o APROBADA). La formula se aplica
 * en src/lib/agentes.ts.
 */
export async function datosReposicion(sucursalId: number | null): Promise<FilaReposicion[]> {
  const hoy = hoyBogota();
  const ini = ts(inicioDiaBogota(sumarDias(hoy, -VENTANA_DEMANDA_DIAS)));
  const fin = ts(inicioDiaBogota(hoy));
  const filas = await prisma.$queryRaw<{
    producto_id: number; sku: string; producto: string; categoria: string; sucursal_id: number; sucursal: string;
    proveedor_id: number; proveedor: string; tiempo: number; costo: number; stock: number; minimo: number; maximo: number;
    diaria: number; transito: number;
  }[]>`
    WITH demanda AS (
      SELECT v.sucursal_id, dv.producto_id, SUM(dv.cantidad)::numeric / ${VENTANA_DEMANDA_DIAS} AS diaria
      FROM ${T("detalle_venta")} dv JOIN ${T("venta")} v ON v.id = dv.venta_id
      WHERE v.estado = 'REGISTRADA' AND v.fecha >= ${ini} AND v.fecha < ${fin}
      GROUP BY v.sucursal_id, dv.producto_id
    ), transito AS (
      SELECT oc.sucursal_id, dd.producto_id, SUM(dd.cantidad)::int AS unidades
      FROM ${T("orden_compra")} oc JOIN ${T("detalle_orden_compra")} dd ON dd.orden_compra_id = oc.id
      WHERE oc.estado IN ('BORRADOR', 'APROBADA')
      GROUP BY oc.sucursal_id, dd.producto_id
    )
    SELECT p.id AS producto_id, p.sku, p.nombre AS producto, c.nombre AS categoria, s.id AS sucursal_id, s.nombre AS sucursal,
           pr.id AS proveedor_id, pr.nombre AS proveedor, pr.tiempo_entrega_dias AS tiempo, p.costo::float8 AS costo,
           i.stock, i.stock_minimo AS minimo, i.stock_maximo AS maximo,
           COALESCE(d.diaria, 0)::float8 AS diaria, COALESCE(t.unidades, 0)::int AS transito
    FROM ${T("inventario")} i
    JOIN ${T("producto")} p ON p.id = i.producto_id
    JOIN ${T("categoria")} c ON c.id = p.categoria_id
    JOIN ${T("proveedor")} pr ON pr.id = p.proveedor_id
    JOIN ${T("sucursal")} s ON s.id = i.sucursal_id
    LEFT JOIN demanda d ON d.sucursal_id = i.sucursal_id AND d.producto_id = i.producto_id
    LEFT JOIN transito t ON t.sucursal_id = i.sucursal_id AND t.producto_id = i.producto_id
    WHERE p.activo AND s.activa AND pr.activo AND ${condSucursal(Prisma.sql`i.sucursal_id`, sucursalId)}
    ORDER BY p.nombre, s.nombre`;
  return filas.map((r) => ({
    productoId: r.producto_id, sku: r.sku, producto: r.producto, categoria: r.categoria, sucursalId: r.sucursal_id,
    sucursal: r.sucursal, proveedorId: r.proveedor_id, proveedor: r.proveedor, tiempoEntregaDias: r.tiempo, costo: r.costo,
    stock: r.stock, stockMinimo: r.minimo, stockMaximo: r.maximo, ventaDiaria: r.diaria, enTransito: r.transito,
  }));
}
