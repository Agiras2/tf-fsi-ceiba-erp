"use client";

import { useEffect, useState } from "react";
import { Loader2, UserPlus, UserRound, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { api } from "@/lib/api-cliente";
import type { Pagina } from "@/lib/esquemas/comunes";
import { FormularioCliente } from "../../catalogos/clientes/formulario-cliente";
import type { Cliente } from "../../catalogos/clientes/tipos";

export type ClienteCaja = Pick<Cliente, "id" | "documento" | "nombre">;

type Resultado = { q: string; datos: ClienteCaja[] };

/** Cliente opcional de la venta: busqueda por documento o nombre, o registro rapido. */
export function SelectorCliente({
  valor, onCambio, error, permitirCrear,
}: {
  valor: ClienteCaja | null;
  onCambio: (c: ClienteCaja | null) => void;
  error?: string;
  permitirCrear: boolean;
}) {
  const [q, setQ] = useState("");
  const [resultado, setResultado] = useState<Resultado>({ q: "", datos: [] });
  const [creando, setCreando] = useState(false);
  const termino = q.trim();
  const buscando = termino.length >= 2 && resultado.q !== termino;
  const opciones = termino.length >= 2 && resultado.q === termino ? resultado.datos : [];

  useEffect(() => {
    if (termino.length < 2) return;
    let cancelado = false;
    const t = setTimeout(() => {
      api<Pagina<ClienteCaja>>(`/api/clientes?${new URLSearchParams({ q: termino, activo: "true", tamano: "6" })}`)
        .then((r) => !cancelado && setResultado({ q: termino, datos: r.datos }))
        .catch(() => !cancelado && setResultado({ q: termino, datos: [] }));
    }, 250);
    return () => {
      cancelado = true;
      clearTimeout(t);
    };
  }, [termino]);

  function elegir(c: ClienteCaja) {
    onCambio({ id: c.id, documento: c.documento, nombre: c.nombre });
    setQ("");
  }

  if (valor) {
    return (
      <div className="flex items-center gap-2 rounded-lg border bg-muted/40 px-3 py-2">
        <UserRound className="size-4 text-muted-foreground" aria-hidden />
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-medium">{valor.nombre}</div>
          <div className="text-xs text-muted-foreground">Documento {valor.documento}</div>
        </div>
        <Button type="button" variant="ghost" size="icon-sm" onClick={() => onCambio(null)} aria-label="Quitar cliente">
          <X />
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-1.5">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Input
            id="cliente"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Documento o nombre (opcional)"
            autoComplete="off"
            aria-invalid={!!error}
            aria-describedby={error ? "cliente-error" : undefined}
          />
          {buscando && <Loader2 className="absolute top-1/2 right-2.5 size-4 -translate-y-1/2 animate-spin text-muted-foreground" aria-hidden />}
          {opciones.length > 0 && (
            <ul className="absolute z-20 mt-1 max-h-60 w-full overflow-auto rounded-lg border bg-popover p-1 shadow-md" role="listbox">
              {opciones.map((c) => (
                <li key={c.id}>
                  <button type="button" role="option" aria-selected={false} onClick={() => elegir(c)}
                    className="w-full rounded-md px-2 py-1.5 text-left text-sm hover:bg-muted focus-visible:bg-muted focus-visible:outline-none">
                    <span className="font-medium">{c.nombre}</span>
                    <span className="ml-2 text-xs text-muted-foreground">{c.documento}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
        {permitirCrear && (
          <Button type="button" variant="outline" size="icon" onClick={() => setCreando(true)} title="Registrar cliente nuevo" aria-label="Registrar cliente nuevo">
            <UserPlus />
          </Button>
        )}
      </div>
      {termino.length >= 2 && !buscando && opciones.length === 0 && (
        <p className="text-xs text-muted-foreground">No hay clientes activos con ese documento o nombre.</p>
      )}
      {error && <p id="cliente-error" className="text-sm text-destructive">{error}</p>}
      <FormularioCliente
        abierto={creando}
        cliente={null}
        onCerrar={() => setCreando(false)}
        onGuardado={(c) => c && elegir(c)}
      />
    </div>
  );
}
