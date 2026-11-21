// ============================================================
// CeibaERP - Autorizacion en el servidor (docs/09-SEG seccion 2)
// Cada Route Handler y cada pagina protegida verifica sesion y rol aqui;
// el proxy solo redirige, la proteccion real esta en el servidor.
// ============================================================
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "@/server/db";
import { errores } from "@/server/errores";
import { COOKIE_SESION, verificarToken, type Sesion } from "@/server/auth/sesion";
import { puedeAcceder, type Rol } from "@/lib/navegacion";

/**
 * Lee y valida la sesion actual. Ademas del JWT, confirma en la BD que el
 * usuario sigue activo y que su rol y sucursal no cambiaron (RN-19).
 */
export async function leerSesion(): Promise<Sesion | null> {
  const token = (await cookies()).get(COOKIE_SESION)?.value;
  const sesion = await verificarToken(token);
  if (!sesion) return null;
  const usuario = await prisma.usuario.findUnique({
    where: { id: sesion.usuarioId },
    select: { activo: true, rol: true, sucursalId: true, nombre: true },
  });
  if (!usuario || !usuario.activo || usuario.rol !== sesion.rol || usuario.sucursalId !== sesion.sucursalId) {
    return null;
  }
  return { ...sesion, nombre: usuario.nombre };
}

/** Para Route Handlers: lanza 401 si no hay sesion valida. */
export async function requerirSesion(): Promise<Sesion> {
  const sesion = await leerSesion();
  if (!sesion) throw errores.noAutenticado();
  return sesion;
}

/** Para Route Handlers: lanza 401 sin sesion y 403 si el rol no esta permitido. */
export async function requerirRol(roles: readonly Rol[]): Promise<Sesion> {
  const sesion = await requerirSesion();
  if (!roles.includes(sesion.rol)) throw errores.sinPermiso();
  return sesion;
}

/**
 * Alcance por sucursal (RN-05): BODEGA y CAJERO solo operan su sucursal.
 * Devuelve la sucursal que debe usarse en la consulta; para ADMIN y GERENTE
 * respeta la solicitada (o null = todas).
 */
export function sucursalPermitida(sesion: Sesion, solicitada?: number | null): number | null {
  if (sesion.rol === "BODEGA" || sesion.rol === "CAJERO") return sesion.sucursalId;
  return solicitada ?? null;
}

/** Para paginas (Server Components): redirige a /login o a /sin-permiso. */
export async function protegerPagina(ruta: string): Promise<Sesion> {
  const sesion = await leerSesion();
  if (!sesion) redirect("/login");
  if (!puedeAcceder(sesion.rol, ruta)) redirect("/sin-permiso");
  return sesion;
}
