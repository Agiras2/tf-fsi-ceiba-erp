// ============================================================
// CeibaERP - Permisos de la API por recurso (docs/03-NEG 4.1 y 04-REQ 4)
// Fuente unica compartida: las rutas (servidor) y las pantallas (cliente)
// consultan esta tabla. La proteccion real ocurre en el servidor.
// ============================================================
import type { Rol } from "@/lib/navegacion";

export type PermisosCrud = {
  leer: readonly Rol[];
  crear: readonly Rol[];
  editar: readonly Rol[];
  eliminar: readonly Rol[];
};

const ADMIN = ["ADMIN"] as const;

export const PERMISOS = {
  sucursales: { leer: ["ADMIN", "GERENTE", "BODEGA"], crear: ADMIN, editar: ADMIN, eliminar: ADMIN },
  categorias: { leer: ["ADMIN", "GERENTE", "BODEGA"], crear: ADMIN, editar: ADMIN, eliminar: ADMIN },
  proveedores: { leer: ["ADMIN", "GERENTE", "BODEGA"], crear: ADMIN, editar: ADMIN, eliminar: ADMIN },
  productos: { leer: ["ADMIN", "GERENTE", "BODEGA", "CAJERO"], crear: ADMIN, editar: ADMIN, eliminar: ADMIN },
  clientes: { leer: ["ADMIN", "GERENTE", "CAJERO"], crear: ["ADMIN", "CAJERO"], editar: ADMIN, eliminar: ADMIN },
  usuarios: { leer: ADMIN, crear: ADMIN, editar: ADMIN, eliminar: ADMIN },
} as const satisfies Record<string, PermisosCrud>;

export type RecursoCrud = keyof typeof PERMISOS;

/** Acciones que el rol puede hacer sobre un recurso (para mostrar u ocultar botones). */
export function accionesPermitidas(recurso: RecursoCrud, rol: Rol) {
  const p: PermisosCrud = PERMISOS[recurso];
  return {
    crear: p.crear.includes(rol),
    editar: p.editar.includes(rol),
    eliminar: p.eliminar.includes(rol),
  };
}

/** Indica si el rol puede consultar un recurso (por ejemplo, para cargar opciones de filtros). */
export function puedeLeer(recurso: RecursoCrud, rol: Rol): boolean {
  const p: PermisosCrud = PERMISOS[recurso];
  return p.leer.includes(rol);
}

/** Inventario (docs/03-NEG 4.1, docs/04-REQ RF-12 a RF-15). El alcance por sucursal se aplica en el servidor. */
export const PERMISOS_INVENTARIO = {
  leer: ["ADMIN", "GERENTE", "BODEGA", "CAJERO"],
  umbrales: ["ADMIN", "BODEGA"],
  ajustar: ["BODEGA"],
  kardex: ["ADMIN", "GERENTE", "BODEGA"],
} as const satisfies Record<string, readonly Rol[]>;

/** Auditoria (RF-05): solo el administrador. */
export const PERMISOS_AUDITORIA = { leer: ["ADMIN"] } as const satisfies Record<string, readonly Rol[]>;

export function accionesInventario(rol: Rol) {
  const incluye = (roles: readonly Rol[]) => roles.includes(rol);
  return {
    umbrales: incluye(PERMISOS_INVENTARIO.umbrales),
    ajustar: incluye(PERMISOS_INVENTARIO.ajustar),
    kardex: incluye(PERMISOS_INVENTARIO.kardex),
  };
}

/** Ventas (docs/03-NEG 4.1, docs/04-REQ RF-16 a RF-18). El cajero opera solo su sucursal (RN-05). */
export const PERMISOS_VENTAS = {
  leer: ["ADMIN", "GERENTE", "CAJERO"],
  registrar: ["CAJERO"],
  anular: ["GERENTE"],
} as const satisfies Record<string, readonly Rol[]>;

/** Ordenes de compra (docs/03-NEG 4.1, docs/04-REQ RF-19 a RF-23). Bodega opera solo su sucursal (RN-05). */
export const PERMISOS_COMPRAS = {
  leer: ["ADMIN", "GERENTE", "BODEGA"],
  crear: ["BODEGA"],
  editar: ["BODEGA", "GERENTE"],
  aprobar: ["GERENTE"],
  cancelar: ["GERENTE"],
  recibir: ["BODEGA"],
} as const satisfies Record<string, readonly Rol[]>;

export function accionesVentas(rol: Rol) {
  return {
    registrar: (PERMISOS_VENTAS.registrar as readonly Rol[]).includes(rol),
    anular: (PERMISOS_VENTAS.anular as readonly Rol[]).includes(rol),
    /** El costo y la utilidad solo los ven el administrador y el gerente. */
    verCostos: rol === "ADMIN" || rol === "GERENTE",
  };
}

export function accionesCompras(rol: Rol) {
  const incluye = (roles: readonly Rol[]) => roles.includes(rol);
  return {
    crear: incluye(PERMISOS_COMPRAS.crear),
    editar: incluye(PERMISOS_COMPRAS.editar),
    aprobar: incluye(PERMISOS_COMPRAS.aprobar),
    cancelar: incluye(PERMISOS_COMPRAS.cancelar),
    recibir: incluye(PERMISOS_COMPRAS.recibir),
  };
}
