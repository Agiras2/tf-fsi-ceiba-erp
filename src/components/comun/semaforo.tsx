import { CheckCircle2, CircleDashed, OctagonAlert, TriangleAlert } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Semaforo } from "@/lib/kpi";

/** Colores de estado reservados (verde, ambar, rojo) y siempre con icono y texto, nunca solo color. */
export const SEMAFORO: Record<Semaforo, { etiqueta: string; color: string; Icono: typeof CheckCircle2 }> = {
  verde: { etiqueta: "Bien", color: "var(--estado-normal)", Icono: CheckCircle2 },
  amarillo: { etiqueta: "Atención", color: "var(--estado-bajo-minimo)", Icono: TriangleAlert },
  rojo: { etiqueta: "Crítico", color: "var(--estado-agotado)", Icono: OctagonAlert },
  "sin-dato": { etiqueta: "Sin dato", color: "var(--muted-foreground)", Icono: CircleDashed },
};

export function InsigniaSemaforo({ valor, className }: { valor: Semaforo; className?: string }) {
  const s = SEMAFORO[valor];
  return (
    <span className={cn("inline-flex items-center gap-1 text-xs font-medium text-muted-foreground", className)}>
      <s.Icono className="size-3.5" style={{ color: s.color }} aria-hidden />
      {s.etiqueta}
    </span>
  );
}
