// /api/ordenes-compra - listar (GET, RF-23) y crear borrador (POST, RF-19). Permisos en src/lib/permisos.ts
import { NextResponse, type NextRequest } from "next/server";
import { contexto, leerCuerpo } from "@/server/http/rutas-crud";
import { manejarError } from "@/server/errores";
import { servicioCompras } from "@/server/servicios/compras";
import { PERMISOS_COMPRAS } from "@/lib/permisos";

export async function GET(req: NextRequest) {
  try {
    const ctx = await contexto(PERMISOS_COMPRAS.leer, req);
    return NextResponse.json(await servicioCompras.listar(req.nextUrl.searchParams, ctx));
  } catch (e) {
    return manejarError(e);
  }
}

export async function POST(req: NextRequest) {
  try {
    const ctx = await contexto(PERMISOS_COMPRAS.crear, req);
    return NextResponse.json(await servicioCompras.crear(await leerCuerpo(req), ctx), { status: 201 });
  } catch (e) {
    return manejarError(e);
  }
}
