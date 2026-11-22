// /api/ventas - listar (GET, RF-17) y registrar (POST, RF-16). Permisos en src/lib/permisos.ts
import { NextResponse, type NextRequest } from "next/server";
import { contexto, leerCuerpo } from "@/server/http/rutas-crud";
import { manejarError } from "@/server/errores";
import { servicioVentas } from "@/server/servicios/ventas";
import { PERMISOS_VENTAS } from "@/lib/permisos";

export async function GET(req: NextRequest) {
  try {
    const ctx = await contexto(PERMISOS_VENTAS.leer, req);
    return NextResponse.json(await servicioVentas.listar(req.nextUrl.searchParams, ctx));
  } catch (e) {
    return manejarError(e);
  }
}

export async function POST(req: NextRequest) {
  try {
    const ctx = await contexto(PERMISOS_VENTAS.registrar, req);
    return NextResponse.json(await servicioVentas.registrar(await leerCuerpo(req), ctx), { status: 201 });
  } catch (e) {
    return manejarError(e);
  }
}
