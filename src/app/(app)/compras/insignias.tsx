import { Bot } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { ETIQUETA_ESTADO_ORDEN, ETIQUETA_ORIGEN_ORDEN, type EstadoOrden, type OrigenOrden } from "@/lib/esquemas/compras";

export const COLOR_ESTADO_ORDEN: Record<EstadoOrden, string> = {
  BORRADOR: "border-slate-300 bg-slate-50 text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300",
  APROBADA: "border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-900 dark:bg-sky-950 dark:text-sky-300",
  RECIBIDA: "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-300",
  CANCELADA: "border-red-200 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300",
};

export function InsigniaOrden({ estado }: { estado: EstadoOrden }) {
  return <Badge variant="outline" className={cn(COLOR_ESTADO_ORDEN[estado])}>{ETIQUETA_ESTADO_ORDEN[estado]}</Badge>;
}

/** Las ordenes propuestas por el Agente 1 se distinguen siempre (RF-23, RNF-08). */
export function InsigniaOrigen({ origen }: { origen: OrigenOrden }) {
  if (origen === "MANUAL") return <span className="text-xs text-muted-foreground">{ETIQUETA_ORIGEN_ORDEN.MANUAL}</span>;
  return (
    <Badge variant="outline" className="border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-900 dark:bg-violet-950 dark:text-violet-300">
      <Bot data-icon="inline-start" /> IA
    </Badge>
  );
}
