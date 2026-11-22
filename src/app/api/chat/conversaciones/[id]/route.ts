// GET /api/chat/conversaciones/{id} - mensajes de una conversacion propia; ajena = 404 (RF-35)
import { NextResponse, type NextRequest } from "next/server";
import { contexto, leerId } from "@/server/http/rutas-crud";
import { manejarError } from "@/server/errores";
import { servicioChat } from "@/server/servicios/chat";
import { ROLES } from "@/lib/navegacion";

export async function GET(req: NextRequest, rc: { params: Promise<{ id: string }> }) {
  try {
    const ctx = await contexto(ROLES, req);
    return NextResponse.json(await servicioChat.obtener(await leerId(rc), ctx));
  } catch (e) {
    return manejarError(e);
  }
}
