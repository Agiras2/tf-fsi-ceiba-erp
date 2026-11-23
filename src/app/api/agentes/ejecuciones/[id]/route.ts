// GET /api/agentes/ejecuciones/{id} - entrada, herramientas usadas, salida, modelo, duracion y estado (RF-41)
import { NextResponse, type NextRequest } from "next/server";
import { contexto, leerId } from "@/server/http/rutas-crud";
import { manejarError } from "@/server/errores";
import { servicioAgentes } from "@/server/servicios/agentes";
import { PERMISOS_AGENTES } from "@/lib/permisos";

export async function GET(req: NextRequest, rc: { params: Promise<{ id: string }> }) {
  try {
    await contexto(PERMISOS_AGENTES.leer, req);
    return NextResponse.json(await servicioAgentes.obtener(await leerId(rc)));
  } catch (e) {
    return manejarError(e);
  }
}
