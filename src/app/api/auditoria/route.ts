// GET /api/auditoria - registro de operaciones con filtros (RF-05). Solo administrador.
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { contexto } from "@/server/http/rutas-crud";
import { manejarError } from "@/server/errores";
import { servicioAuditoria } from "@/server/servicios/auditoria";
import { PERMISOS_AUDITORIA } from "@/lib/permisos";

export async function GET(req: NextRequest) {
  try {
    await contexto(PERMISOS_AUDITORIA.leer, req);
    return NextResponse.json(await servicioAuditoria.listar(req.nextUrl.searchParams));
  } catch (e) {
    return manejarError(e);
  }
}
