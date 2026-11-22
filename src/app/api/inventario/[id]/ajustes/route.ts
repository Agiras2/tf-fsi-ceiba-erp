// POST /api/inventario/{id}/ajustes - ajuste de entrada o salida con motivo (RF-14, RN-01, RN-11)
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { contexto, leerCuerpo, leerId } from "@/server/http/rutas-crud";
import { manejarError } from "@/server/errores";
import { servicioInventario } from "@/server/servicios/inventario";
import { PERMISOS_INVENTARIO } from "@/lib/permisos";

export async function POST(req: NextRequest, rc: { params: Promise<{ id: string }> }) {
  try {
    const ctx = await contexto(PERMISOS_INVENTARIO.ajustar, req);
    return NextResponse.json(await servicioInventario.ajustar(await leerId(rc), await leerCuerpo(req), ctx), { status: 201 });
  } catch (e) {
    return manejarError(e);
  }
}
