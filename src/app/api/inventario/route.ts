// GET /api/inventario - existencias por sucursal con estado y resumen (RF-12)
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { contexto } from "@/server/http/rutas-crud";
import { manejarError } from "@/server/errores";
import { servicioInventario } from "@/server/servicios/inventario";
import { PERMISOS_INVENTARIO } from "@/lib/permisos";

export async function GET(req: NextRequest) {
  try {
    const ctx = await contexto(PERMISOS_INVENTARIO.leer, req);
    return NextResponse.json(await servicioInventario.listar(req.nextUrl.searchParams, ctx));
  } catch (e) {
    return manejarError(e);
  }
}
