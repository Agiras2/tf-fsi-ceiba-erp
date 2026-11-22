// GET /api/ventas/{id} - detalle de una venta (RF-17). Otra sucursal = 404 (RN-05)
import { NextResponse, type NextRequest } from "next/server";
import { contexto, leerId } from "@/server/http/rutas-crud";
import { manejarError } from "@/server/errores";
import { servicioVentas } from "@/server/servicios/ventas";
import { PERMISOS_VENTAS } from "@/lib/permisos";

export async function GET(req: NextRequest, rc: { params: Promise<{ id: string }> }) {
  try {
    const ctx = await contexto(PERMISOS_VENTAS.leer, req);
    return NextResponse.json(await servicioVentas.obtener(await leerId(rc), ctx));
  } catch (e) {
    return manejarError(e);
  }
}
