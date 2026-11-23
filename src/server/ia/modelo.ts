// ============================================================
// CeibaERP - Acceso al modelo de lenguaje (docs/07-IAG seccion 2)
// La aplicacion habla con una interfaz ModeloIA; la implementacion real usa
// Gemini con @google/genai y las pruebas usan un modelo simulado.
// Gemini 3+: sin temperature/top_p/top_k; se usa el nivel de razonamiento.
// ============================================================
import {
  ApiError, FunctionCallingConfigMode, GoogleGenAI, ThinkingLevel,
  type Content, type FunctionCall, type FunctionDeclaration, type Part,
} from "@google/genai";
import { ErrorApi } from "@/server/errores";

export type { Content, FunctionCall, FunctionDeclaration, Part };

export type NivelRazonamiento = "bajo" | "medio";

export type SolicitudModelo = {
  sistema: string;
  contenidos: Content[];
  herramientas: FunctionDeclaration[];
  nivel: NivelRazonamiento;
  /** "ninguna" obliga a responder con texto (ultima ronda). */
  modoHerramientas?: "auto" | "ninguna";
  /** Respuesta JSON validable (agentes, Fase 7). */
  esquemaRespuesta?: unknown;
  /** Tiempo limite de la llamada; por defecto 30 s (los agentes usan mas). */
  tiempoLimiteMs?: number;
};

export type RespuestaModelo = {
  /** Contenido del modelo tal como llego (conserva las firmas de razonamiento). */
  contenido: Content;
  llamadas: FunctionCall[];
  texto: string;
  /** Modelo que respondio (el principal o el de respaldo). */
  modelo?: string;
};

export interface ModeloIA {
  readonly nombre: string;
  generar(s: SolicitudModelo): Promise<RespuestaModelo>;
}

const TIEMPO_LIMITE_MS = 30_000;
/** Tras una falla del principal, el respaldo va primero durante este tiempo (docs/07-IAG seccion 8). */
export const PAUSA_PRINCIPAL_MS = 60_000;
/** Con la cuota diaria agotada, el principal se aparta como maximo este tiempo (luego se vuelve a probar). */
export const PAUSA_MAXIMA_CUOTA_MS = 6 * 3_600_000;

/** Tipo de falla del proveedor: decide si se reintenta el mismo modelo o se pasa al siguiente. */
export type FallaModelo = "cuota" | "tiempo" | "sobrecarga" | "otra";

export function clasificarFalla(e: unknown): FallaModelo {
  const estado = e instanceof ApiError ? e.status : null;
  const mensaje = e instanceof Error ? e.message : String(e ?? "");
  if (estado === 429 || /RESOURCE_EXHAUSTED|exceeded your current quota|"code":\s*429/i.test(mensaje)) return "cuota";
  if (estado === 504 || /DEADLINE_EXCEEDED|timeout|timed out|aborted|"code":\s*504/i.test(mensaje)) return "tiempo";
  if ((estado !== null && estado >= 500) || /UNAVAILABLE|high demand|overloaded|ECONNRESET|fetch failed|"code":\s*5\d\d/i.test(mensaje)) return "sobrecarga";
  return "otra";
}

/**
 * Para el registro del servidor: que limite de la cuota se agoto (por minuto o por dia)
 * y en cuanto tiempo sugiere reintentar el proveedor. No incluye datos de la solicitud.
 */
export function detalleCuota(e: unknown): string {
  const mensaje = e instanceof Error ? e.message : "";
  const limite = /"quotaId":\s*"([^"]+)"/.exec(mensaje)?.[1];
  const espera = /"retryDelay":\s*"([^"]+)"/.exec(mensaje)?.[1] ?? /retry in ([\d.]+s)/i.exec(mensaje)?.[1];
  return [limite && `limite ${limite}`, espera && `reintentar en ${espera}`].filter(Boolean).map((t) => `, ${t}`).join("");
}

/** Espera sugerida por el proveedor en un 429 (retryDelay), en milisegundos; null si no la indica. */
export function esperaSugeridaMs(e: unknown): number | null {
  const mensaje = e instanceof Error ? e.message : "";
  const s = /"retryDelay":\s*"([\d.]+)s"/.exec(mensaje)?.[1] ?? /retry in ([\d.]+)s/i.exec(mensaje)?.[1];
  return s ? Math.round(Number(s) * 1000) : null;
}

/** Errores que justifican otro intento: cuota, sobrecarga (503) o tiempo agotado. */
export function reintentable(e: unknown): boolean {
  return clasificarFalla(e) !== "otra";
}

/**
 * docs/07-IAG seccion 8. Cada modelo de la lista tiene dos intentos ante sobrecarga
 * momentanea (503), con una espera corta entre ambos; con la cuota agotada (429) o un
 * tiempo agotado (504) se pasa de inmediato al siguiente, porque repetir solo alarga la
 * espera. Un error no reintentable (p. ej. clave invalida o modelo inexistente) corta.
 */
export async function intentarConRespaldo<T>(
  modelos: string[],
  intentar: (modelo: string) => Promise<T>,
  esperar: (ms: number) => Promise<void> = (ms) => new Promise((ok) => setTimeout(ok, ms)),
  alFallar?: (modelo: string, falla: FallaModelo, error: unknown) => void,
): Promise<{ resultado: T; modelo: string }> {
  let ultimo: unknown = null;
  for (const [i, modelo] of modelos.entries()) {
    const intentos = 2;
    const hayOtro = i < modelos.length - 1;
    for (let n = 1; n <= intentos; n++) {
      try {
        return { resultado: await intentar(modelo), modelo };
      } catch (e) {
        ultimo = e;
        const falla = clasificarFalla(e);
        console.error(`[ia] ${modelo} (intento ${n}, ${falla}${detalleCuota(e)}):`, e instanceof Error ? e.message.slice(0, 160) : e);
        alFallar?.(modelo, falla, e);
        if (falla === "otra") throw e;
        if (falla === "cuota" || (falla === "tiempo" && hayOtro)) break;
        if (n < intentos) await esperar(2000 + i * 1000);
      }
    }
  }
  throw ultimo;
}

/**
 * Orden de los modelos para cada llamada: el principal y luego los de respaldo, en el orden
 * configurado. Si el principal fallo y respondio un respaldo, durante PAUSA_PRINCIPAL_MS los
 * respaldos van primero: asi las rondas siguientes de la misma pregunta (y las preguntas
 * inmediatas) no vuelven a esperar al principal saturado. Si el principal agoto su cuota
 * diaria, la pausa dura lo que sugiere el proveedor (maximo PAUSA_MAXIMA_CUOTA_MS).
 */
export class SelectorModelos {
  private pausaHasta = 0;
  readonly respaldos: string[];
  constructor(
    readonly principal: string,
    respaldo: string | readonly string[] | null,
    private readonly reloj: () => number = Date.now,
  ) {
    const lista = typeof respaldo === "string" ? respaldo.split(",") : respaldo ?? [];
    this.respaldos = [...new Set(lista.map((m) => m.trim()).filter((m) => m && m !== principal))];
  }

  orden(): string[] {
    if (this.respaldos.length === 0) return [this.principal];
    return this.reloj() < this.pausaHasta ? [...this.respaldos, this.principal] : [this.principal, ...this.respaldos];
  }

  /** Registra que modelo respondio para el orden usado. */
  registrar(orden: string[], modelo: string) {
    if (orden[0] === this.principal && modelo !== this.principal) this.pausar(PAUSA_PRINCIPAL_MS);
  }

  /** Registra la falla de un modelo: si es la cuota del principal, lo aparta lo que indique el proveedor. */
  registrarFalla(modelo: string, falla: FallaModelo, error: unknown) {
    if (modelo !== this.principal || falla !== "cuota" || this.respaldos.length === 0) return;
    this.pausar(Math.min(Math.max(esperaSugeridaMs(error) ?? PAUSA_PRINCIPAL_MS, PAUSA_PRINCIPAL_MS), PAUSA_MAXIMA_CUOTA_MS));
  }

  private pausar(ms: number) {
    this.pausaHasta = Math.max(this.pausaHasta, this.reloj() + ms);
  }
}

export class ModeloGemini implements ModeloIA {
  private cliente: GoogleGenAI;
  private selector: SelectorModelos;
  constructor(apiKey: string, readonly nombre: string, respaldo: string | readonly string[] | null = null) {
    this.cliente = new GoogleGenAI({ apiKey });
    this.selector = new SelectorModelos(nombre, respaldo);
  }

  async generar(s: SolicitudModelo): Promise<RespuestaModelo> {
    const config = {
      systemInstruction: s.sistema,
      thinkingConfig: { thinkingLevel: s.nivel === "bajo" ? ThinkingLevel.LOW : ThinkingLevel.MEDIUM },
      httpOptions: { timeout: s.tiempoLimiteMs ?? TIEMPO_LIMITE_MS },
      ...(s.herramientas.length
        ? {
            tools: [{ functionDeclarations: s.herramientas }],
            toolConfig: {
              functionCallingConfig: { mode: s.modoHerramientas === "ninguna" ? FunctionCallingConfigMode.NONE : FunctionCallingConfigMode.AUTO },
            },
            automaticFunctionCalling: { disable: true },
          }
        : {}),
      ...(s.esquemaRespuesta ? { responseMimeType: "application/json", responseJsonSchema: s.esquemaRespuesta } : {}),
    };

    const modelos = this.selector.orden();
    try {
      const { resultado: r, modelo } = await intentarConRespaldo(modelos, (model) =>
        this.cliente.models.generateContent({ model, contents: s.contenidos, config }), undefined,
      (m, falla, e) => this.selector.registrarFalla(m, falla, e));
      this.selector.registrar(modelos, modelo);
      const contenido: Content = r.candidates?.[0]?.content ?? { role: "model", parts: [] };
      // El texto se arma con las partes de texto (sin el razonamiento); asi se evita el aviso
      // de la libreria cuando la respuesta trae llamadas a funciones junto con texto.
      const texto = (contenido.parts ?? []).filter((p) => p.text && !p.thought).map((p) => p.text).join("");
      return { contenido, llamadas: r.functionCalls ?? [], texto, modelo };
    } catch {
      throw new ErrorApi(503, "IA_NO_DISPONIBLE",
        "El servicio de inteligencia artificial está saturado o no disponible en este momento. Intente de nuevo en unos minutos; el resto del sistema sigue funcionando.");
    }
  }
}

let modeloPorDefecto: ModeloIA | null = null;

/**
 * Modelo configurado en GEMINI_API_KEY, GEMINI_MODEL y, opcional, GEMINI_MODEL_RESPALDO
 * (uno o varios modelos separados por comas, en orden de preferencia). Sin clave responde 503 (PRU-C11).
 */
export function obtenerModelo(): ModeloIA {
  if (modeloPorDefecto) return modeloPorDefecto;
  const clave = process.env.GEMINI_API_KEY;
  const nombre = process.env.GEMINI_MODEL;
  if (!clave || !nombre) {
    throw new ErrorApi(503, "IA_NO_CONFIGURADA", "El asistente de IA no está configurado en este servidor. El resto del sistema sigue funcionando.");
  }
  modeloPorDefecto = new ModeloGemini(clave, nombre, process.env.GEMINI_MODEL_RESPALDO?.trim() || null);
  return modeloPorDefecto;
}
