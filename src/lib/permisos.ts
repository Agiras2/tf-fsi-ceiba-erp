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
