// ============================================================
// POST /api/auth/login - Inicio de sesion (docs/04-REQ RF-01, docs/09-SEG)
// ============================================================
import { NextResponse, type NextRequest } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/server/db";
import { esquemaLogin } from "@/server/validacion/auth";
import { COOKIE_SESION, DURACION_SESION_SEG, firmarSesion, opcionesCookie } from "@/server/auth/sesion";
import { limitadorLogin } from "@/server/auth/limitador";
import { registrarAuditoria, ipDeSolicitud } from "@/server/auditoria";
import { errores, manejarError, ErrorApi } from "@/server/errores";
import { INICIO_POR_ROL } from "@/lib/navegacion";

// Hash ficticio para comparar en tiempo similar cuando el correo no existe.
const HASH_FICTICIO = "$2b$12$bdrXM0vi8SrVwlHepfdTVuCC/bKgPOqGGwqoukss8P7cVlg4u53jW";

export async function POST(request: NextRequest) {
  try {
    const datos = esquemaLogin.parse(await request.json().catch(() => ({})));
    const ip = ipDeSolicitud(request.headers);
    const claveLimite = `${datos.email}|${ip ?? "sin-ip"}`;

    if (limitadorLogin.estaBloqueado(claveLimite)) {
      await registrarAuditoria({ accion: "LOGIN_BLOQUEADO", entidad: "usuario", detalle: { email: datos.email }, ip });
      throw errores.demasiadosIntentos("Demasiados intentos fallidos. Espere 15 minutos e intente de nuevo.");
    }

    const usuario = await prisma.usuario.findUnique({
      where: { email: datos.email },
      include: { sucursal: { select: { id: true, nombre: true } } },
    });
    const coincide = await bcrypt.compare(datos.password, usuario?.passwordHash ?? HASH_FICTICIO);

    if (!usuario || !coincide || !usuario.activo) {
      limitadorLogin.registrarFallo(claveLimite);
      await registrarAuditoria({
        usuarioId: usuario?.id ?? null, accion: "LOGIN_FALLIDO", entidad: "usuario", entidadId: usuario?.id ?? null,
        detalle: { email: datos.email, motivo: !usuario ? "correo" : !coincide ? "contrasena" : "inactivo" }, ip,
      });
      throw new ErrorApi(401, "CREDENCIALES_INVALIDAS", "Correo o contraseña incorrectos.");
    }

    limitadorLogin.limpiar(claveLimite);
    await prisma.usuario.update({ where: { id: usuario.id }, data: { ultimoAcceso: new Date() } });
    const token = await firmarSesion({
      usuarioId: usuario.id, nombre: usuario.nombre, rol: usuario.rol, sucursalId: usuario.sucursalId,
    });
    await registrarAuditoria({ usuarioId: usuario.id, accion: "LOGIN_EXITOSO", entidad: "usuario", entidadId: usuario.id, ip });

    const respuesta = NextResponse.json({
      usuario: {
        id: usuario.id, nombre: usuario.nombre, email: usuario.email, rol: usuario.rol,
        sucursal: usuario.sucursal,
      },
      inicio: INICIO_POR_ROL[usuario.rol],
    });
    respuesta.cookies.set(COOKIE_SESION, token, opcionesCookie(DURACION_SESION_SEG));
    return respuesta;
  } catch (e) {
    return manejarError(e);
  }
}
