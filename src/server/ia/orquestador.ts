// ============================================================
// CeibaERP - Ciclo de llamadas a funciones (docs/07-IAG secciones 2 y 4.1)
// El modelo pide herramientas; el servidor las ejecuta con el contexto de
// la sesion y le devuelve los resultados, hasta un maximo de rondas. Cada
// respuesta de funcion lleva el id y el nombre de la llamada (Gemini 3+).
// ============================================================
import type { Contexto } from "@/server/servicios/comun";
import { declaracion, ejecutarHerramienta, type Herramienta, type LlamadaRegistrada } from "./herramientas";
import type { Content, ModeloIA, NivelRazonamiento, Part } from "./modelo";

export const MAX_RONDAS = 5;

export type ResultadoConversacion = { texto: string; llamadas: LlamadaRegistrada[]; rondas: number; modelo: string };

export async function conversarConHerramientas(opciones: {
  modelo: ModeloIA;
  sistema: string;
  contenidos: Content[];
  herramientas: Herramienta[];
  ctx: Contexto;
  nivel: NivelRazonamiento;
  maxRondas?: number;
  tiempoLimiteMs?: number;
}): Promise<ResultadoConversacion> {
  const { modelo, sistema, herramientas, ctx, nivel } = opciones;
  const maxRondas = opciones.maxRondas ?? MAX_RONDAS;
  const contenidos = [...opciones.contenidos];
  const declaraciones = herramientas.map(declaracion);
  const llamadas: LlamadaRegistrada[] = [];
  let usado = modelo.nombre;

  for (let ronda = 1; ; ronda++) {
    // En la ultima ronda se pide texto sin herramientas para garantizar una respuesta.
    const ultima = ronda > maxRondas;
    const r = await modelo.generar({
      sistema, contenidos, herramientas: declaraciones, nivel, modoHerramientas: ultima ? "ninguna" : "auto",
      tiempoLimiteMs: opciones.tiempoLimiteMs,
    });
    usado = r.modelo ?? usado;
    if (ultima || r.llamadas.length === 0) {
      return { texto: r.texto.trim(), llamadas, rondas: ronda, modelo: usado };
    }

    contenidos.push(r.contenido);
    const resultados = await Promise.all(
      r.llamadas.map((c) => ejecutarHerramienta(c.name ?? "", c.args, ctx, herramientas)),
    );
    const partes: Part[] = r.llamadas.map((c, i) => ({
      functionResponse: { id: c.id, name: c.name, response: resultados[i].respuesta },
    }));
    llamadas.push(...resultados.map((x) => x.registro));
    contenidos.push({ role: "user", parts: partes });
  }
}
