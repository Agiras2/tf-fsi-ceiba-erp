import { Construction } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

/** Marcador temporal de los modulos que se implementan en fases posteriores. */
export function EnConstruccion({ titulo, fase, descripcion }: { titulo: string; fase: number; descripcion: string }) {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold tracking-tight">{titulo}</h1>
      <Card>
        <CardHeader className="flex flex-row items-center gap-3 space-y-0">
          <Construction className="h-5 w-5 text-muted-foreground" aria-hidden />
          <div>
            <CardTitle className="text-base">Módulo en construcción</CardTitle>
            <CardDescription>Se implementa en la fase {fase} del plan de acción.</CardDescription>
          </div>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">{descripcion}</CardContent>
      </Card>
    </div>
  );
}
