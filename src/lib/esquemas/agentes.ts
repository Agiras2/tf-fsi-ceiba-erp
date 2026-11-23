// ============================================================
// CeibaERP - Esquemas y etiquetas de los agentes de IA y las recomendaciones
// (docs/04-REQ RF-36 a RF-41, RN-09 y RN-18; docs/07-IAG secciones 5 a 7).
// Compartido por cliente y servidor.
// ============================================================
import { z } from "@/lib/zod";
import { IDS_KPI } from "@/lib/kpi";
import { fecha, id, texto, textoOpcional } from "./comunes";
import { diasDelPeriodo, MAX_DIAS_PERIODO } from "./kpi";

export const AGENTES = ["INVENTARIO", "COMERCIAL", "INFORME_EJECUTIVO"] as const;
export type Agente = (typeof AGENTES)[number];

export const ETIQUETA_AGENTE: Record<Agente, string> = {
  INVENTARIO: "Analista de inventario",
  COMERCIAL: "Analista comercial",
  INFORME_EJECUTIVO: "Informe ejecutivo",
};

export const ESTADOS_EJECUCION = ["EN_CURSO", "COMPLETADA", "FALLIDA"] as const;
export type EstadoEjecucion = (typeof ESTADOS_EJECUCION)[number];

export const ETIQUETA_ESTADO_EJECUCION: Record<EstadoEjecucion, string> = {
  EN_CURSO: "En curso",
  COMPLETADA: "Completada",
  FALLIDA: "Fallida",
};

export const PRIORIDADES = ["ALTA", "MEDIA", "BAJA"] as const;
export type Prioridad = (typeof PRIORIDADES)[number];

export const ETIQUETA_PRIORIDAD: Record<Prioridad, string> = { ALTA: "Alta", MEDIA: "Media", BAJA: "Baja" };

export const TIPOS_RECOMENDACION = ["REPOSICION", "PROMOCION", "LIQUIDACION", "REVISION_SUCURSAL", "OTRA"] as const;
export type TipoRecomendacion = (typeof TIPOS_RECOMENDACION)[number];

export const ETIQUETA_TIPO_RECOMENDACION: Record<TipoRecomendacion, string> = {
  REPOSICION: "Reposición",
  PROMOCION: "Promoción",
  LIQUIDACION: "Liquidación",
  REVISION_SUCURSAL: "Revisión de sucursal",
  OTRA: "Alerta",
};

export const ESTADOS_RECOMENDACION = ["PENDIENTE", "ACEPTADA", "DESCARTADA"] as const;
export type EstadoRecomendacion = (typeof ESTADOS_RECOMENDACION)[number];

export const ETIQUETA_ESTADO_RECOMENDACION: Record<EstadoRecomendacion, string> = {
  PENDIENTE: "Pendiente",
  ACEPTADA: "Aceptada",
  DESCARTADA: "Descartada",
};

/** KPI y graficos del dashboard que un hallazgo del Agente 2 puede citar (docs/06-KPI). */
export const REFERENCIAS_DASHBOARD = [...IDS_KPI, "G-01", "G-02", "G-03", "G-04"] as const;
export type ReferenciaDashboard = (typeof REFERENCIAS_DASHBOARD)[number];

export const ETIQUETA_GRAFICO: Record<"G-01" | "G-02" | "G-03" | "G-04", string> = {
  "G-01": "Ventas diarias",
  "G-02": "Ventas por sucursal",
  "G-03": "Productos más vendidos",
  "G-04": "Inventario por sucursal",
};

// ------------------------------------------------------------
// Entradas de la API
// ------------------------------------------------------------

const periodoOpcional = {
  desde: fecha.optional(),
  hasta: fecha.optional(),
};

function periodoCoherente<T extends { desde?: string; hasta?: string }>(d: T) {
  if (!d.desde || !d.hasta) return true;
  return d.desde <= d.hasta && diasDelPeriodo({ desde: d.desde, hasta: d.hasta }) <= MAX_DIAS_PERIODO;
}
const mensajePeriodo = { message: `Periodo no válido: la fecha inicial debe ser anterior o igual a la final y abarcar máximo ${MAX_DIAS_PERIODO} días.`, path: ["hasta"] };

/** RF-36: el Agente 1 recibe una sucursal opcional. */
export const esquemaEntradaInventario = z.object({ sucursalId: id.nullable().optional() }).strict();

/** RF-38: el Agente 2 recibe periodo, sucursal y la ejecucion del Agente 1 que debe considerar (todo opcional). */
export const esquemaEntradaComercial = z
  .object({ ...periodoOpcional, sucursalId: id.nullable().optional(), ejecucionInventarioId: id.nullable().optional() })
  .strict()
  .refine(periodoCoherente, mensajePeriodo);

/** RF-39: el informe ejecutivo encadena ambos agentes con la misma sucursal y periodo. */
export const esquemaEntradaInforme = z
  .object({ ...periodoOpcional, sucursalId: id.nullable().optional() })
  .strict()
  .refine(periodoCoherente, mensajePeriodo);

/** RF-40: aceptar admite un comentario; descartar lo exige. */
export const esquemaAceptarRecomendacion = z.object({ comentario: textoOpcional(300) }).strict();
export const esquemaDescartarRecomendacion = z.object({ comentario: texto(5, 300) }).strict();

// ------------------------------------------------------------
// Salidas del modelo (docs/07-IAG 5.3 y 6.3), validadas con Zod en el servidor.
// Los textos demasiado largos se recortan en lugar de invalidar toda la salida.
// ------------------------------------------------------------

const textoIA = (max: number) =>
  z.string().trim().min(1).transform((s) => (s.length > max ? `${s.slice(0, max - 1)}…` : s));

export const esquemaSalidaInventario = z.object({
  resumen: textoIA(1500).describe("Resumen ejecutivo de la propuesta de reposición, en 2 a 4 frases."),
  criterios: z.array(textoIA(300)).min(1).max(8).describe("Criterios de priorización aplicados, uno por elemento."),
  items: z
    .array(
      z.object({
        candidatoId: z.string().trim().max(40).describe("Identificador del candidato, tal como lo devolvió calcularPropuestaReposicion."),
        incluir: z.boolean().describe("false para excluir el candidato de la propuesta."),
        prioridad: z.enum(PRIORIDADES).describe("Prioridad propuesta; solo puede subir respecto a la prioridad base."),
        justificacion: textoIA(400).describe("Razón de la exclusión o del cambio de prioridad."),
      }),
    )
    .max(200)
    .describe("Solo los candidatos que se excluyen o cuya prioridad sube. Los demás se incluyen con su prioridad base."),
  alertas: z
    .array(
      z.object({
        titulo: textoIA(150),
        justificacion: textoIA(600),
        proveedor: z.string().trim().max(120).optional().describe("Nombre del proveedor relacionado, si aplica."),
      }),
    )
    .max(6)
    .describe("Situaciones que requieren atención del gerente (por ejemplo, un proveedor impuntual)."),
});
export type SalidaInventario = z.infer<typeof esquemaSalidaInventario>;

export const TIPOS_RECOMENDACION_COMERCIAL = ["PROMOCION", "LIQUIDACION", "REVISION_SUCURSAL", "OTRA"] as const;

export const esquemaSalidaComercial = z.object({
  resumen: textoIA(1500).describe("Resumen ejecutivo del análisis comercial, en 2 a 4 frases."),
  hallazgos: z
    .array(
      z.object({
        titulo: textoIA(150),
        detalle: textoIA(600),
        kpiRelacionado: z.enum(REFERENCIAS_DASHBOARD).describe("KPI (KPI-01 a KPI-08) o gráfico (G-01 a G-04) del dashboard que respalda el hallazgo."),
        valor: textoIA(80).describe("Valor citado, tal como lo devolvió la herramienta (ej. \"$9.669.500\" o \"25,5 %\")."),
      }),
    )
    .min(1)
    .max(8),
  recomendaciones: z
    .array(
      z.object({
        tipo: z.enum(TIPOS_RECOMENDACION_COMERCIAL),
        prioridad: z.enum(PRIORIDADES),
        sku: z.string().trim().max(40).optional().describe("SKU del producto, si la recomendación es sobre un producto."),
        sucursal: z.string().trim().max(60).optional().describe("Nombre de la sucursal, si aplica."),
        titulo: textoIA(150),
        justificacion: textoIA(600),
      }),
    )
    .max(8),
});
export type SalidaComercial = z.infer<typeof esquemaSalidaComercial>;
