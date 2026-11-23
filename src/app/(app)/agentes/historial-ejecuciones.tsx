"use client";
// Historial de ejecuciones de los agentes (docs/04-REQ RF-41).
// Marcador temporal: la tabla con filtros y paginacion se construye en la Fase 7B.
import { Card, CardContent } from "@/components/ui/card";

export function HistorialEjecuciones({ onVer }: { onVer: (id: number) => void }) {
  void onVer;
  return (
    <Card>
      <CardContent className="py-8 text-center text-sm text-muted-foreground">
        El historial de ejecuciones se construye en la Fase 7B.
      </CardContent>
    </Card>
  );
}
