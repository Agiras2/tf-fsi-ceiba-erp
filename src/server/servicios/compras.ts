// ============================================================
// CeibaERP - Servicio de ordenes de compra
// (docs/04-REQ RF-19 a RF-23, RN-05 a RN-09; docs/03-NEG seccion 8.1)
// Cada cambio de estado es una actualizacion condicional sobre el estado
// leido: si dos usuarios actuan a la vez sobre la misma orden, solo uno gana.
// ============================================================
import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/server/db";
import { ErrorApi, errores } from "@/server/errores";
import { sucursalPermitida } from "@/server/auth/autorizacion";
import { esquemaListado } from "@/lib/esquemas/comunes";
import {
  entregaATiempo, esquemaCancelacionOrden, esquemaOrdenCompra, esquemaOrdenCompraEdicion, esquemaSinDatos,
  ESTADOS_ORDEN, ORIGENES_ORDEN, transicionValida,
  type DatosOrdenCompra, type EstadoOrden, type OrigenOrden,
} from "@/lib/esquemas/compras";
import { calcularTotales } from "@/lib/esquemas/ventas";
import { aFechaDb, deFechaDb, hoyBogota } from "@/lib/fechas";
import { aNumero, auditar, errorCampo, filtroId, pagina, paginar, type Contexto } from "./comun";

const OPCIONES_TX = { timeout: 15_000, maxWait: 5_000 } as const;
type Cliente = Prisma.TransactionClient | typeof prisma;

const seleccionFila = {
  id: true, estado: true, origen: true, total: true, fechaEsperada: true, fechaRecepcion: true,
  createdAt: true, ejecucionAgenteId: true,
  proveedor: { select: { id: true, nombre: true } },
  sucursal: { select: { id: true, codigo: true, nombre: true } },
  creadaPor: { select: { id: true, nombre: true } },
  _count: { select: { detalles: true } },
} as const satisfies Prisma.OrdenCompraSelect;

type FilaOrden = Prisma.OrdenCompraGetPayload<{ select: typeof seleccionFila }>;

/** Campos calculados comunes: fechas como texto, vencida (RN-08) y entrega a tiempo. */
function fechas(o: { estado: EstadoOrden; fechaEsperada: Date; fechaRecepcion: Date | null }) {
  const esperada = deFechaDb(o.fechaEsperada);
  const recepcion = o.fechaRecepcion ? deFechaDb(o.fechaRecepcion) : null;
  return {
    fechaEsperada: esperada,
    fechaRecepcion: recepcion,
    vencida: o.estado === "APROBADA" && esperada < hoyBogota(),
    aTiempo: recepcion ? entregaATiempo(esperada, recepcion) : null,
  };
}

function salidaFila({ _count, ...o }: FilaOrden) {
  return { ...o, ...fechas(o), total: aNumero(o.total), items: _count.detalles };
}

const incluirDetalle = {
  proveedor: { select: { id: true, nombre: true, nit: true, tiempoEntregaDias: true } },
  sucursal: { select: { id: true, codigo: true, nombre: true } },
  creadaPor: { select: { id: true, nombre: true } },
  aprobadaPor: { select: { id: true, nombre: true } },
  recibidaPor: { select: { id: true, nombre: true } },
  ejecucionAgente: { select: { id: true, agente: true, fechaInicio: true } },
  detalles: {
    orderBy: { id: "asc" },
    include: { producto: { select: { id: true, sku: true, nombre: true, unidad: true, activo: true } } },
  },
} as const satisfies Prisma.OrdenCompraInclude;

type OrdenDetalle = Prisma.OrdenCompraGetPayload<{ include: typeof incluirDetalle }>;

function salidaDetalle(o: OrdenDetalle) {
  return {
    ...o,
    ...fechas(o),
    total: aNumero(o.total),
    detalles: o.detalles.map((d) => ({ ...d, costoUnitario: aNumero(d.costoUnitario), subtotal: aNumero(d.subtotal) })),
  };
}

/** Busqueda por numero de orden o por nombre del proveedor. */
function busquedaOrden(q: string): Prisma.OrdenCompraWhereInput {
  if (!q) return {};
  const o: Prisma.OrdenCompraWhereInput[] = [{ proveedor: { nombre: { contains: q, mode: "insensitive" } } }];
  const n = Number(q.replace(/^#/, ""));
  if (Number.isInteger(n) && n > 0 && n < 2 ** 31) o.push({ id: n });
  return { OR: o };
}

function leerEnum<T extends string>(valor: string | null, opciones: readonly T[], nombre: string): T | undefined {
  if (valor === null || valor === "" || valor === "todos") return undefined;
  if (!opciones.includes(valor as T)) throw new ErrorApi(400, "DATOS_INVALIDOS", `El filtro ${nombre} no es válido.`);
  return valor as T;
}

/** La fecha esperada no puede ser anterior a hoy (hora de Bogota). */
function validarFechaEsperada(fecha: string) {
  if (fecha < hoyBogota()) throw errorCampo("fechaEsperada", "La fecha esperada no puede ser anterior a hoy.");
}

/**
 * RF-19 y RN-06: los productos deben existir, estar activos y pertenecer al proveedor.
 * El costo unitario se toma del producto; el servidor calcula subtotales y total.
 */
async function prepararItems(cliente: Cliente, proveedorId: number, items: DatosOrdenCompra["items"], campo = "items") {
  const productos = await cliente.producto.findMany({
    where: { id: { in: items.map((it) => it.productoId) } },
    select: { id: true, sku: true, nombre: true, costo: true, activo: true, proveedorId: true },
  });
  const porId = new Map(productos.map((p) => [p.id, p]));
  const invalidos: { campo: string; mensaje: string }[] = [];
  const inactivos: { campo: string; mensaje: string }[] = [];
  items.forEach((it, i) => {
    const p = porId.get(it.productoId);
    if (!p) invalidos.push({ campo: `${campo}.${i}.productoId`, mensaje: "El producto no existe." });
    else if (p.proveedorId !== proveedorId) invalidos.push({ campo: `${campo}.${i}.productoId`, mensaje: `${p.nombre} no es de este proveedor.` });
    else if (!p.activo) inactivos.push({ campo: `${campo}.${i}.productoId`, mensaje: `${p.nombre} está inactivo.` });
  });
  if (invalidos.length) throw new ErrorApi(400, "DATOS_INVALIDOS", "Los datos enviados no son válidos.", invalidos);
  if (inactivos.length) throw new ErrorApi(409, "PRODUCTO_INACTIVO", "La orden incluye productos inactivos.", inactivos);

  const lineas = items.map((it) => ({ ...it, p: porId.get(it.productoId)!, costo: porId.get(it.productoId)!.costo.toNumber() }));
  const totales = calcularTotales(lineas.map((l) => ({ cantidad: l.cantidad, precio: l.costo })));
  return {
    total: totales.total,
    unidades: lineas.reduce((a, l) => a + l.cantidad, 0),
    detalles: lineas.map((l, i) => ({
      productoId: l.productoId, cantidad: l.cantidad, costoUnitario: l.costo, subtotal: totales.subtotales[i],
    })),
  };
}

async function obtenerEnAlcance(id: number, ctx: Contexto, cliente: Cliente = prisma) {
  const o = await cliente.ordenCompra.findUnique({ where: { id }, include: incluirDetalle });
  const alcance = sucursalPermitida(ctx.sesion, null);
  if (!o || (alcance !== null && o.sucursalId !== alcance)) throw errores.noEncontrado("La orden de compra");
  return o;
}

const VERBO: Partial<Record<EstadoOrden, string>> = { APROBADA: "aprobar", CANCELADA: "cancelar", RECIBIDA: "recibir" };
const EN_ESTADO: Record<EstadoOrden, string> = { BORRADOR: "en borrador", APROBADA: "aprobada", RECIBIDA: "recibida", CANCELADA: "cancelada" };

/** RN-07: verifica la transicion antes de intentarla, con un mensaje comprensible. */
function exigirTransicion(o: { id: number; estado: EstadoOrden }, hacia: EstadoOrden) {
  if (!transicionValida(o.estado, hacia)) {
    throw new ErrorApi(409, "TRANSICION_INVALIDA",
      `La orden #${o.id} está ${EN_ESTADO[o.estado]}; no se puede ${VERBO[hacia] ?? "cambiar"}.`);
  }
}

/** Cambio de estado atomico: solo se aplica si la orden sigue en el estado leido. */
async function cambiarEstado(tx: Prisma.TransactionClient, o: { id: number; estado: EstadoOrden }, data: Prisma.OrdenCompraUncheckedUpdateManyInput) {
  const r = await tx.ordenCompra.updateMany({ where: { id: o.id, estado: o.estado }, data });
  if (r.count === 0) {
    throw new ErrorApi(409, "CONFLICTO", "La orden cambió de estado mientras se procesaba. Recargue e intente de nuevo.");
  }
}

/**
 * Crea una orden en BORRADOR. La usan la pantalla de compras (bodega) y, en la
 * Fase 7, el Agente 1, que solo puede crear borradores (RN-09).
 */
export async function crearOrdenBorrador(
  datos: DatosOrdenCompra,
  opciones: { sucursalId: number; origen?: OrigenOrden; ejecucionAgenteId?: number | null },
  ctx: Contexto,
) {
  validarFechaEsperada(datos.fechaEsperada);
  const [proveedor, sucursal] = await Promise.all([
    prisma.proveedor.findUnique({ where: { id: datos.proveedorId }, select: { nombre: true, activo: true } }),
    prisma.sucursal.findUnique({ where: { id: opciones.sucursalId }, select: { codigo: true, activa: true } }),
  ]);
  if (!proveedor) throw errorCampo("proveedorId", "El proveedor no existe.");
  if (!proveedor.activo) throw errorCampo("proveedorId", "El proveedor está inactivo.");
  if (!sucursal || !sucursal.activa) throw new ErrorApi(409, "SUCURSAL_INACTIVA", "La sucursal no está activa.");
  const items = await prepararItems(prisma, datos.proveedorId, datos.items);
  const origen = opciones.origen ?? "MANUAL";

  return prisma.$transaction(async (tx) => {
    const o = await tx.ordenCompra.create({
      data: {
        proveedorId: datos.proveedorId,
        sucursalId: opciones.sucursalId,
        estado: "BORRADOR",
        origen,
        ejecucionAgenteId: opciones.ejecucionAgenteId ?? null,
        creadaPorId: ctx.sesion.usuarioId,
        fechaEsperada: aFechaDb(datos.fechaEsperada),
        observaciones: datos.observaciones ?? null,
        total: items.total,
        detalles: { create: items.detalles },
      },
      select: { id: true },
    });
    await auditar(ctx, "OC_CREADA", "orden_compra", o.id, {
      proveedor: proveedor.nombre, sucursal: sucursal.codigo, origen, items: items.detalles.length,
      unidades: items.unidades, total: items.total, fechaEsperada: datos.fechaEsperada,
      ...(opciones.ejecucionAgenteId ? { ejecucionAgenteId: opciones.ejecucionAgenteId } : {}),
    }, tx);
    return o.id;
  }, OPCIONES_TX);
}

export const servicioCompras = {
  /** RF-23: ordenes con filtros y conteo por estado. */
  async listar(params: URLSearchParams, ctx: Contexto) {
    const p = esquemaListado.parse(Object.fromEntries(params));
    const estado = leerEnum(params.get("estado"), ESTADOS_ORDEN, "estado");
    const origen = leerEnum(params.get("origen"), ORIGENES_ORDEN, "origen");
    const sucursalId = sucursalPermitida(ctx.sesion, filtroId(params, "sucursalId"));
    const base: Prisma.OrdenCompraWhereInput = {
      sucursalId: sucursalId ?? undefined,
      proveedorId: filtroId(params, "proveedorId"),
      origen,
      ...busquedaOrden(p.q),
    };
    const where: Prisma.OrdenCompraWhereInput = { ...base, estado };

    const [filas, total, porEstado, vencidas] = await Promise.all([
      prisma.ordenCompra.findMany({ where, select: seleccionFila, ...paginar(p), orderBy: [{ createdAt: "desc" }, { id: "desc" }] }),
      prisma.ordenCompra.count({ where }),
      prisma.ordenCompra.groupBy({ by: ["estado"], where: base, _count: { _all: true } }),
      prisma.ordenCompra.count({ where: { ...base, estado: "APROBADA", fechaEsperada: { lt: aFechaDb(hoyBogota()) } } }),
    ]);
    const resumen = Object.fromEntries(ESTADOS_ORDEN.map((e) => [e, porEstado.find((g) => g.estado === e)?._count._all ?? 0])) as Record<EstadoOrden, number>;
    return { ...pagina(filas.map(salidaFila), total, p), resumen: { ...resumen, vencidas } };
  },

  async obtener(id: number, ctx: Contexto) {
    return salidaDetalle(await obtenerEnAlcance(id, ctx));
  },

  /** RF-19: bodega crea un borrador para su sucursal (RN-05). */
  async crear(entrada: unknown, ctx: Contexto) {
    const datos = esquemaOrdenCompra.parse(entrada);
    if (ctx.sesion.sucursalId === null) throw errores.sinPermiso();
    const id = await crearOrdenBorrador(datos, { sucursalId: ctx.sesion.sucursalId }, ctx);
    return this.obtener(id, ctx);
  },

  /** RF-20: editar un borrador (fecha esperada, observaciones y productos). */
  async actualizar(id: number, entrada: unknown, ctx: Contexto) {
    const datos = esquemaOrdenCompraEdicion.parse(entrada);
    const antes = await obtenerEnAlcance(id, ctx);
    if (antes.estado !== "BORRADOR") {
      throw new ErrorApi(409, "ESTADO_INVALIDO", `Solo se editan órdenes en borrador; la orden #${id} está ${EN_ESTADO[antes.estado]}.`);
    }
    if (datos.fechaEsperada !== undefined) validarFechaEsperada(datos.fechaEsperada);
    const items = datos.items ? await prepararItems(prisma, antes.proveedorId, datos.items) : null;

    await prisma.$transaction(async (tx) => {
      // La actualizacion condicional bloquea la orden y confirma que sigue en borrador.
      await cambiarEstado(tx, antes, {
        ...(datos.fechaEsperada !== undefined ? { fechaEsperada: aFechaDb(datos.fechaEsperada) } : {}),
        ...(datos.observaciones !== undefined ? { observaciones: datos.observaciones } : {}),
        ...(items ? { total: items.total } : {}),
      });
      if (items) {
        await tx.detalleOrdenCompra.deleteMany({ where: { ordenCompraId: id } });
        await tx.detalleOrdenCompra.createMany({ data: items.detalles.map((d) => ({ ...d, ordenCompraId: id })) });
      }
      await auditar(ctx, "OC_EDITADA", "orden_compra", id, {
        ...(datos.fechaEsperada !== undefined ? { fechaEsperada: { antes: deFechaDb(antes.fechaEsperada), despues: datos.fechaEsperada } } : {}),
        ...(datos.observaciones !== undefined ? { observaciones: { antes: antes.observaciones, despues: datos.observaciones } } : {}),
        ...(items
          ? {
              items: { antes: antes.detalles.length, despues: items.detalles.length },
              total: { antes: aNumero(antes.total), despues: items.total },
            }
          : {}),
      }, tx);
    }, OPCIONES_TX);
    return this.obtener(id, ctx);
  },

  /** RF-21: el gerente aprueba un borrador (RN-07). No se aprueban productos inactivos (RN-06). */
  async aprobar(id: number, entrada: unknown, ctx: Contexto) {
    esquemaSinDatos.parse(entrada ?? {});
    const o = await obtenerEnAlcance(id, ctx);
    exigirTransicion(o, "APROBADA");
    const inactivos = o.detalles.filter((d) => !d.producto.activo);
    if (inactivos.length) {
      throw new ErrorApi(409, "PRODUCTO_INACTIVO",
        `No se puede aprobar: hay productos inactivos (${inactivos.map((d) => d.producto.nombre).join(", ")}). Edite el borrador.`);
    }
    await prisma.$transaction(async (tx) => {
      await cambiarEstado(tx, o, { estado: "APROBADA", aprobadaPorId: ctx.sesion.usuarioId, fechaAprobacion: new Date() });
      await auditar(ctx, "OC_APROBADA", "orden_compra", id, {
        estadoAnterior: o.estado, origen: o.origen, proveedor: o.proveedor.nombre, sucursal: o.sucursal.codigo, total: aNumero(o.total),
      }, tx);
    }, OPCIONES_TX);
    return this.obtener(id, ctx);
  },

  /** RF-21: el gerente cancela un borrador o una orden aprobada, con motivo (RN-07). */
  async cancelar(id: number, entrada: unknown, ctx: Contexto) {
    const { motivo } = esquemaCancelacionOrden.parse(entrada);
    const o = await obtenerEnAlcance(id, ctx);
    exigirTransicion(o, "CANCELADA");
    await prisma.$transaction(async (tx) => {
      await cambiarEstado(tx, o, { estado: "CANCELADA", motivoCancelacion: motivo });
      await auditar(ctx, "OC_CANCELADA", "orden_compra", id, {
        estadoAnterior: o.estado, origen: o.origen, proveedor: o.proveedor.nombre, sucursal: o.sucursal.codigo, motivo,
      }, tx);
    }, OPCIONES_TX);
    return this.obtener(id, ctx);
  },

  /**
   * RF-22 y RN-08: bodega recibe una orden aprobada de su sucursal. Suma el stock,
   * registra el kardex y guarda la fecha real (a tiempo si <= fecha esperada).
   */
  async recibir(id: number, entrada: unknown, ctx: Contexto) {
    esquemaSinDatos.parse(entrada ?? {});
    const o = await obtenerEnAlcance(id, ctx);
    exigirTransicion(o, "RECIBIDA");
    const hoy = hoyBogota();
    const ahora = new Date();

    await prisma.$transaction(async (tx) => {
      await cambiarEstado(tx, o, {
        estado: "RECIBIDA", recibidaPorId: ctx.sesion.usuarioId, fechaRecepcion: aFechaDb(hoy),
      });
      const detalles = [...o.detalles].sort((a, b) => a.productoId - b.productoId);
      const movimientos: Prisma.MovimientoInventarioCreateManyInput[] = [];
      for (const d of detalles) {
        const inv = await tx.inventario.update({
          where: { productoId_sucursalId: { productoId: d.productoId, sucursalId: o.sucursalId } },
          data: { stock: { increment: d.cantidad } },
          select: { stock: true },
        });
        movimientos.push({
          productoId: d.productoId, sucursalId: o.sucursalId, tipo: "RECEPCION_COMPRA", cantidad: d.cantidad,
          stockResultante: inv.stock, referenciaTipo: "ORDEN_COMPRA", referenciaId: id,
          usuarioId: ctx.sesion.usuarioId, fecha: ahora,
        });
      }
      await tx.movimientoInventario.createMany({ data: movimientos });
      const esperada = deFechaDb(o.fechaEsperada);
      await auditar(ctx, "OC_RECIBIDA", "orden_compra", id, {
        proveedor: o.proveedor.nombre, sucursal: o.sucursal.codigo, fechaEsperada: esperada, fechaRecepcion: hoy,
        aTiempo: entregaATiempo(esperada, hoy), unidades: detalles.reduce((a, d) => a + d.cantidad, 0),
      }, tx);
    }, OPCIONES_TX);
    return this.obtener(id, ctx);
  },
};
