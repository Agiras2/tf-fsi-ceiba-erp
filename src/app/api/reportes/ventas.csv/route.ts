// GET /api/reportes/ventas.csv - ventas detalladas por item con los filtros del dashboard (RF-30)
import type { NextRequest } from "next/server";
import { contexto } from "@/server/http/rutas-crud";
import { manejarError } from "@/server/errores";
import { respuestaCsv } from "@/server/csv";
import { leerFiltros } from "@/server/servicios/kpi";
import { reporteVentas } from "@/server/servicios/reportes";
import { PERMISOS_REPORTES } from "@/lib/permisos";

export async function GET(req: NextRequest) {
  try {
    const ctx = await contexto(PERMISOS_REPORTES.ventas, req);
    const archivo = await reporteVentas(leerFiltros(req.nextUrl.searchParams, ctx), ctx);
    return respuestaCsv(archivo.nombre, archivo.contenido);
  } catch (e) {
    return manejarError(e);
  }
}
