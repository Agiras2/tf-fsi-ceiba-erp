// POST /api/agentes/inventario - ejecutar el Agente 1, analista de inventario { sucursalId? } (RF-36, RF-37)
import { NextResponse, type NextRequest } from "next/server";
import { contexto, leerCuerpoOpcional } from "@/server/http/rutas-crud";
import { manejarError } from "@/server/errores";
import { servicioAgentes } from "@/server/servicios/agentes";
import { PERMISOS_AGENTES } from "@/lib/permisos";

export async function POST(req: NextRequest) {
  try {
    const ctx = await contexto(PERMISOS_AGENTES.ejecutar, req);
    return NextResponse.json(await servicioAgentes.ejecutarInventario(await leerCuerpoOpcional(req), ctx));
  } catch (e) {
    return manejarError(e);
  }
}
