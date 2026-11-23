// Tipos de las respuestas de /api/agentes y /api/recomendaciones (docs/04-REQ seccion 4.7).
import type { FuenteConsultada } from "@/lib/esquemas/chat";
import type { Agente, EstadoEjecucion, EstadoRecomendacion, Prioridad, TipoRecomendacion } from "@/lib/esquemas/agentes";
import type { Pagina } from "@/lib/esquemas/comunes";
import type { EstadoOrden } from "@/lib/esquemas/compras";

export type AccionesAgentes = { ejecutar: boolean; decidir: boolean };
export type Opcion = { id: number; nombre: string };

export type FilaEjecucion = {
  id: number;
  agente: Agente;
  estado: EstadoEjecucion;
  resumen: string | null;
  modelo: string | null;
  duracionMs: number | null;
  error: string | null;
  fechaInicio: string;
  fechaFin: string | null;
  parametros: Record<string, unknown>;
  ejecucionPadreId: number | null;
  ejecucionEntradaId: number | null;
  ejecutadoPor: { nombre: string };
  ordenes: number;
  recomendaciones: number;
};

export type Recomendacion = {
  id: number;
  ejecucionId: number;
  tipo: TipoRecomendacion;
  prioridad: Prioridad;
  titulo: string;
  justificacion: string;
  estado: EstadoRecomendacion;
  comentarioDecision: string | null;
  fechaDecision: string | null;
  createdAt: string;
  producto: { sku: string; nombre: string } | null;
  sucursal: string | null;
  decididaPor: string | null;
  ejecucion?: { id: number; agente: Agente; modelo: string | null; fechaInicio: string };
};

export type RespuestaRecomendaciones = Pagina<Recomendacion> & { pendientes: number };

export type DecisionInventario = {
  candidatoId: string; sku: string; producto: string; sucursal: string; proveedor: string; cantidad: number;
  prioridad: Prioridad; prioridadBase: Prioridad; incluir: boolean; motivo: string; coberturaDias: number | null;
  justificacion: string; ajustadaPorIA: boolean;
};

export type ResultadoInventario = {
  alcance: string; diasSeguridad: number; resumen?: string; criterios?: string[]; decisiones: DecisionInventario[];
  ignorados?: string[]; ordenesFallidas?: { proveedor: string; sucursal: string; error: string }[];
  sinAnalisisIA?: boolean;
};

export type ResultadoComercial = {
  periodo: { desde: string; hasta: string }; alcance: string; ejecucionInventarioId: number | null; resumen?: string;
  hallazgos?: { titulo: string; detalle: string; kpiRelacionado: string; valor: string; valorSistema: string | null }[];
  descartadas?: { tipo: string; titulo: string; sku: string | null; sucursal: string | null; motivo: string }[];
};

export type ResultadoInforme = {
  periodo?: { desde: string; hasta: string }; alcance?: string; inventarioId: number | null; comercialId: number | null;
  ordenes?: number; alertas?: number; recomendaciones?: number; descartadas?: number; resumenGenerado?: "IA" | "plantilla";
};

export type Ejecucion = {
  id: number;
  agente: Agente;
  estado: EstadoEjecucion;
  parametros: Record<string, unknown>;
  herramientasUsadas: FuenteConsultada[];
  resultado: unknown;
  resumen: string | null;
  modelo: string | null;
  duracionMs: number | null;
  error: string | null;
  fechaInicio: string;
  fechaFin: string | null;
  ejecutadoPor: string;
  ejecucionPadre: { id: number; agente: Agente } | null;
  ejecucionEntrada: { id: number; agente: Agente; estado: EstadoEjecucion; fechaFin: string | null } | null;
  hijas: { id: number; agente: Agente; estado: EstadoEjecucion; resumen: string | null; modelo: string | null; duracionMs: number | null; error: string | null }[];
  ordenes: { id: number; estado: EstadoOrden; total: number | null; fechaEsperada: string; proveedor: string; sucursal: string; items: number }[];
  recomendaciones: Recomendacion[];
};
