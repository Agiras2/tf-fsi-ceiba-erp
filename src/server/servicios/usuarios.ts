// ============================================================
// CeibaERP - Servicio de usuarios (docs/04-REQ RF-03, RN-19, RN-20)
// Los usuarios nunca se eliminan fisicamente: se desactivan (trazabilidad).
// ============================================================
import bcrypt from "bcryptjs";
import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/server/db";
import { ErrorApi, errores } from "@/server/errores";
import { esquemaUsuario, esquemaUsuarioEdicion, reglaRolSucursal } from "@/lib/esquemas/catalogos";
import { ROLES, type Rol } from "@/lib/navegacion";
import {
  auditar, busqueda, cambios, errorCampo, filtroActivo, filtroId, leerListado, pagina, paginar, type ServicioCrud,
} from "./comun";

const COSTO_BCRYPT = 12;

const seleccionUsuario = {
  id: true, nombre: true, email: true, rol: true, sucursalId: true, activo: true, ultimoAcceso: true,
  createdAt: true, updatedAt: true, sucursal: { select: { id: true, nombre: true } },
} as const;

async function verificarSucursal(sucursalId: number | null | undefined) {
  if (sucursalId == null) return;
  const s = await prisma.sucursal.findUnique({ where: { id: sucursalId }, select: { activa: true } });
  if (!s) throw errorCampo("sucursalId", "La sucursal no existe.");
  if (!s.activa) throw errorCampo("sucursalId", "La sucursal está inactiva.");
}

export const servicioUsuarios: ServicioCrud = {
  async listar(params) {
    const p = leerListado(params);
    const rol = params.get("rol");
    if (rol && rol !== "todos" && !ROLES.includes(rol as Rol)) throw errorCampo("rol", "Rol no válido.");
    const where = {
      ...busqueda(p.q, ["nombre", "email"]),
      activo: filtroActivo(p.activo),
      rol: rol && rol !== "todos" ? (rol as Rol) : undefined,
      sucursalId: filtroId(params, "sucursalId"),
    };
    const [datos, total] = await Promise.all([
      prisma.usuario.findMany({ where, orderBy: [{ rol: "asc" }, { nombre: "asc" }], ...paginar(p), select: seleccionUsuario }),
      prisma.usuario.count({ where }),
    ]);
    return pagina(datos, total, p);
  },

  async obtener(id) {
    const u = await prisma.usuario.findUnique({ where: { id }, select: seleccionUsuario });
    if (!u) throw errores.noEncontrado("El usuario");
    return u;
  },

  async crear(entrada, ctx) {
    const { password, ...datos } = esquemaUsuario.parse(entrada);
    await verificarSucursal(datos.sucursalId);
    const u = await prisma.usuario.create({
      data: { ...datos, passwordHash: await bcrypt.hash(password, COSTO_BCRYPT) },
      select: seleccionUsuario,
    });
    await auditar(ctx, "USUARIO_CREADO", "usuario", u.id, { email: u.email, rol: u.rol, sucursalId: u.sucursalId });
    return u;
  },

  async actualizar(id, entrada, ctx) {
    const { password, ...datos } = esquemaUsuarioEdicion.parse(entrada);
    const antes = await prisma.usuario.findUnique({ where: { id } });
    if (!antes) throw errores.noEncontrado("El usuario");

    const esPropio = id === ctx.sesion.usuarioId;
    if (esPropio && (datos.activo === false || (datos.rol !== undefined && datos.rol !== antes.rol))) {
      throw new ErrorApi(409, "OPERACION_NO_PERMITIDA", "No puede desactivar ni cambiar el rol de su propio usuario.");
    }

    // RN-20 con los valores resultantes: al pasar a Administrador o Gerente se quita la sucursal.
    const rol = datos.rol ?? antes.rol;
    if ((rol === "ADMIN" || rol === "GERENTE") && datos.sucursalId === undefined) datos.sucursalId = null;
    const sucursalId = datos.sucursalId !== undefined ? datos.sucursalId : antes.sucursalId;
    if (!reglaRolSucursal({ rol, sucursalId })) {
      throw errorCampo("sucursalId", "Bodega y Cajero requieren sucursal; Administrador y Gerente no la tienen.");
    }
    await verificarSucursal(datos.sucursalId);

    const u = await prisma.usuario.update({
      where: { id },
      data: { ...datos, ...(password ? { passwordHash: await bcrypt.hash(password, COSTO_BCRYPT) } : {}) },
      select: seleccionUsuario,
    });
    const detalle: Record<string, Prisma.InputJsonValue> = { ...cambios(antes, datos) } as Record<string, Prisma.InputJsonValue>;
    if (password) detalle.password = "actualizada";
    await auditar(ctx, "USUARIO_ACTUALIZADO", "usuario", id, detalle);
    return u;
  },

  async eliminar(id, ctx) {
    if (id === ctx.sesion.usuarioId) {
      throw new ErrorApi(409, "OPERACION_NO_PERMITIDA", "No puede desactivar su propio usuario.");
    }
    const u = await prisma.usuario.findUnique({ where: { id }, select: { id: true, email: true } });
    if (!u) throw errores.noEncontrado("El usuario");
    await prisma.usuario.update({ where: { id }, data: { activo: false } });
    await auditar(ctx, "USUARIO_DESACTIVADO", "usuario", id, { email: u.email });
    return { resultado: "desactivado" };
  },
};
