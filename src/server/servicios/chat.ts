// ============================================================
// CeibaERP - Servicio del chatbot (docs/04-REQ RF-31 a RF-35, docs/07-IAG seccion 4)
// Arma el contexto (instrucciones, ultimos 10 mensajes y herramientas del rol),
// ejecuta el ciclo de llamadas a funciones y guarda la pregunta y la respuesta
// con las herramientas usadas.
// ============================================================
import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/server/db";
import { ErrorApi, errores } from "@/server/errores";
import { esquemaMensajeChat, type FuenteConsultada, type MensajeChat } from "@/lib/esquemas/chat";
import { herramientasParaRol } from "@/server/ia/herramientas";
import { instruccionesChatbot } from "@/server/ia/instrucciones";
import { obtenerModelo, type Content, type ModeloIA } from "@/server/ia/modelo";
import { conversarConHerramientas } from "@/server/ia/orquestador";
import type { Contexto } from "./comun";

const MENSAJES_DE_CONTEXTO = 10;
const RESPUESTA_VACIA = "No pude generar una respuesta con los datos consultados. Intente reformular la pregunta.";

// Limite por usuario para cuidar la cuota gratuita de la API: 10 preguntas por minuto.
const LIMITE_POR_MINUTO = 10;
const historialUso = new Map<number, number[]>();

function controlarUso(usuarioId: number, ahora = Date.now()) {
  const recientes = (historialUso.get(usuarioId) ?? []).filter((t) => ahora - t < 60_000);
  if (recientes.length >= LIMITE_POR_MINUTO) {
    throw new ErrorApi(429, "DEMASIADAS_SOLICITUDES", "Ha enviado muchas preguntas en poco tiempo. Espere un minuto e intente de nuevo.");
  }
  recientes.push(ahora);
  historialUso.set(usuarioId, recientes);
}

function salidaMensaje(m: { id: number; rol: "USUARIO" | "ASISTENTE"; contenido: string; herramientasUsadas: unknown; modelo: string | null; createdAt: Date }): MensajeChat {
  return {
    id: m.id, rol: m.rol, contenido: m.contenido, modelo: m.modelo, createdAt: m.createdAt.toISOString(),
    herramientasUsadas: (m.herramientasUsadas as FuenteConsultada[] | null) ?? null,
  };
}

async function conversacionPropia(id: number, ctx: Contexto) {
  const c = await prisma.conversacion.findUnique({ where: { id }, select: { id: true, titulo: true, usuarioId: true } });
  // Una conversacion ajena responde 404, igual que una inexistente.
  if (!c || c.usuarioId !== ctx.sesion.usuarioId) throw errores.noEncontrado("La conversación");
  return c;
}

export const servicioChat = {
  /** RF-35: conversaciones propias, de la mas reciente a la mas antigua. */
  async listar(ctx: Contexto) {
    const filas = await prisma.conversacion.findMany({
      where: { usuarioId: ctx.sesion.usuarioId },
      select: {
        id: true, titulo: true, createdAt: true, _count: { select: { mensajes: true } },
        mensajes: { select: { createdAt: true }, orderBy: { id: "desc" }, take: 1 },
      },
      orderBy: { id: "desc" },
      take: 50,
    });
    return {
      datos: filas.map((c) => ({
        id: c.id, titulo: c.titulo, createdAt: c.createdAt.toISOString(), mensajes: c._count.mensajes,
        ultimoMensaje: c.mensajes[0]?.createdAt.toISOString() ?? null,
      })),
    };
  },

  async obtener(id: number, ctx: Contexto) {
    const c = await conversacionPropia(id, ctx);
    const mensajes = await prisma.mensajeChat.findMany({ where: { conversacionId: id }, orderBy: { id: "asc" } });
    return { id: c.id, titulo: c.titulo, mensajes: mensajes.map(salidaMensaje) };
  },

  /** RF-31 a RF-35: responde con herramientas de solo lectura y guarda el intercambio. */
  async enviar(entrada: unknown, ctx: Contexto, modelo?: ModeloIA) {
    const datos = esquemaMensajeChat.parse(entrada);
    const previa = datos.conversacionId ? await conversacionPropia(datos.conversacionId, ctx) : null;
    const ia = modelo ?? obtenerModelo();
    controlarUso(ctx.sesion.usuarioId);

    const historial = previa
      ? (await prisma.mensajeChat.findMany({
          where: { conversacionId: previa.id }, orderBy: { id: "desc" }, take: MENSAJES_DE_CONTEXTO,
          select: { rol: true, contenido: true },
        })).reverse()
      : [];
    const contenidos: Content[] = [
      ...historial.map((m) => ({ role: m.rol === "USUARIO" ? "user" : "model", parts: [{ text: m.contenido }] })),
      { role: "user", parts: [{ text: datos.mensaje }] },
    ];

    const r = await conversarConHerramientas({
      modelo: ia,
      sistema: instruccionesChatbot(ctx.sesion),
      contenidos,
      herramientas: herramientasParaRol(ctx.sesion.rol),
      ctx,
      nivel: "bajo",
    });
    const respuesta = r.texto || RESPUESTA_VACIA;

    // La pregunta y la respuesta se guardan juntas, y solo si el modelo respondio. Cada
    // caso es una sola instruccion atomica (sin transaccion interactiva): tras una espera
    // larga del modelo no hay que retener una conexion entre varias idas y vueltas (DEF-05).
    const nuevos = [
      { rol: "USUARIO" as const, contenido: datos.mensaje },
      {
        rol: "ASISTENTE" as const, contenido: respuesta, modelo: r.modelo,
        herramientasUsadas: r.llamadas as unknown as Prisma.InputJsonValue,
      },
    ];
    if (previa) {
      const creados = await prisma.mensajeChat.createManyAndReturn({
        data: nuevos.map((m) => ({ ...m, conversacionId: previa.id })),
      });
      return {
        conversacionId: previa.id,
        titulo: previa.titulo,
        mensajes: creados.sort((a, b) => a.id - b.id).map(salidaMensaje),
      };
    }
    const creada = await prisma.conversacion.create({
      data: {
        usuarioId: ctx.sesion.usuarioId,
        titulo: datos.mensaje.replace(/\s+/g, " ").slice(0, 80),
        mensajes: { create: nuevos },
      },
      select: { id: true, titulo: true, mensajes: { orderBy: { id: "asc" } } },
    });
    return { conversacionId: creada.id, titulo: creada.titulo, mensajes: creada.mensajes.map(salidaMensaje) };
  },
};
