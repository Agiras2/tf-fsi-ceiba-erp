// ============================================================
// CeibaERP - Servicio de ventas (docs/04-REQ RF-16 a RF-18, RN-01 a RN-06, RN-10)
// La venta, el descuento de stock, el kardex y la auditoria se escriben en
// una sola transaccion (RN-04). Precios, costos y totales los calcula el
// servidor a partir del producto (RN-02, RN-03).
// ============================================================
import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/server/db";
import { ErrorApi, errores } from "@/server/errores";
import { sucursalPermitida } from "@/server/auth/autorizacion";
import { accionesVentas } from "@/lib/permisos";
import { esquemaListado } from "@/lib/esquemas/comunes";
import { calcularTotales, esquemaAnulacion, esquemaFiltrosVentas, esquemaVenta } from "@/lib/esquemas/ventas";
import { rangoBogota } from "@/lib/fechas";
import { aNumero, auditar, filtroId, pagina, paginar, type Contexto } from "./comun";

/** Tiempo maximo de las transacciones de caja (la BD esta en otra region durante el desarrollo local). */
const OPCIONES_TX = { timeout: 15_000, maxWait: 5_000 } as const;

const seleccionFila = {
  id: true, fecha: true, estado: true, medioPago: true, total: true,
  sucursal: { select: { id: true, codigo: true, nombre: true } },
  cajero: { select: { id: true, nombre: true } },
  cliente: { select: { id: true, documento: true, nombre: true } },
  _count: { select: { detalles: true } },
} as const satisfies Prisma.VentaSelect;

type FilaVenta = Prisma.VentaGetPayload<{ select: typeof seleccionFila }>;

function salidaFila({ _count, ...v }: FilaVenta) {
  return { ...v, total: aNumero(v.total), items: _count.detalles };
}

const incluirDetalle = {
  sucursal: { select: { id: true, codigo: true, nombre: true } },
  cajero: { select: { id: true, nombre: true } },
  cliente: { select: { id: true, documento: true, nombre: true } },
  anuladaPor: { select: { id: true, nombre: true } },
  detalles: {
    orderBy: { id: "asc" },
    include: { producto: { select: { id: true, sku: true, nombre: true, unidad: true } } },
  },
} as const satisfies Prisma.VentaInclude;

type VentaDetalle = Prisma.VentaGetPayload<{ include: typeof incluirDetalle }>;

/** Detalle de la venta. El costo y la utilidad solo se envian a quien puede verlos. */
function salidaDetalle(v: VentaDetalle, ctx: Contexto) {
  const verCostos = accionesVentas(ctx.sesion.rol).verCostos;
  const total = aNumero(v.total) ?? 0;
  const costoTotal = aNumero(v.costoTotal) ?? 0;
  const base: Omit<VentaDetalle, "costoTotal"> & { costoTotal?: unknown } = { ...v };
  delete base.costoTotal;
  return {
    ...base,
    total,
    ...(verCostos ? { costoTotal, utilidad: Math.round((total - costoTotal) * 100) / 100 } : {}),
    detalles: v.detalles.map(({ costoUnitario, ...d }) => ({
      ...d,
      precioUnitario: aNumero(d.precioUnitario),
      subtotal: aNumero(d.subtotal),
      ...(verCostos ? { costoUnitario: aNumero(costoUnitario) } : {}),
    })),
  };
}

/** Busqueda por numero de venta o por nombre o documento del cliente. */
function busquedaVenta(q: string): Prisma.VentaWhereInput {
  if (!q) return {};
  const o: Prisma.VentaWhereInput[] = [
    { cliente: { nombre: { contains: q, mode: "insensitive" } } },
    { cliente: { documento: { contains: q } } },
  ];
  const n = Number(q.replace(/^#/, ""));
  if (Number.isInteger(n) && n > 0 && n < 2 ** 31) o.push({ id: n });
  return { OR: o };
}

export const servicioVentas = {
  /** RF-17: ventas con filtros y un resumen del periodo (sin contar las anuladas, RN-10). */
  async listar(params: URLSearchParams, ctx: Contexto) {
    const p = esquemaListado.parse(Object.fromEntries(params));
    const f = esquemaFiltrosVentas.parse({
      desde: params.get("desde") || undefined,
      hasta: params.get("hasta") || undefined,
      estado: params.get("estado") || undefined,
      medioPago: params.get("medioPago") || undefined,
    });
    const sucursalId = sucursalPermitida(ctx.sesion, filtroId(params, "sucursalId"));
    const base: Prisma.VentaWhereInput = {
      sucursalId: sucursalId ?? undefined,
      clienteId: filtroId(params, "clienteId"),
      fecha: rangoBogota(f.desde, f.hasta),
      medioPago: f.medioPago === "todos" ? undefined : f.medioPago,
      ...busquedaVenta(p.q),
    };
    const where: Prisma.VentaWhereInput = { ...base, estado: f.estado === "todos" ? undefined : f.estado };

    const [filas, total, registradas, anuladas] = await Promise.all([
      prisma.venta.findMany({ where, select: seleccionFila, ...paginar(p), orderBy: [{ fecha: "desc" }, { id: "desc" }] }),
      prisma.venta.count({ where }),
      prisma.venta.aggregate({ where: { ...base, estado: "REGISTRADA" }, _count: { _all: true }, _sum: { total: true } }),
      prisma.venta.count({ where: { ...base, estado: "ANULADA" } }),
    ]);
    const ventas = registradas._count._all;
    const totalVendido = aNumero(registradas._sum.total) ?? 0;
    return {
      ...pagina(filas.map(salidaFila), total, p),
      resumen: {
        ventas,
        totalVendido,
        ticketPromedio: ventas ? Math.round(totalVendido / ventas) : 0,
        anuladas,
      },
    };
  },

  /** Detalle de una venta. Fuera del alcance del usuario responde 404 (RN-05). */
  async obtener(id: number, ctx: Contexto) {
    const v = await prisma.venta.findUnique({ where: { id }, include: incluirDetalle });
    const alcance = sucursalPermitida(ctx.sesion, null);
    if (!v || (alcance !== null && v.sucursalId !== alcance)) throw errores.noEncontrado("La venta");
    return salidaDetalle(v, ctx);
  },

  /** RF-16: registrar una venta en la sucursal de la sesion (RN-01 a RN-06). */
  async registrar(entrada: unknown, ctx: Contexto) {
    const datos = esquemaVenta.parse(entrada);
    const sucursalId = ctx.sesion.sucursalId;
    if (sucursalId === null) throw errores.sinPermiso();

    // RN-02 y RN-06: los productos deben existir y estar activos; precio y costo salen de la BD.
    const ids = datos.items.map((it) => it.productoId);
    const [productos, cliente] = await Promise.all([
      prisma.producto.findMany({
        where: { id: { in: ids } },
        select: { id: true, sku: true, nombre: true, precio: true, costo: true, activo: true },
      }),
      datos.clienteId ? prisma.cliente.findUnique({ where: { id: datos.clienteId }, select: { activo: true } }) : null,
    ]);
    const porId = new Map(productos.map((p) => [p.id, p]));

    const noExisten = datos.items
      .map((it, i) => ({ it, i }))
      .filter(({ it }) => !porId.has(it.productoId))
      .map(({ i }) => ({ campo: `items.${i}.productoId`, mensaje: "El producto no existe." }));
    if (datos.clienteId && !cliente) noExisten.push({ campo: "clienteId", mensaje: "El cliente no existe." });
    if (datos.clienteId && cliente && !cliente.activo) noExisten.push({ campo: "clienteId", mensaje: "El cliente está inactivo." });
    if (noExisten.length) throw new ErrorApi(400, "DATOS_INVALIDOS", "Los datos enviados no son válidos.", noExisten);

    const inactivos = datos.items
      .map((it, i) => ({ p: porId.get(it.productoId)!, i }))
      .filter(({ p }) => !p.activo);
    if (inactivos.length) {
      throw new ErrorApi(409, "PRODUCTO_INACTIVO",
        `No se pueden vender productos inactivos: ${inactivos.map(({ p }) => p.nombre).join(", ")}.`,
        inactivos.map(({ i }) => ({ campo: `items.${i}.productoId`, mensaje: "Producto inactivo." })));
    }

    // RN-03: el servidor calcula subtotales y total.
    const lineas = datos.items.map((it) => {
      const p = porId.get(it.productoId)!;
      return { ...it, p, precio: p.precio.toNumber(), costo: p.costo.toNumber() };
    });
    const venta = calcularTotales(lineas.map((l) => ({ cantidad: l.cantidad, precio: l.precio })));
    const costo = calcularTotales(lineas.map((l) => ({ cantidad: l.cantidad, precio: l.costo })));

    const ventaId = await prisma.$transaction(async (tx) => {
      // RN-01: descuento condicional (stock >= cantidad). Se bloquea en orden de producto
      // para que dos ventas simultaneas no se bloqueen mutuamente.
      const orden = lineas.map((l, i) => ({ ...l, i })).sort((a, b) => a.productoId - b.productoId);
      const faltantes: typeof orden = [];
      for (const l of orden) {
        const r = await tx.inventario.updateMany({
          where: { productoId: l.productoId, sucursalId, stock: { gte: l.cantidad } },
          data: { stock: { decrement: l.cantidad } },
        });
        if (r.count === 0) faltantes.push(l);
      }
      if (faltantes.length) {
        // Al lanzar el error la transaccion se revierte: ningun stock queda descontado.
        const actuales = await tx.inventario.findMany({
          where: { sucursalId, productoId: { in: faltantes.map((f) => f.productoId) } },
          select: { productoId: true, stock: true },
        });
        const disponible = new Map(actuales.map((a) => [a.productoId, a.stock]));
        throw new ErrorApi(409, "STOCK_INSUFICIENTE",
          `No hay existencias suficientes de: ${faltantes.map((f) => `${f.p.nombre} (disponible: ${disponible.get(f.productoId) ?? 0})`).join(", ")}.`,
          faltantes.map((f) => ({ campo: `items.${f.i}.cantidad`, mensaje: `Disponible: ${disponible.get(f.productoId) ?? 0}.` })));
      }

      const stocks = await tx.inventario.findMany({
        where: { sucursalId, productoId: { in: ids } },
        select: { productoId: true, stock: true },
      });
      const stockResultante = new Map(stocks.map((s) => [s.productoId, s.stock]));

      const v = await tx.venta.create({
        data: {
          sucursalId,
          cajeroId: ctx.sesion.usuarioId,
          clienteId: datos.clienteId ?? null,
          medioPago: datos.medioPago,
          total: venta.total,
          costoTotal: costo.total,
          detalles: {
            create: lineas.map((l, i) => ({
              productoId: l.productoId,
              cantidad: l.cantidad,
              precioUnitario: l.precio,
              costoUnitario: l.costo,
              subtotal: venta.subtotales[i],
            })),
          },
        },
        select: { id: true, fecha: true, sucursal: { select: { codigo: true } } },
      });

      await tx.movimientoInventario.createMany({
        data: lineas.map((l) => ({
          productoId: l.productoId, sucursalId, tipo: "VENTA" as const, cantidad: -l.cantidad,
          stockResultante: stockResultante.get(l.productoId)!, referenciaTipo: "VENTA", referenciaId: v.id,
          usuarioId: ctx.sesion.usuarioId, fecha: v.fecha,
        })),
      });

      await auditar(ctx, "VENTA_REGISTRADA", "venta", v.id, {
        sucursal: v.sucursal.codigo, medioPago: datos.medioPago, clienteId: datos.clienteId ?? null,
        items: lineas.map((l) => ({ sku: l.p.sku, cantidad: l.cantidad, precioUnitario: l.precio })),
        total: venta.total,
      }, tx);
      return v.id;
    }, OPCIONES_TX);

    return this.obtener(ventaId, ctx);
  },

  /** RF-18 y RN-10: el gerente anula una venta registrada; el stock se restituye en el kardex. */
  async anular(id: number, entrada: unknown, ctx: Contexto) {
    const { motivo } = esquemaAnulacion.parse(entrada);

    await prisma.$transaction(async (tx) => {
      // Cambio de estado condicional: si dos gerentes anulan a la vez, solo uno lo logra.
      const r = await tx.venta.updateMany({
        where: { id, estado: "REGISTRADA" },
        data: { estado: "ANULADA", anuladaPorId: ctx.sesion.usuarioId, fechaAnulacion: new Date(), motivoAnulacion: motivo },
      });
      if (r.count === 0) {
        const existe = await tx.venta.findUnique({ where: { id }, select: { id: true } });
        if (!existe) throw errores.noEncontrado("La venta");
        throw new ErrorApi(409, "VENTA_YA_ANULADA", `La venta #${id} ya está anulada.`);
      }

      const v = await tx.venta.findUniqueOrThrow({
        where: { id },
        select: {
          sucursalId: true, total: true, fechaAnulacion: true, sucursal: { select: { codigo: true } },
          detalles: { select: { productoId: true, cantidad: true, producto: { select: { sku: true } } } },
        },
      });
      const detalles = [...v.detalles].sort((a, b) => a.productoId - b.productoId);
      const movimientos: Prisma.MovimientoInventarioCreateManyInput[] = [];
      for (const d of detalles) {
        const inv = await tx.inventario.update({
          where: { productoId_sucursalId: { productoId: d.productoId, sucursalId: v.sucursalId } },
          data: { stock: { increment: d.cantidad } },
          select: { stock: true },
        });
        movimientos.push({
          productoId: d.productoId, sucursalId: v.sucursalId, tipo: "ANULACION_VENTA", cantidad: d.cantidad,
          stockResultante: inv.stock, referenciaTipo: "VENTA", referenciaId: id, motivo,
          usuarioId: ctx.sesion.usuarioId, fecha: v.fechaAnulacion!,
        });
      }
      await tx.movimientoInventario.createMany({ data: movimientos });
      await auditar(ctx, "VENTA_ANULADA", "venta", id, {
        sucursal: v.sucursal.codigo, motivo, total: aNumero(v.total),
        restituido: detalles.map((d) => ({ sku: d.producto.sku, cantidad: d.cantidad })),
      }, tx);
    }, OPCIONES_TX);

    return this.obtener(id, ctx);
  },
};
