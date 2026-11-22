// PATCH /api/inventario/{id} - stock minimo y maximo (RF-13, RN-13)
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { contexto, leerCuerpo, leerId } from "@/server/http/rutas-crud";
import { manejarError } from "@/server/errores";
import { servicioInventario } from "@/server/servicios/inventario";
import { PERMISOS_INVENTARIO } from "@/lib/permisos";

export async function PATCH(req: NextRequest, rc: { params: Promise<{ id: string }> }) {
  try {
    const ctx = await contexto(PERMISOS_INVENTARIO.umbrales, req);
    return NextResponse.json(await servicioInventario.actualizarUmbrales(await leerId(rc), await leerCuerpo(req), ctx));
  } catch (e) {
    return manejarError(e);
  }
}
