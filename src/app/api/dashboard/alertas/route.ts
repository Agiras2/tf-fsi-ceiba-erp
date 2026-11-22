// GET /api/dashboard/alertas - productos agotados y bajo minimo (RF-28). Bodega: solo su sucursal (RN-05)
import { NextResponse, type NextRequest } from "next/server";
import { contexto } from "@/server/http/rutas-crud";
import { manejarError } from "@/server/errores";
import { sucursalPermitida } from "@/server/auth/autorizacion";
import { filtroId } from "@/server/servicios/comun";
import { alertasInventario } from "@/server/servicios/kpi";
import { PERMISOS_DASHBOARD } from "@/lib/permisos";

export async function GET(req: NextRequest) {
  try {
    const ctx = await contexto(PERMISOS_DASHBOARD.alertas, req);
    const p = req.nextUrl.searchParams;
    const datos = await alertasInventario({
      sucursalId: sucursalPermitida(ctx.sesion, filtroId(p, "sucursalId")),
      categoriaId: filtroId(p, "categoriaId") ?? null,
    });
    return NextResponse.json({
      datos,
      resumen: { agotados: datos.filter((a) => a.estado === "AGOTADO").length, bajoMinimo: datos.filter((a) => a.estado === "BAJO_MINIMO").length },
    });
  } catch (e) {
    return manejarError(e);
  }
}
