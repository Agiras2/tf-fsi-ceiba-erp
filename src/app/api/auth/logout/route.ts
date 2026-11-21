// ============================================================
// POST /api/auth/logout - Cierre de sesion
// ============================================================
import { NextResponse, type NextRequest } from "next/server";
import { leerSesion } from "@/server/auth/autorizacion";
import { COOKIE_SESION, opcionesCookie } from "@/server/auth/sesion";
import { registrarAuditoria, ipDeSolicitud } from "@/server/auditoria";
import { manejarError } from "@/server/errores";

export async function POST(request: NextRequest) {
  try {
    const sesion = await leerSesion();
    if (sesion) {
      await registrarAuditoria({
        usuarioId: sesion.usuarioId, accion: "LOGOUT", entidad: "usuario", entidadId: sesion.usuarioId,
        ip: ipDeSolicitud(request.headers),
      });
    }
    const respuesta = NextResponse.json({ ok: true });
    respuesta.cookies.set(COOKIE_SESION, "", opcionesCookie(0));
    return respuesta;
  } catch (e) {
    return manejarError(e);
  }
}
