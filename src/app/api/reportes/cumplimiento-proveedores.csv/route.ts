// GET /api/reportes/cumplimiento-proveedores.csv - entregas por proveedor en el periodo (RF-30, KPI-06)
import type { NextRequest } from "next/server";
import { contexto } from "@/server/http/rutas-crud";
import { manejarError } from "@/server/errores";
import { respuestaCsv } from "@/server/csv";
import { leerFiltros } from "@/server/servicios/kpi";
import { reporteCumplimiento } from "@/server/servicios/reportes";
import { PERMISOS_REPORTES } from "@/lib/permisos";

export async function GET(req: NextRequest) {
  try {
    const ctx = await contexto(PERMISOS_REPORTES.proveedores, req);
    const archivo = await reporteCumplimiento(leerFiltros(req.nextUrl.searchParams, ctx), ctx);
    return respuestaCsv(archivo.nombre, archivo.contenido);
  } catch (e) {
    return manejarError(e);
  }
}
