"use client";

import { useState, type FormEvent } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Campo } from "@/components/comun/campo";
import { api, ErrorCliente } from "@/lib/api-cliente";
import { esquemaUmbrales } from "@/lib/esquemas/inventario";
import type { FilaInventario } from "./tipos";

export function DialogoUmbrales({ fila, onCerrar, onGuardado }: { fila: FilaInventario | null; onCerrar: () => void; onGuardado: () => void }) {
  return (
    <Dialog open={fila !== null} onOpenChange={(v) => !v && onCerrar()}>
      <DialogContent className="sm:max-w-md">
        {fila && <Contenido key={fila.id} fila={fila} onCerrar={onCerrar} onGuardado={onGuardado} />}
      </DialogContent>
    </Dialog>
  );
}

function Contenido({ fila, onCerrar, onGuardado }: { fila: FilaInventario; onCerrar: () => void; onGuardado: () => void }) {
  const [valores, setValores] = useState({ stockMinimo: String(fila.stockMinimo), stockMaximo: String(fila.stockMaximo) });
  const [errores, setErrores] = useState<Record<string, string>>({});
  const [guardando, setGuardando] = useState(false);

  async function guardar(e: FormEvent) {
    e.preventDefault();
    const r = esquemaUmbrales.safeParse(valores);
    if (!r.success) {
      const porCampo: Record<string, string> = {};
      for (const i of r.error.issues) porCampo[String(i.path[0])] ??= i.message;
      setErrores(porCampo);
      return;
    }
    setErrores({});
    setGuardando(true);
    try {
      await api(`/api/inventario/${fila.id}`, { method: "PATCH", json: r.data });
      toast.success("Mínimo y máximo actualizados.");
      onGuardado();
      onCerrar();
    } catch (err) {
      if (err instanceof ErrorCliente) {
        setErrores(err.porCampo());
        toast.error(err.message);
      } else toast.error("No fue posible guardar los cambios.");
    } finally {
      setGuardando(false);
    }
  }

  const invalido = (c: string) => ({ "aria-invalid": !!errores[c], "aria-describedby": errores[c] ? `${c}-error` : undefined });

  return (
    <form onSubmit={guardar} noValidate className="space-y-4">
      <DialogHeader>
        <DialogTitle>Mínimo y máximo</DialogTitle>
        <DialogDescription>
          {fila.producto.nombre} · {fila.sucursal.nombre}. Con el mínimo se generan las alertas y las propuestas de reposición.
        </DialogDescription>
      </DialogHeader>
      <div className="grid gap-4 sm:grid-cols-2">
        <Campo id="stockMinimo" etiqueta="Stock mínimo" error={errores.stockMinimo}>
          <Input id="stockMinimo" type="number" min="0" step="1" value={valores.stockMinimo}
            onChange={(e) => setValores((v) => ({ ...v, stockMinimo: e.target.value }))} {...invalido("stockMinimo")} />
        </Campo>
        <Campo id="stockMaximo" etiqueta="Stock máximo" error={errores.stockMaximo} ayuda="Debe ser mayor que el mínimo.">
          <Input id="stockMaximo" type="number" min="1" step="1" value={valores.stockMaximo}
            onChange={(e) => setValores((v) => ({ ...v, stockMaximo: e.target.value }))} {...invalido("stockMaximo")} />
        </Campo>
      </div>
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onCerrar} disabled={guardando}>Cancelar</Button>
        <Button type="submit" disabled={guardando}>
          {guardando && <Loader2 className="animate-spin" />}
          Guardar
        </Button>
      </DialogFooter>
    </form>
  );
}
