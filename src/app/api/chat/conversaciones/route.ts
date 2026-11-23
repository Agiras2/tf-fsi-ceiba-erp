// GET /api/chat/conversaciones - conversaciones propias (RF-35)
import { NextResponse, type NextRequest } from "next/server";
import { contexto } from "@/server/http/rutas-crud";
import { manejarError } from "@/server/errores";
import { servicioChat } from "@/server/servicios/chat";
import { ROLES } from "@/lib/navegacion";

export async function GET(req: NextRequest) {
  try {
    const ctx = await contexto(ROLES, req);
    return NextResponse.json(await servicioChat.listar(ctx));
  } catch (e) {
    return manejarError(e);
  }
}
