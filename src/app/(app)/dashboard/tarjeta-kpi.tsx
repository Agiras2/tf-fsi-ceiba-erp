import { Minus, TrendingDown, TrendingUp } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { InsigniaSemaforo, SEMAFORO } from "@/components/comun/semaforo";
import { formatoKpi, formatoVariacion, KPIS, type ValorKpi } from "@/lib/kpi";

/** Tarjeta de un KPI: valor, semaforo con icono y texto, variacion y formula (RF-24). */
export function TarjetaKpi({ kpi, detalle, sinFiltroCategoria }: { kpi: ValorKpi; detalle?: string; sinFiltroCategoria?: boolean }) {
  const def = KPIS[kpi.id];
  const Flecha = kpi.variacion === null ? Minus : kpi.variacion >= 0 ? TrendingUp : TrendingDown;
  return (
    <Card className="relative overflow-hidden">
      <span className="absolute inset-y-0 left-0 w-1" style={{ background: SEMAFORO[kpi.semaforo].color }} aria-hidden />
      <CardContent className="space-y-2">
        <div className="flex items-start justify-between gap-2">
          <div>
            <div className="text-sm font-medium">{def.nombre}</div>
            <div className="text-xs text-muted-foreground">{kpi.id}</div>
          </div>
          <InsigniaSemaforo valor={kpi.semaforo} />
        </div>
        <div className="text-2xl font-semibold tracking-tight tabular-nums">{formatoKpi(kpi.id, kpi.valor)}</div>
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <Flecha className="size-3.5" aria-hidden />
          <span className="tabular-nums">{formatoVariacion(kpi.id, kpi.variacion)}</span>
          {kpi.variacion !== null && <span>vs. periodo anterior ({formatoKpi(kpi.id, kpi.anterior)})</span>}
        </div>
        {detalle && <div className="text-xs text-muted-foreground">{detalle}</div>}
        {sinFiltroCategoria && <div className="text-xs text-muted-foreground italic">No aplica el filtro de categoría.</div>}
        <p className="border-t pt-2 text-xs text-muted-foreground" title={def.definicion}>{def.formula}</p>
      </CardContent>
    </Card>
  );
}
