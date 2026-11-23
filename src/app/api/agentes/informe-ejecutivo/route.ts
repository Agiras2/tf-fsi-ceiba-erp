// POST /api/agentes/informe-ejecutivo - Agente 1 y luego Agente 2 con el resultado del primero
// { desde?, hasta?, sucursalId? } (RF-39)
import { NextResponse, type NextRequest } from "next/server";
import { contexto, leerCuerpoOpcional } from "@/server/http/rutas-crud";
import { manejarError } from "@/server/errores";
import { servicioAgentes } from "@/server/servicios/agentes";
import { PERMISOS_AGENTES } from "@/lib/permisos";

export async function POST(req: NextRequest) {
  try {
    const ctx = await contexto(PERMISOS_AGENTES.ejecutar, req);
    return NextResponse.json(await servicioAgentes.ejecutarInforme(await leerCuerpoOpcional(req), ctx));
  } catch (e) {
    return manejarError(e);
  }
}
