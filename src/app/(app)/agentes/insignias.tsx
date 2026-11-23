import { Bot } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { formatoFechaHora } from "@/lib/formato";
import {
  ETIQUETA_ESTADO_EJECUCION, ETIQUETA_ESTADO_RECOMENDACION, ETIQUETA_PRIORIDAD, ETIQUETA_TIPO_RECOMENDACION,
  type EstadoEjecucion, type EstadoRecomendacion, type Prioridad, type TipoRecomendacion,
} from "@/lib/esquemas/agentes";

const COLOR_EJECUCION: Record<EstadoEjecucion, string> = {
  EN_CURSO: "border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-900 dark:bg-sky-950 dark:text-sky-300",
  COMPLETADA: "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-300",
  FALLIDA: "border-red-200 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300",
};

export function InsigniaEjecucion({ estado }: { estado: EstadoEjecucion }) {
  return <Badge variant="outline" className={cn(COLOR_EJECUCION[estado])}>{ETIQUETA_ESTADO_EJECUCION[estado]}</Badge>;
}

const COLOR_PRIORIDAD: Record<Prioridad, string> = {
  ALTA: "border-red-200 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300",
  MEDIA: "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-200",
  BAJA: "border-slate-300 bg-slate-50 text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300",
};

export function InsigniaPrioridad({ prioridad }: { prioridad: Prioridad }) {
  return <Badge variant="outline" className={cn(COLOR_PRIORIDAD[prioridad])}>{ETIQUETA_PRIORIDAD[prioridad]}</Badge>;
}

export function InsigniaTipo({ tipo }: { tipo: TipoRecomendacion }) {
  return <Badge variant="secondary">{ETIQUETA_TIPO_RECOMENDACION[tipo]}</Badge>;
}

const COLOR_RECOMENDACION: Record<EstadoRecomendacion, string> = {
  PENDIENTE: "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-200",
  ACEPTADA: "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-300",
  DESCARTADA: "border-slate-300 bg-slate-50 text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400",
};

export function InsigniaRecomendacion({ estado }: { estado: EstadoRecomendacion }) {
  return <Badge variant="outline" className={cn(COLOR_RECOMENDACION[estado])}>{ETIQUETA_ESTADO_RECOMENDACION[estado]}</Badge>;
}

/** RNF-08: toda salida de IA lleva etiqueta, modelo y fecha. */
export function EtiquetaIA({ modelo, fecha, texto = "Generado por IA" }: { modelo: string | null; fecha: string | null; texto?: string }) {
  return (
    <span className="inline-flex items-center gap-1 text-[11px] font-medium text-violet-700 dark:text-violet-300">
      <Bot className="size-3.5" aria-hidden />
      {texto} · Gemini ({modelo ?? "modelo"}) · {formatoFechaHora(fecha)}
    </span>
  );
}

export function duracion(ms: number | null): string {
  if (ms === null) return "—";
  if (ms < 1000) return `${ms} ms`;
  const s = Math.round(ms / 100) / 10;
  return s < 60 ? `${s.toLocaleString("es-CO")} s` : `${Math.floor(s / 60)} min ${Math.round(s % 60)} s`;
}
