"use client";

import { useState, type FormEvent } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import { Campo } from "@/components/comun/campo";
import { api, ErrorCliente } from "@/lib/api-cliente";
import { formatoNumero } from "@/lib/formato";
import { esquemaAjuste } from "@/lib/esquemas/inventario";
import type { FilaInventario } from "./tipos";

export function DialogoAjuste({ fila, onCerrar, onGuardado }: { fila: FilaInventario | null; onCerrar: () => void; onGuardado: () => void }) {
  return (
    <Dialog open={fila !== null} onOpenChange={(v) => !v && onCerrar()}>
      <DialogContent className="sm:max-w-md">
        {fila && <Contenido key={fila.id} fila={fila} onCerrar={onCerrar} onGuardado={onGuardado} />}
      </DialogContent>
    </Dialog>
  );
}

function Contenido({ fila, onCerrar, onGuardado }: { fila: FilaInventario; onCerrar: () => void; onGuardado: () => void }) {
  const [valores, setValores] = useState({ tipo: "SALIDA", cantidad: "", motivo: "" });
  const [errores, setErrores] = useState<Record<string, string>>({});
  const [guardando, setGuardando] = useState(false);

  const cantidad = Number(valores.cantidad);
  const resultante = Number.isInteger(cantidad) && cantidad > 0
    ? fila.stock + (valores.tipo === "SALIDA" ? -cantidad : cantidad)
    : null;

  async function guardar(e: FormEvent) {
    e.preventDefault();
    const r = esquemaAjuste.safeParse(valores);
    if (!r.success) {
      const porCampo: Record<string, string> = {};
      for (const i of r.error.issues) porCampo[String(i.path[0])] ??= i.message;
      setErrores(porCampo);
      return;
    }
    if (r.data.tipo === "SALIDA" && r.data.cantidad > fila.stock) {
      setErrores({ cantidad: `Máximo disponible: ${fila.stock}.` });
      return;
    }
    setErrores({});
    setGuardando(true);
    try {
      await api(`/api/inventario/${fila.id}/ajustes`, { method: "POST", json: r.data });
      toast.success("Ajuste registrado en el kardex.");
      onGuardado();
      onCerrar();
    } catch (err) {
      if (err instanceof ErrorCliente) {
        setErrores(err.porCampo());
        toast.error(err.message);
      } else toast.error("No fue posible registrar el ajuste.");
    } finally {
      setGuardando(false);
    }
  }

  const invalido = (c: string) => ({ "aria-invalid": !!errores[c], "aria-describedby": errores[c] ? `${c}-error` : undefined });

  return (
    <form onSubmit={guardar} noValidate className="space-y-4">
      <DialogHeader>
        <DialogTitle>Ajuste de inventario</DialogTitle>
        <DialogDescription>
          {fila.producto.nombre} · {fila.sucursal.nombre}. Stock actual: <strong>{formatoNumero(fila.stock)}</strong> {fila.producto.unidad}.
        </DialogDescription>
      </DialogHeader>
      <div className="grid gap-4 sm:grid-cols-2">
        <Campo id="tipo" etiqueta="Tipo de ajuste" error={errores.tipo}>
          <NativeSelect id="tipo" className="w-full" value={valores.tipo} onChange={(e) => setValores((v) => ({ ...v, tipo: e.target.value }))}>
            <NativeSelectOption value="SALIDA">Salida (merma, daño, conteo)</NativeSelectOption>
            <NativeSelectOption value="ENTRADA">Entrada (conteo, devolución)</NativeSelectOption>
          </NativeSelect>
        </Campo>
        <Campo id="cantidad" etiqueta="Cantidad" error={errores.cantidad}
          ayuda={resultante !== null ? `Stock resultante: ${formatoNumero(resultante)}` : undefined}>
          <Input id="cantidad" type="number" min="1" step="1" value={valores.cantidad}
            onChange={(e) => setValores((v) => ({ ...v, cantidad: e.target.value }))} {...invalido("cantidad")} />
        </Campo>
        <Campo id="motivo" etiqueta="Motivo" error={errores.motivo} className="space-y-1.5 sm:col-span-2" ayuda="Obligatorio, mínimo 5 caracteres. Queda en el kardex y en la auditoría.">
          <Textarea id="motivo" rows={2} value={valores.motivo} placeholder="Ej. Conteo físico: 3 unidades averiadas"
            onChange={(e) => setValores((v) => ({ ...v, motivo: e.target.value }))} {...invalido("motivo")} />
        </Campo>
      </div>
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onCerrar} disabled={guardando}>Cancelar</Button>
        <Button type="submit" disabled={guardando}>
          {guardando && <Loader2 className="animate-spin" />}
          Registrar ajuste
        </Button>
      </DialogFooter>
    </form>
  );
}
