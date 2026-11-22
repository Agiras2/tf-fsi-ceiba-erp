"use client";

import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";

export function Buscador({ valor, onCambio, placeholder = "Buscar..." }: { valor: string; onCambio: (v: string) => void; placeholder?: string }) {
  return (
    <div className="relative w-full sm:w-72">
      <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
      <Input value={valor} onChange={(e) => onCambio(e.target.value)} placeholder={placeholder} className="pl-8" aria-label={placeholder} />
    </div>
  );
}
