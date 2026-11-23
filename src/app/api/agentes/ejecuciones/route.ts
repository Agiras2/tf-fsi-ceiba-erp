// GET /api/agentes/ejecuciones?agente=&estado=&pagina= - historial de ejecuciones (RF-41)
import { NextResponse, type NextRequest } from "next/server";
import { contexto } from "@/server/http/rutas-crud";
import { manejarError } from "@/server/errores";
import { servicioAgentes } from "@/server/servicios/agentes";
import { PERMISOS_AGENTES } from "@/lib/permisos";

export async function GET(req: NextRequest) {
  try {
    await contexto(PERMISOS_AGENTES.leer, req);
    return NextResponse.json(await servicioAgentes.listar(req.nextUrl.searchParams));
  } catch (e) {
    return manejarError(e);
  }
}
