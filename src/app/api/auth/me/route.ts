// ============================================================
// GET /api/auth/me - Usuario de la sesion actual
// ============================================================
import { NextResponse } from "next/server";
import { prisma } from "@/server/db";
import { requerirSesion } from "@/server/auth/autorizacion";
import { manejarError } from "@/server/errores";

export async function GET() {
  try {
    const sesion = await requerirSesion();
    const usuario = await prisma.usuario.findUniqueOrThrow({
      where: { id: sesion.usuarioId },
      select: {
        id: true, nombre: true, email: true, rol: true, ultimoAcceso: true,
        sucursal: { select: { id: true, codigo: true, nombre: true } },
      },
    });
    return NextResponse.json({ usuario });
  } catch (e) {
    return manejarError(e);
  }
}
