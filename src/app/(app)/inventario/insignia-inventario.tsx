import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { ETIQUETA_ESTADO_INVENTARIO, type EstadoInventario } from "@/lib/esquemas/inventario";

export const COLOR_ESTADO: Record<EstadoInventario, string> = {
  AGOTADO: "border-red-200 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300",
  BAJO_MINIMO: "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-300",
  NORMAL: "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-300",
  SOBRESTOCK: "border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-900 dark:bg-sky-950 dark:text-sky-300",
};

export function InsigniaInventario({ estado }: { estado: EstadoInventario }) {
  return (
    <Badge variant="outline" className={cn(COLOR_ESTADO[estado])}>
      {ETIQUETA_ESTADO_INVENTARIO[estado]}
    </Badge>
  );
}
