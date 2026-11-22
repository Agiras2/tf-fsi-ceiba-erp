"use client";

import { useState, type FormEvent } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Campo } from "@/components/comun/campo";

/**
 * Pide un motivo obligatorio antes de una operacion sensible (anular una venta,
 * cancelar una orden). onConfirmar devuelve un mensaje de error por campo, o null si tuvo exito.
 */
export function DialogoMotivo({
  abierto, titulo, descripcion, textoAccion, placeholder, onCerrar, onConfirmar,
}: {
  abierto: boolean;
  titulo: string;
  descripcion: string;
  textoAccion: string;
  placeholder?: string;
  onCerrar: () => void;
  onConfirmar: (motivo: string) => Promise<string | null>;
}) {
  return (
    <Dialog open={abierto} onOpenChange={(v) => !v && onCerrar()}>
      <DialogContent className="sm:max-w-md">
        {abierto && (
          <Contenido titulo={titulo} descripcion={descripcion} textoAccion={textoAccion} placeholder={placeholder}
            onCerrar={onCerrar} onConfirmar={onConfirmar} />
        )}
      </DialogContent>
    </Dialog>
  );
}

function Contenido({
  titulo, descripcion, textoAccion, placeholder, onCerrar, onConfirmar,
}: {
  titulo: string;
  descripcion: string;
  textoAccion: string;
  placeholder?: string;
  onCerrar: () => void;
  onConfirmar: (motivo: string) => Promise<string | null>;
}) {
  const [motivo, setMotivo] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  async function enviar(e: FormEvent) {
    e.preventDefault();
    const texto = motivo.trim();
    if (texto.length < 5) {
      setError("El motivo debe tener al menos 5 caracteres.");
      return;
    }
    setEnviando(true);
    const r = await onConfirmar(texto);
    setEnviando(false);
    if (r) setError(r);
  }

  return (
    <form onSubmit={enviar} noValidate className="space-y-4">
      <DialogHeader>
        <DialogTitle>{titulo}</DialogTitle>
        <DialogDescription>{descripcion}</DialogDescription>
      </DialogHeader>
      <Campo id="motivo" etiqueta="Motivo" error={error ?? undefined} ayuda="Obligatorio, mínimo 5 caracteres. Queda en la auditoría.">
        <Textarea id="motivo" rows={3} value={motivo} placeholder={placeholder} onChange={(e) => setMotivo(e.target.value)}
          aria-invalid={!!error} aria-describedby={error ? "motivo-error" : undefined} autoFocus />
      </Campo>
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onCerrar} disabled={enviando}>Volver</Button>
        <Button type="submit" variant="destructive" disabled={enviando}>
          {enviando && <Loader2 className="animate-spin" />}
          {textoAccion}
        </Button>
      </DialogFooter>
    </form>
  );
}
