// POST /api/chat - enviar un mensaje { conversacionId?, mensaje } al asistente (RF-31 a RF-35)
import { NextResponse, type NextRequest } from "next/server";
import { contexto, leerCuerpo } from "@/server/http/rutas-crud";
import { manejarError } from "@/server/errores";
import { servicioChat } from "@/server/servicios/chat";
import { ROLES } from "@/lib/navegacion";

export async function POST(req: NextRequest) {
  try {
    const ctx = await contexto(ROLES, req);
    return NextResponse.json(await servicioChat.enviar(await leerCuerpo(req), ctx));
  } catch (e) {
    return manejarError(e);
  }
}
