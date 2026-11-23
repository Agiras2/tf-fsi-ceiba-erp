// GET /api/recomendaciones/{id} - detalle de una recomendacion (RF-40)
import { NextResponse, type NextRequest } from "next/server";
import { contexto, leerId } from "@/server/http/rutas-crud";
import { manejarError } from "@/server/errores";
import { servicioRecomendaciones } from "@/server/servicios/recomendaciones";
import { PERMISOS_RECOMENDACIONES } from "@/lib/permisos";

export async function GET(req: NextRequest, rc: { params: Promise<{ id: string }> }) {
  try {
    await contexto(PERMISOS_RECOMENDACIONES.leer, req);
    return NextResponse.json(await servicioRecomendaciones.obtener(await leerId(rc)));
  } catch (e) {
    return manejarError(e);
  }
}
