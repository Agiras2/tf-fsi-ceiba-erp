// ============================================================
// GET /api/health - Estado del servicio (docs/04-REQ RF-42)
// Publico. No expone versiones ni datos internos.
// ============================================================
import { NextResponse } from "next/server";
import { prisma } from "@/server/db";

export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return NextResponse.json({ estado: "ok", baseDeDatos: "ok", fecha: new Date().toISOString() });
  } catch {
    return NextResponse.json({ estado: "degradado", baseDeDatos: "sin conexion" }, { status: 503 });
  }
}
