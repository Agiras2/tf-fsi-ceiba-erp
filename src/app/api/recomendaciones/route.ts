// GET /api/recomendaciones?estado=&tipo=&prioridad=&q=&pagina= - recomendaciones de los agentes (RF-40)
import { NextResponse, type NextRequest } from "next/server";
import { contexto } from "@/server/http/rutas-crud";
import { manejarError } from "@/server/errores";
import { servicioRecomendaciones } from "@/server/servicios/recomendaciones";
import { PERMISOS_RECOMENDACIONES } from "@/lib/permisos";

export async function GET(req: NextRequest) {
  try {
    await contexto(PERMISOS_RECOMENDACIONES.leer, req);
    return NextResponse.json(await servicioRecomendaciones.listar(req.nextUrl.searchParams));
  } catch (e) {
    return manejarError(e);
  }
}
