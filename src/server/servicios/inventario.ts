// ============================================================
// CeibaERP - Servicio de inventario (docs/04-REQ RF-12 a RF-15, RN-01, RN-05, RN-11 a RN-13)
// ============================================================
import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/server/db";
import { ErrorApi, errores } from "@/server/errores";
import { sucursalPermitida } from "@/server/auth/autorizacion";
import {
  esquemaAjuste, esquemaUmbrales, estadoInventario, ESTADOS_INVENTARIO, type EstadoInventario,
} from "@/lib/esquemas/inventario";
import { esquemaListado } from "@/lib/esquemas/comunes";
import { auditar, busqueda, filtroId, pagina, paginar, type Contexto } from "./comun";

const incluir = {
  producto: {
    select: { id: true, sku: true, nombre: true, unidad: true, activo: true, categoria: { select: { id: true, nombre: true } } },
  },
  sucursal: { select: { id: true, codigo: true, nombre: true } },
} as const;

type FilaInventario = Prisma.InventarioGetPayload<{ include: typeof incluir }>;

function salida(i: FilaInventario) {
  return { ...i, estado: estadoInventario(i.stock, i.stockMinimo, i.stockMaximo) };
}

/** Condicion de BD equivalente a RN-12 (compara columnas con referencias de campo). */
function whereEstado(estado: EstadoInventario): Prisma.InventarioWhereInput {
  const f = prisma.inventario.fields;
  switch (estado) {
    case "AGOTADO":
      return { stock: 0 };
    case "BAJO_MINIMO":
      return { AND: [{ stock: { gt: 0 } }, { stock: { lte: f.stockMinimo } }] };
    case "SOBRESTOCK":
      return { stock: { gt: f.stockMaximo } };
    case "NORMAL":
      return { AND: [{ stock: { gt: f.stockMinimo } }, { stock: { lte: f.stockMaximo } }] };
  }
}

/** Busca un registro de inventario respetando el alcance por sucursal (RN-05): fuera de alcance = 404. */
async function obtenerEnAlcance(id: number, ctx: Contexto) {
  const inv = await prisma.inventario.findUnique({ where: { id }, include: incluir });
  const alcance = sucursalPermitida(ctx.sesion, null);
  if (!inv || (alcance !== null && inv.sucursalId !== alcance)) throw errores.noEncontrado("El registro de inventario");
  return inv;
}

export const servicioInventario = {
  /** RF-12: existencias con estado, filtros y resumen por estado. */
  async listar(params: URLSearchParams, ctx: Contexto) {
    const p = esquemaListado.parse(Object.fromEntries(params));
    const estado = params.get("estado") ?? "todos";
    if (estado !== "todos" && !ESTADOS_INVENTARIO.includes(estado as EstadoInventario)) {
      throw new ErrorApi(400, "DATOS_INVALIDOS", "El filtro estado no es válido.");
    }
    const sucursalId = sucursalPermitida(ctx.sesion, filtroId(params, "sucursalId"));
    const base: Prisma.InventarioWhereInput = {
      sucursalId: sucursalId ?? undefined,
      producto: {
        activo: true,
        categoriaId: filtroId(params, "categoriaId"),
        ...busqueda(p.q, ["sku", "nombre"]),
      },
    };
    const where = estado === "todos" ? base : { AND: [base, whereEstado(estado as EstadoInventario)] };

    const [filas, total, ...conteos] = await Promise.all([
      prisma.inventario.findMany({
        where, include: incluir, ...paginar(p),
        orderBy: [{ producto: { nombre: "asc" } }, { sucursal: { nombre: "asc" } }],
      }),
      prisma.inventario.count({ where }),
      ...ESTADOS_INVENTARIO.map((e) => prisma.inventario.count({ where: { AND: [base, whereEstado(e)] } })),
    ]);
    const resumen = Object.fromEntries(ESTADOS_INVENTARIO.map((e, i) => [e, conteos[i]])) as Record<EstadoInventario, number>;
    return { ...pagina(filas.map(salida), total, p), resumen };
  },

  /** RF-13: cambiar stock minimo y maximo (RN-13). */
  async actualizarUmbrales(id: number, entrada: unknown, ctx: Contexto) {
    const datos = esquemaUmbrales.parse(entrada);
    const antes = await obtenerEnAlcance(id, ctx);
    const inv = await prisma.inventario.update({ where: { id }, data: datos, include: incluir });
    await auditar(ctx, "INVENTARIO_UMBRALES", "inventario", id, {
      producto: antes.producto.sku, sucursal: antes.sucursal.codigo,
      antes: { stockMinimo: antes.stockMinimo, stockMaximo: antes.stockMaximo }, despues: datos,
    });
    return salida(inv);
  },

  /**
   * RF-14: ajuste de entrada o salida con motivo (RN-11).
   * La salida usa una actualizacion condicional (stock >= cantidad) dentro de la
   * transaccion: si dos ajustes compiten, el stock nunca queda negativo (RN-01).
   */
  async ajustar(id: number, entrada: unknown, ctx: Contexto) {
    const datos = esquemaAjuste.parse(entrada);
    const inv = await obtenerEnAlcance(id, ctx);
    if (!inv.producto.activo) throw new ErrorApi(409, "PRODUCTO_INACTIVO", "No se puede ajustar un producto inactivo.");

    return prisma.$transaction(async (tx) => {
      const r = await tx.inventario.updateMany({
        where: { id, ...(datos.tipo === "SALIDA" ? { stock: { gte: datos.cantidad } } : {}) },
        data: { stock: datos.tipo === "SALIDA" ? { decrement: datos.cantidad } : { increment: datos.cantidad } },
      });
      if (r.count === 0) {
        const actual = await tx.inventario.findUnique({ where: { id }, select: { stock: true } });
        throw new ErrorApi(409, "STOCK_INSUFICIENTE",
          `No hay existencias suficientes de ${inv.producto.nombre} (disponible: ${actual?.stock ?? 0}).`,
          [{ campo: "cantidad", mensaje: `Máximo disponible: ${actual?.stock ?? 0}.` }]);
      }
      const nuevo = await tx.inventario.findUniqueOrThrow({ where: { id }, include: incluir });
      const cantidad = datos.tipo === "SALIDA" ? -datos.cantidad : datos.cantidad;
      const mov = await tx.movimientoInventario.create({
        data: {
          productoId: inv.productoId, sucursalId: inv.sucursalId,
          tipo: datos.tipo === "SALIDA" ? "AJUSTE_SALIDA" : "AJUSTE_ENTRADA",
          cantidad, stockResultante: nuevo.stock, referenciaTipo: "AJUSTE", motivo: datos.motivo,
          usuarioId: ctx.sesion.usuarioId,
        },
      });
      await auditar(ctx, "INVENTARIO_AJUSTE", "inventario", id, {
        producto: inv.producto.sku, sucursal: inv.sucursal.codigo, cantidad, stockAnterior: inv.stock,
        stockResultante: nuevo.stock, motivo: datos.motivo, movimientoId: mov.id,
      }, tx);
      return salida(nuevo);
    });
  },

  /** RF-15: kardex de un producto en una sucursal, del movimiento mas reciente al mas antiguo. */
  async kardex(params: URLSearchParams, ctx: Contexto) {
    const p = esquemaListado.parse(Object.fromEntries(params));
    const productoId = filtroId(params, "productoId");
    const solicitada = filtroId(params, "sucursalId");
    if (!productoId || !solicitada) {
      throw new ErrorApi(400, "DATOS_INVALIDOS", "Indique el producto y la sucursal del kardex.");
    }
    const alcance = sucursalPermitida(ctx.sesion, solicitada);
    if (alcance !== solicitada) throw errores.noEncontrado("El kardex");

    const inv = await prisma.inventario.findUnique({
      where: { productoId_sucursalId: { productoId, sucursalId: solicitada } },
      include: incluir,
    });
    if (!inv) throw errores.noEncontrado("El kardex");

    const where = { productoId, sucursalId: solicitada };
    const [movimientos, total] = await Promise.all([
      prisma.movimientoInventario.findMany({
        where, ...paginar(p), orderBy: [{ fecha: "desc" }, { id: "desc" }],
        include: { usuario: { select: { nombre: true } } },
      }),
      prisma.movimientoInventario.count({ where }),
    ]);
    return { ...pagina(movimientos, total, p), inventario: salida(inv) };
  },
};
