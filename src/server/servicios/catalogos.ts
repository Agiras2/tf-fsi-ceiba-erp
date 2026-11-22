// ============================================================
// CeibaERP - Servicios de catalogos: sucursales, categorias, proveedores,
// productos y clientes (docs/04-REQ RF-06 a RF-11, RN-14 a RN-16)
// ============================================================
import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/server/db";
import { errores } from "@/server/errores";
import {
  esquemaCategoria, esquemaCategoriaEdicion, esquemaCliente, esquemaClienteEdicion, esquemaProducto,
  esquemaProductoEdicion, esquemaProveedor, esquemaProveedorEdicion, esquemaSucursal, esquemaSucursalEdicion,
  reglaPrecioCosto,
} from "@/lib/esquemas/catalogos";
import {
  aNumero, auditar, busqueda, cambios, errorCampo, filtroActivo, filtroId, leerListado, pagina, paginar,
  type Contexto, type ServicioCrud,
} from "./comun";

/** Minimo y maximo con que nace el inventario de un producto o sucursal nuevos (ajustables en Inventario). */
export const STOCK_MINIMO_DEFECTO = 10;
export const STOCK_MAXIMO_DEFECTO = 60;

// ============================================================
// Sucursales
// ============================================================
export const servicioSucursales: ServicioCrud = {
  async listar(params) {
    const p = leerListado(params);
    const where = { ...busqueda(p.q, ["codigo", "nombre", "ciudad"]), activa: filtroActivo(p.activo) };
    const [datos, total] = await Promise.all([
      prisma.sucursal.findMany({ where, orderBy: { nombre: "asc" }, ...paginar(p) }),
      prisma.sucursal.count({ where }),
    ]);
    return pagina(datos, total, p);
  },

  async obtener(id) {
    const s = await prisma.sucursal.findUnique({ where: { id } });
    if (!s) throw errores.noEncontrado("La sucursal");
    return s;
  },

  async crear(entrada, ctx) {
    const datos = esquemaSucursal.parse(entrada);
    return prisma.$transaction(async (tx) => {
      const s = await tx.sucursal.create({ data: datos });
      const productos = await tx.producto.findMany({ select: { id: true } });
      await tx.inventario.createMany({
        data: productos.map((p) => ({
          productoId: p.id, sucursalId: s.id, stock: 0,
          stockMinimo: STOCK_MINIMO_DEFECTO, stockMaximo: STOCK_MAXIMO_DEFECTO,
        })),
      });
      await auditar(ctx, "SUCURSAL_CREADA", "sucursal", s.id, { codigo: s.codigo, nombre: s.nombre }, tx);
      return s;
    });
  },

  async actualizar(id, entrada, ctx) {
    const datos = esquemaSucursalEdicion.parse(entrada);
    const antes = await prisma.sucursal.findUnique({ where: { id } });
    if (!antes) throw errores.noEncontrado("La sucursal");
    const s = await prisma.sucursal.update({ where: { id }, data: datos });
    await auditar(ctx, "SUCURSAL_ACTUALIZADA", "sucursal", id, cambios(antes, datos));
    return s;
  },

  async eliminar(id, ctx) {
    const s = await prisma.sucursal.findUnique({
      where: { id },
      include: { _count: { select: { usuarios: true, ventas: true, ordenes: true, movimientos: true } } },
    });
    if (!s) throw errores.noEncontrado("La sucursal");
    const c = s._count;
    if (c.usuarios + c.ventas + c.ordenes + c.movimientos > 0) {
      await prisma.sucursal.update({ where: { id }, data: { activa: false } });
      await auditar(ctx, "SUCURSAL_DESACTIVADA", "sucursal", id, { motivo: "tiene historial", ...c });
      return { resultado: "desactivado" };
    }
    await prisma.$transaction(async (tx) => {
      await tx.inventario.deleteMany({ where: { sucursalId: id } });
      await tx.sucursal.delete({ where: { id } });
      await auditar(ctx, "SUCURSAL_ELIMINADA", "sucursal", id, { codigo: s.codigo }, tx);
    });
    return { resultado: "eliminado" };
  },
};

// ============================================================
// Categorias
// ============================================================
export const servicioCategorias: ServicioCrud = {
  async listar(params) {
    const p = leerListado(params);
    const where = { ...busqueda(p.q, ["nombre", "descripcion"]), activa: filtroActivo(p.activo) };
    const [filas, total] = await Promise.all([
      prisma.categoria.findMany({
        where, orderBy: { nombre: "asc" }, ...paginar(p), include: { _count: { select: { productos: true } } },
      }),
      prisma.categoria.count({ where }),
    ]);
    const datos = filas.map(({ _count, ...c }) => ({ ...c, productos: _count.productos }));
    return pagina(datos, total, p);
  },

  async obtener(id) {
    const c = await prisma.categoria.findUnique({ where: { id } });
    if (!c) throw errores.noEncontrado("La categoría");
    return c;
  },

  async crear(entrada, ctx) {
    const datos = esquemaCategoria.parse(entrada);
    const c = await prisma.categoria.create({ data: datos });
    await auditar(ctx, "CATEGORIA_CREADA", "categoria", c.id, { nombre: c.nombre });
    return c;
  },

  async actualizar(id, entrada, ctx) {
    const datos = esquemaCategoriaEdicion.parse(entrada);
    const antes = await prisma.categoria.findUnique({ where: { id } });
    if (!antes) throw errores.noEncontrado("La categoría");
    const c = await prisma.categoria.update({ where: { id }, data: datos });
    await auditar(ctx, "CATEGORIA_ACTUALIZADA", "categoria", id, cambios(antes, datos));
    return c;
  },

  async eliminar(id, ctx) {
    const c = await prisma.categoria.findUnique({ where: { id }, include: { _count: { select: { productos: true } } } });
    if (!c) throw errores.noEncontrado("La categoría");
    if (c._count.productos > 0) {
      await prisma.categoria.update({ where: { id }, data: { activa: false } });
      await auditar(ctx, "CATEGORIA_DESACTIVADA", "categoria", id, { motivo: "tiene productos", productos: c._count.productos });
      return { resultado: "desactivado" };
    }
    await prisma.categoria.delete({ where: { id } });
    await auditar(ctx, "CATEGORIA_ELIMINADA", "categoria", id, { nombre: c.nombre });
    return { resultado: "eliminado" };
  },
};

// ============================================================
// Proveedores
// ============================================================
export const servicioProveedores: ServicioCrud = {
  async listar(params) {
    const p = leerListado(params);
    const where = { ...busqueda(p.q, ["nit", "nombre", "contacto"]), activo: filtroActivo(p.activo) };
    const [filas, total] = await Promise.all([
      prisma.proveedor.findMany({
        where, orderBy: { nombre: "asc" }, ...paginar(p), include: { _count: { select: { productos: true } } },
      }),
      prisma.proveedor.count({ where }),
    ]);
    const datos = filas.map(({ _count, ...pr }) => ({ ...pr, productos: _count.productos }));
    return pagina(datos, total, p);
  },

  async obtener(id) {
    const pr = await prisma.proveedor.findUnique({ where: { id } });
    if (!pr) throw errores.noEncontrado("El proveedor");
    return pr;
  },

  async crear(entrada, ctx) {
    const datos = esquemaProveedor.parse(entrada);
    const pr = await prisma.proveedor.create({ data: datos });
    await auditar(ctx, "PROVEEDOR_CREADO", "proveedor", pr.id, { nit: pr.nit, nombre: pr.nombre });
    return pr;
  },

  async actualizar(id, entrada, ctx) {
    const datos = esquemaProveedorEdicion.parse(entrada);
    const antes = await prisma.proveedor.findUnique({ where: { id } });
    if (!antes) throw errores.noEncontrado("El proveedor");
    const pr = await prisma.proveedor.update({ where: { id }, data: datos });
    await auditar(ctx, "PROVEEDOR_ACTUALIZADO", "proveedor", id, cambios(antes, datos));
    return pr;
  },

  async eliminar(id, ctx) {
    const pr = await prisma.proveedor.findUnique({
      where: { id }, include: { _count: { select: { productos: true, ordenes: true } } },
    });
    if (!pr) throw errores.noEncontrado("El proveedor");
    if (pr._count.productos + pr._count.ordenes > 0) {
      await prisma.proveedor.update({ where: { id }, data: { activo: false } });
      await auditar(ctx, "PROVEEDOR_DESACTIVADO", "proveedor", id, { motivo: "tiene historial", ...pr._count });
      return { resultado: "desactivado" };
    }
    await prisma.proveedor.delete({ where: { id } });
    await auditar(ctx, "PROVEEDOR_ELIMINADO", "proveedor", id, { nit: pr.nit });
    return { resultado: "eliminado" };
  },
};

// ============================================================
// Productos
// ============================================================
const incluirProducto = {
  categoria: { select: { id: true, nombre: true } },
  proveedor: { select: { id: true, nombre: true } },
} as const;

type ProductoConRelaciones = Prisma.ProductoGetPayload<{ include: typeof incluirProducto }>;

function salidaProducto(p: ProductoConRelaciones) {
  return { ...p, costo: aNumero(p.costo), precio: aNumero(p.precio) };
}

async function verificarRelacionesProducto(categoriaId?: number, proveedorId?: number) {
  if (categoriaId !== undefined) {
    const c = await prisma.categoria.findUnique({ where: { id: categoriaId }, select: { activa: true } });
    if (!c) throw errorCampo("categoriaId", "La categoría no existe.");
    if (!c.activa) throw errorCampo("categoriaId", "La categoría está inactiva.");
  }
  if (proveedorId !== undefined) {
    const pr = await prisma.proveedor.findUnique({ where: { id: proveedorId }, select: { activo: true } });
    if (!pr) throw errorCampo("proveedorId", "El proveedor no existe.");
    if (!pr.activo) throw errorCampo("proveedorId", "El proveedor está inactivo.");
  }
}

export const servicioProductos: ServicioCrud = {
  async listar(params) {
    const p = leerListado(params);
    const where = {
      ...busqueda(p.q, ["sku", "nombre"]),
      activo: filtroActivo(p.activo),
      categoriaId: filtroId(params, "categoriaId"),
      proveedorId: filtroId(params, "proveedorId"),
    };
    const [filas, total] = await Promise.all([
      prisma.producto.findMany({ where, orderBy: { nombre: "asc" }, ...paginar(p), include: incluirProducto }),
      prisma.producto.count({ where }),
    ]);
    return pagina(filas.map(salidaProducto), total, p);
  },

  async obtener(id) {
    const p = await prisma.producto.findUnique({ where: { id }, include: incluirProducto });
    if (!p) throw errores.noEncontrado("El producto");
    return salidaProducto(p);
  },

  async crear(entrada, ctx) {
    const datos = esquemaProducto.parse(entrada);
    await verificarRelacionesProducto(datos.categoriaId, datos.proveedorId);
    return prisma.$transaction(async (tx) => {
      const p = await tx.producto.create({ data: datos, include: incluirProducto });
      const sucursales = await tx.sucursal.findMany({ select: { id: true } });
      await tx.inventario.createMany({
        data: sucursales.map((s) => ({
          productoId: p.id, sucursalId: s.id, stock: 0,
          stockMinimo: STOCK_MINIMO_DEFECTO, stockMaximo: STOCK_MAXIMO_DEFECTO,
        })),
      });
      await auditar(ctx, "PRODUCTO_CREADO", "producto", p.id, { sku: p.sku, nombre: p.nombre }, tx);
      return salidaProducto(p);
    });
  },

  async actualizar(id, entrada, ctx) {
    const datos = esquemaProductoEdicion.parse(entrada);
    const antes = await prisma.producto.findUnique({ where: { id } });
    if (!antes) throw errores.noEncontrado("El producto");
    const costo = datos.costo ?? antes.costo.toNumber();
    const precio = datos.precio ?? antes.precio.toNumber();
    if (!reglaPrecioCosto({ costo, precio })) throw errorCampo("precio", "El precio debe ser mayor o igual al costo.");
    await verificarRelacionesProducto(datos.categoriaId, datos.proveedorId);
    const p = await prisma.producto.update({ where: { id }, data: datos, include: incluirProducto });
    await auditar(ctx, "PRODUCTO_ACTUALIZADO", "producto", id, cambios(antes, datos));
    return salidaProducto(p);
  },

  async eliminar(id, ctx) {
    const p = await prisma.producto.findUnique({
      where: { id },
      include: { _count: { select: { detallesVenta: true, detallesOrden: true, movimientos: true } } },
    });
    if (!p) throw errores.noEncontrado("El producto");
    const c = p._count;
    if (c.detallesVenta + c.detallesOrden + c.movimientos > 0) {
      await prisma.producto.update({ where: { id }, data: { activo: false } });
      await auditar(ctx, "PRODUCTO_DESACTIVADO", "producto", id, { motivo: "tiene historial", ...c });
      return { resultado: "desactivado" };
    }
    await prisma.$transaction(async (tx) => {
      await tx.inventario.deleteMany({ where: { productoId: id } });
      await tx.producto.delete({ where: { id } });
      await auditar(ctx, "PRODUCTO_ELIMINADO", "producto", id, { sku: p.sku }, tx);
    });
    return { resultado: "eliminado" };
  },
};

// ============================================================
// Clientes
// ============================================================
export const servicioClientes: ServicioCrud = {
  async listar(params) {
    const p = leerListado(params);
    const where = { ...busqueda(p.q, ["documento", "nombre", "email"]), activo: filtroActivo(p.activo) };
    const [datos, total] = await Promise.all([
      prisma.cliente.findMany({ where, orderBy: { nombre: "asc" }, ...paginar(p) }),
      prisma.cliente.count({ where }),
    ]);
    return pagina(datos, total, p);
  },

  async obtener(id) {
    const c = await prisma.cliente.findUnique({ where: { id } });
    if (!c) throw errores.noEncontrado("El cliente");
    return c;
  },

  async crear(entrada, ctx: Contexto) {
    const datos = esquemaCliente.parse(entrada);
    const c = await prisma.cliente.create({ data: datos });
    await auditar(ctx, "CLIENTE_CREADO", "cliente", c.id, { documento: c.documento });
    return c;
  },

  async actualizar(id, entrada, ctx) {
    const datos = esquemaClienteEdicion.parse(entrada);
    const antes = await prisma.cliente.findUnique({ where: { id } });
    if (!antes) throw errores.noEncontrado("El cliente");
    const c = await prisma.cliente.update({ where: { id }, data: datos });
    await auditar(ctx, "CLIENTE_ACTUALIZADO", "cliente", id, cambios(antes, datos));
    return c;
  },

  async eliminar(id, ctx) {
    const c = await prisma.cliente.findUnique({ where: { id }, include: { _count: { select: { ventas: true } } } });
    if (!c) throw errores.noEncontrado("El cliente");
    if (c._count.ventas > 0) {
      await prisma.cliente.update({ where: { id }, data: { activo: false } });
      await auditar(ctx, "CLIENTE_DESACTIVADO", "cliente", id, { motivo: "tiene ventas", ventas: c._count.ventas });
      return { resultado: "desactivado" };
    }
    await prisma.cliente.delete({ where: { id } });
    await auditar(ctx, "CLIENTE_ELIMINADO", "cliente", id, { documento: c.documento });
    return { resultado: "eliminado" };
  },
};
