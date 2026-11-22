// GET /api/dashboard/graficos - series de G-01 a G-04 con los mismos filtros (RF-25, RF-26)
import { NextResponse, type NextRequest } from "next/server";
import { contexto } from "@/server/http/rutas-crud";
import { manejarError } from "@/server/errores";
import { graficos, leerFiltros } from "@/server/servicios/kpi";
import { PERMISOS_DASHBOARD } from "@/lib/permisos";

export async function GET(req: NextRequest) {
  try {
    const ctx = await contexto(PERMISOS_DASHBOARD.kpis, req);
    return NextResponse.json(await graficos(leerFiltros(req.nextUrl.searchParams, ctx)));
  } catch (e) {
    return manejarError(e);
  }
}
