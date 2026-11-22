// GET /api/reportes/inventario-bajo-minimo.csv - inventario agotado o bajo minimo (RF-30). Bodega: su sucursal
import type { NextRequest } from "next/server";
import { contexto } from "@/server/http/rutas-crud";
import { manejarError } from "@/server/errores";
import { respuestaCsv } from "@/server/csv";
import { sucursalPermitida } from "@/server/auth/autorizacion";
import { filtroId } from "@/server/servicios/comun";
import { reporteInventarioCritico } from "@/server/servicios/reportes";
import { PERMISOS_REPORTES } from "@/lib/permisos";

export async function GET(req: NextRequest) {
  try {
    const ctx = await contexto(PERMISOS_REPORTES.inventario, req);
    const p = req.nextUrl.searchParams;
    const archivo = await reporteInventarioCritico({
      sucursalId: sucursalPermitida(ctx.sesion, filtroId(p, "sucursalId")),
      categoriaId: filtroId(p, "categoriaId") ?? null,
    }, ctx);
    return respuestaCsv(archivo.nombre, archivo.contenido);
  } catch (e) {
    return manejarError(e);
  }
}
