// ============================================================
// CeibaERP - Sesion con JWT firmado (HS256) en cookie httpOnly
// (docs/09-SEG seccion 1)
// ============================================================
import { SignJWT, jwtVerify } from "jose";
import { ROLES, type Rol } from "@/lib/navegacion";

export const COOKIE_SESION = "ceiba_sesion";
export const DURACION_SESION_SEG = 8 * 60 * 60; // 8 horas

export type Sesion = {
  usuarioId: number;
  nombre: string;
  rol: Rol;
  sucursalId: number | null;
};

function clave(): Uint8Array {
  const secreto = process.env.JWT_SECRET ?? "";
  if (secreto.length < 32) {
    throw new Error("JWT_SECRET debe tener al menos 32 caracteres.");
  }
  return new TextEncoder().encode(secreto);
}

export async function firmarSesion(s: Sesion): Promise<string> {
  return new SignJWT({ nombre: s.nombre, rol: s.rol, sucursalId: s.sucursalId })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(String(s.usuarioId))
    .setIssuedAt()
    .setExpirationTime(`${DURACION_SESION_SEG}s`)
    .sign(clave());
}

/** Verifica la firma y la expiracion. Devuelve null si el token no es valido. */
export async function verificarToken(token: string | undefined | null): Promise<Sesion | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, clave(), { algorithms: ["HS256"] });
    const usuarioId = Number(payload.sub);
    const rol = payload.rol as Rol;
    if (!Number.isInteger(usuarioId) || !ROLES.includes(rol)) return null;
    const sucursalId = typeof payload.sucursalId === "number" ? payload.sucursalId : null;
    return { usuarioId, rol, sucursalId, nombre: String(payload.nombre ?? "") };
  } catch {
    return null;
  }
}

export function opcionesCookie(maxAge: number) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge,
  };
}
