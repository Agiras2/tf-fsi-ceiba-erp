"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatoNumero } from "@/lib/formato";

export function Paginacion({ pagina, tamano, total, onCambio }: { pagina: number; tamano: number; total: number; onCambio: (p: number) => void }) {
  const paginas = Math.max(1, Math.ceil(total / tamano));
  const desde = total === 0 ? 0 : (pagina - 1) * tamano + 1;
  const hasta = Math.min(total, pagina * tamano);
  return (
    <div className="flex items-center justify-between gap-2 text-sm text-muted-foreground">
      <span>
        {formatoNumero(desde)}–{formatoNumero(hasta)} de {formatoNumero(total)}
      </span>
      <div className="flex items-center gap-1">
        <Button variant="outline" size="sm" onClick={() => onCambio(pagina - 1)} disabled={pagina <= 1} aria-label="Página anterior">
          <ChevronLeft />
        </Button>
        <span className="px-2">
          Página {pagina} de {paginas}
        </span>
        <Button variant="outline" size="sm" onClick={() => onCambio(pagina + 1)} disabled={pagina >= paginas} aria-label="Página siguiente">
          <ChevronRight />
        </Button>
      </div>
    </div>
  );
}
