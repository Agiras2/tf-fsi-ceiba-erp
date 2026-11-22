// /api/ordenes-compra/{id} - detalle (GET, RF-23) y edicion del borrador (PATCH, RF-20)
import { NextResponse, type NextRequest } from "next/server";
import { contexto, leerCuerpo, leerId } from "@/server/http/rutas-crud";
import { manejarError } from "@/server/errores";
import { servicioCompras } from "@/server/servicios/compras";
import { PERMISOS_COMPRAS } from "@/lib/permisos";

type Ruta = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, rc: Ruta) {
  try {
    const ctx = await contexto(PERMISOS_COMPRAS.leer, req);
    return NextResponse.json(await servicioCompras.obtener(await leerId(rc), ctx));
  } catch (e) {
    return manejarError(e);
  }
}

export async function PATCH(req: NextRequest, rc: Ruta) {
  try {
    const ctx = await contexto(PERMISOS_COMPRAS.editar, req);
    return NextResponse.json(await servicioCompras.actualizar(await leerId(rc), await leerCuerpo(req), ctx));
  } catch (e) {
    return manejarError(e);
  }
}
