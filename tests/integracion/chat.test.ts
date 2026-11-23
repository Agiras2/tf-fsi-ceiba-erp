// PRU-I11 (docs/10-PRU seccion 3): el chatbot guarda la pregunta y la respuesta en una sola
// operacion, continua la conversacion y no deja ver conversaciones ajenas (RF-35).
// Usa un modelo simulado: no llama a Gemini.
import { beforeAll, describe, expect, it } from "vitest";
import { prisma } from "@/server/db";
import { servicioChat } from "@/server/servicios/chat";
import { crearEscenario, error, limpiar, ModeloCaido, ModeloSimulado, type Escenario } from "./datos";

let e: Escenario;

beforeAll(async () => {
  await limpiar();
  e = await crearEscenario();
});

describe("Chatbot con modelo simulado (RF-31 a RF-35)", () => {
  it("guarda pregunta y respuesta, continúa la conversación y la protege de otros usuarios", async () => {
    const modelo = new ModeloSimulado({
      herramientas: () => [{ name: "topProductos", args: {} }],
      texto: "Los productos más vendidos son...",
    });
    const r1 = await servicioChat.enviar({ mensaje: "¿Qué se vende más?" }, e.ctx.gerente, modelo);
    expect(r1.mensajes.map((m) => m.rol)).toEqual(["USUARIO", "ASISTENTE"]);
    expect(r1.mensajes[1].modelo).toBe("modelo-simulado");
    expect((r1.mensajes[1].herramientasUsadas as { herramienta: string }[]).map((h) => h.herramienta)).toEqual(["topProductos"]);

    const r2 = await servicioChat.enviar({ mensaje: "¿Y en Prueba Sur?", conversacionId: r1.conversacionId }, e.ctx.gerente, modelo);
    expect(r2.conversacionId).toBe(r1.conversacionId);
    expect(await prisma.mensajeChat.count({ where: { conversacionId: r1.conversacionId } })).toBe(4);

    expect((await error(servicioChat.obtener(r1.conversacionId, e.ctx.cajeroA))).status).toBe(404);
    expect((await error(servicioChat.enviar({ mensaje: "Hola", conversacionId: r1.conversacionId }, e.ctx.cajeroA, modelo))).status).toBe(404);
  });

  it("si la IA no responde, no guarda nada y responde 503", async () => {
    const antes = await prisma.mensajeChat.count();
    expect((await error(servicioChat.enviar({ mensaje: "¿Cómo vamos?" }, e.ctx.gerente, new ModeloCaido()))).status).toBe(503);
    expect(await prisma.mensajeChat.count()).toBe(antes);
  });
});
