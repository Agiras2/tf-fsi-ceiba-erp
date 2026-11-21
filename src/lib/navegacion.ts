// ============================================================
// CeibaERP - Roles y navegacion (docs/03-NEG seccion 4.1)
// Compartido por servidor (proteccion de paginas) y cliente (menu).
// ============================================================

export const ROLES = ["ADMIN", "GERENTE", "BODEGA", "CAJERO"] as const;
export type Rol = (typeof ROLES)[number];

export const ETIQUETA_ROL: Record<Rol, string> = {
  ADMIN: "Administrador",
  GERENTE: "Gerente",
  BODEGA: "Bodega",
  CAJERO: "Cajero",
};

export type ItemMenu = {
  titulo: string;
  ruta: string;
  roles: readonly Rol[];
  grupo: "General" | "Operación" | "Catálogos" | "Inteligencia" | "Administración";
  icono: string; // nombre de icono de lucide-react
};

export const MENU: readonly ItemMenu[] = [
  { titulo: "Dashboard", ruta: "/dashboard", roles: ["ADMIN", "GERENTE"], grupo: "General", icono: "LayoutDashboard" },
  { titulo: "Reportes", ruta: "/reportes", roles: ["ADMIN", "GERENTE", "BODEGA"], grupo: "General", icono: "FileSpreadsheet" },
  { titulo: "Caja (ventas)", ruta: "/ventas/caja", roles: ["CAJERO"], grupo: "Operación", icono: "ShoppingCart" },
  { titulo: "Ventas", ruta: "/ventas", roles: ["ADMIN", "GERENTE", "CAJERO"], grupo: "Operación", icono: "Receipt" },
  { titulo: "Inventario", ruta: "/inventario", roles: ["ADMIN", "GERENTE", "BODEGA", "CAJERO"], grupo: "Operación", icono: "Boxes" },
  { titulo: "Órdenes de compra", ruta: "/compras", roles: ["ADMIN", "GERENTE", "BODEGA"], grupo: "Operación", icono: "Truck" },
  { titulo: "Productos", ruta: "/catalogos/productos", roles: ["ADMIN", "GERENTE", "BODEGA", "CAJERO"], grupo: "Catálogos", icono: "Package" },
  { titulo: "Categorías", ruta: "/catalogos/categorias", roles: ["ADMIN", "GERENTE", "BODEGA"], grupo: "Catálogos", icono: "Tags" },
  { titulo: "Proveedores", ruta: "/catalogos/proveedores", roles: ["ADMIN", "GERENTE", "BODEGA"], grupo: "Catálogos", icono: "Factory" },
  { titulo: "Sucursales", ruta: "/catalogos/sucursales", roles: ["ADMIN", "GERENTE", "BODEGA"], grupo: "Catálogos", icono: "Store" },
  { titulo: "Clientes", ruta: "/catalogos/clientes", roles: ["ADMIN", "GERENTE", "CAJERO"], grupo: "Catálogos", icono: "Users" },
  { titulo: "Asistente (chatbot)", ruta: "/chat", roles: ["ADMIN", "GERENTE", "BODEGA", "CAJERO"], grupo: "Inteligencia", icono: "MessageSquare" },
  { titulo: "Agentes de IA", ruta: "/agentes", roles: ["ADMIN", "GERENTE"], grupo: "Inteligencia", icono: "Bot" },
  { titulo: "Usuarios", ruta: "/usuarios", roles: ["ADMIN"], grupo: "Administración", icono: "UserCog" },
  { titulo: "Auditoría", ruta: "/auditoria", roles: ["ADMIN"], grupo: "Administración", icono: "ScrollText" },
];

/** Pagina de inicio segun el rol. */
export const INICIO_POR_ROL: Record<Rol, string> = {
  ADMIN: "/dashboard",
  GERENTE: "/dashboard",
  BODEGA: "/inventario",
  CAJERO: "/ventas/caja",
};

export function menuParaRol(rol: Rol): ItemMenu[] {
  return MENU.filter((m) => m.roles.includes(rol));
}

/** Busca el item de menu que corresponde a una ruta (coincidencia mas especifica). */
export function itemParaRuta(ruta: string): ItemMenu | undefined {
  return [...MENU]
    .sort((a, b) => b.ruta.length - a.ruta.length)
    .find((m) => ruta === m.ruta || ruta.startsWith(`${m.ruta}/`));
}

export function puedeAcceder(rol: Rol, ruta: string): boolean {
  const item = itemParaRuta(ruta);
  return item ? item.roles.includes(rol) : false;
}
