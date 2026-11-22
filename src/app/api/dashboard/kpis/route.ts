// GET /api/dashboard/kpis - los ocho KPI con variacion, semaforo e interpretacion (RF-24, RF-26, RF-27)
import { NextResponse, type NextRequest } from "next/server";
import { contexto } from "@/server/http/rutas-crud";
import { manejarError } from "@/server/errores";
import { consultarKpis, leerFiltros } from "@/server/servicios/kpi";
import { PERMISOS_DASHBOARD } from "@/lib/permisos";

export async function GET(req: NextRequest) {
  try {
    const ctx = await contexto(PERMISOS_DASHBOARD.kpis, req);
    return NextResponse.json(await consultarKpis(leerFiltros(req.nextUrl.searchParams, ctx)));
  } catch (e) {
    return manejarError(e);
  }
}
