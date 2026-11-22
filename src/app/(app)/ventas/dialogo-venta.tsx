"use client";

import { useEffect, useState } from "react";
import { Ban } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { DialogoMotivo } from "@/components/comun/dialogo-motivo";
import { api, ErrorCliente } from "@/lib/api-cliente";
import type { Venta } from "./tipos";
import { DetalleVenta } from "./detalle-venta";

type Resultado = { id: number; venta: Venta | null; error: string | null };

export function DialogoVenta({
  ventaId, puedeAnular, onCerrar, onCambio,
}: {
  ventaId: number | null;
  puedeAnular: boolean;
  onCerrar: () => void;
  onCambio: () => void;
}) {
  const [resultado, setResultado] = useState<Resultado>({ id: 0, venta: null, error: null });
  const [version, setVersion] = useState(0);
  const [motivoAbierto, setMotivoAbierto] = useState(false);

  useEffect(() => {
    if (ventaId === null) return;
    let cancelado = false;
    api<Venta>(`/api/ventas/${ventaId}`)
      .then((venta) => !cancelado && setResultado({ id: ventaId, venta, error: null }))
      .catch((e: unknown) => !cancelado && setResultado({
        id: ventaId,
        venta: null,
        error: e instanceof ErrorCliente ? e.message : "No fue posible cargar la venta.",
      }));
    return () => {
      cancelado = true;
    };
  }, [ventaId, version]);

  const venta = resultado.id === ventaId ? resultado.venta : null;
  const error = resultado.id === ventaId ? resultado.error : null;

  async function anular(motivo: string): Promise<string | null> {
    if (!venta) return "No fue posible cargar la venta.";
    try {
      const actualizada = await api<Venta>(`/api/ventas/${venta.id}/anular`, { method: "POST", json: { motivo } });
      setResultado({ id: actualizada.id, venta: actualizada, error: null });
      toast.success(`Venta #${actualizada.id} anulada; se restituyeron las existencias.`);
      setMotivoAbierto(false);
      onCambio();
      return null;
    } catch (e) {
      const mensaje = e instanceof ErrorCliente ? e.message : "No fue posible anular la venta.";
      setVersion((v) => v + 1);
      onCambio();
      return mensaje;
    }
  }

  return (
    <>
      <Dialog open={ventaId !== null} onOpenChange={(v) => !v && onCerrar()}>
        <DialogContent className="sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>Venta #{ventaId}</DialogTitle>
            <DialogDescription>{venta ? `${venta.cliente?.nombre ?? "Sin identificar"} · ${venta.sucursal.nombre}` : "Cargando…"}</DialogDescription>
          </DialogHeader>

          {error && <p className="text-sm text-destructive">{error}</p>}
          {!venta && !error && <Skeleton className="h-48 w-full" />}
          {venta && <DetalleVenta venta={venta} />}

          {puedeAnular && venta?.estado === "REGISTRADA" && (
            <DialogFooter>
              <Button variant="destructive" onClick={() => setMotivoAbierto(true)}>
                <Ban /> Anular venta
              </Button>
            </DialogFooter>
          )}
        </DialogContent>
      </Dialog>

      <DialogoMotivo
        abierto={motivoAbierto}
        titulo={`Anular la venta #${venta?.id ?? ventaId}`}
        descripcion="Se restituirán las existencias en el kardex y la venta dejará de contar en los indicadores."
        textoAccion="Anular venta"
        placeholder="Ej. Error en el registro de la venta"
        onCerrar={() => setMotivoAbierto(false)}
        onConfirmar={anular}
      />
    </>
  );
}
