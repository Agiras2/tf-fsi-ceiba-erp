"use client";

import { useEffect, useState } from "react";
import { Bot, CheckCircle2, Loader2, PackageCheck, Pencil, XCircle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ConfirmarAccion } from "@/components/comun/confirmar-accion";
import { DialogoMotivo } from "@/components/comun/dialogo-motivo";
import { api, ErrorCliente } from "@/lib/api-cliente";
import { formatoCOP, formatoDia, formatoFechaHora, formatoNumero } from "@/lib/formato";
import { transicionValida } from "@/lib/esquemas/compras";
import { InsigniaOrden, InsigniaOrigen } from "./insignias";
import type { AccionesCompras, Orden } from "./tipos";

function Dato({ etiqueta, children }: { etiqueta: string; children: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs text-muted-foreground">{etiqueta}</dt>
      <dd className="text-sm font-medium">{children}</dd>
    </div>
  );
}

type Resultado = { id: number; orden: Orden | null; error: string | null };
type Pendiente = "aprobar" | "recibir" | "cancelar" | null;

export function DetalleOrden({
  ordenId, acciones, onCerrar, onCambio, onEditar,
}: {
  ordenId: number | null;
  acciones: AccionesCompras;
  onCerrar: () => void;
  onCambio: () => void;
  onEditar: (orden: Orden) => void;
}) {
  const [resultado, setResultado] = useState<Resultado>({ id: 0, orden: null, error: null });
  const [version, setVersion] = useState(0);
  const [pendiente, setPendiente] = useState<Pendiente>(null);
  const [procesando, setProcesando] = useState(false);

  useEffect(() => {
    if (ordenId === null) return;
    let cancelado = false;
    api<Orden>(`/api/ordenes-compra/${ordenId}`)
      .then((o) => !cancelado && setResultado({ id: ordenId, orden: o, error: null }))
      .catch((e: unknown) => !cancelado && setResultado({
        id: ordenId, orden: null, error: e instanceof ErrorCliente ? e.message : "No fue posible cargar la orden.",
      }));
    return () => {
      cancelado = true;
    };
  }, [ordenId, version]);

  const orden = resultado.id === ordenId ? resultado.orden : null;
  const error = resultado.id === ordenId ? resultado.error : null;

  async function ejecutar(accion: "aprobar" | "recibir" | "cancelar", cuerpo?: unknown): Promise<string | null> {
    if (!orden) return null;
    setProcesando(true);
    try {
      const o = await api<Orden>(`/api/ordenes-compra/${orden.id}/${accion}`, { method: "POST", json: cuerpo ?? {} });
      const textos = { aprobar: "aprobada", recibir: "recibida; el inventario se actualizó", cancelar: "cancelada" };
      toast.success(`Orden #${o.id} ${textos[accion]}.`);
      setResultado({ id: o.id, orden: o, error: null });
      setPendiente(null);
      onCambio();
      return null;
    } catch (e) {
      const mensaje = e instanceof ErrorCliente ? e.message : "No fue posible completar la operación.";
      toast.error(mensaje);
      setPendiente(null);
      setVersion((v) => v + 1); // recarga por si otro usuario cambio la orden
      onCambio();
      return mensaje;
    } finally {
      setProcesando(false);
    }
  }

  const puede = orden && {
    editar: acciones.editar && orden.estado === "BORRADOR",
    aprobar: acciones.aprobar && transicionValida(orden.estado, "APROBADA"),
    cancelar: acciones.cancelar && transicionValida(orden.estado, "CANCELADA"),
    recibir: acciones.recibir && transicionValida(orden.estado, "RECIBIDA"),
  };
  const unidades = orden?.detalles.reduce((a, d) => a + d.cantidad, 0) ?? 0;

  return (
    <>
      <Dialog open={ordenId !== null} onOpenChange={(v) => !v && onCerrar()}>
        <DialogContent className="sm:max-w-3xl">
          <div className="min-w-0 space-y-4">
            <DialogHeader>
              <DialogTitle className="flex flex-wrap items-center gap-2">
                Orden de compra #{ordenId}
                {orden && <InsigniaOrden estado={orden.estado} />}
                {orden && <InsigniaOrigen origen={orden.origen} />}
              </DialogTitle>
              <DialogDescription>
                {orden ? `${orden.proveedor.nombre} · ${orden.sucursal.nombre}` : "Cargando…"}
              </DialogDescription>
            </DialogHeader>

            {error && <p className="text-sm text-destructive">{error}</p>}
            {!orden && !error && <Skeleton className="h-48 w-full" />}

            {orden && (
              <>
                {orden.origen === "AGENTE_INVENTARIO" && (
                  <div className="flex gap-2 rounded-lg border border-violet-200 bg-violet-50 p-3 text-sm text-violet-800 dark:border-violet-900 dark:bg-violet-950 dark:text-violet-200">
                    <Bot className="mt-0.5 size-4 shrink-0" />
                    <div>
                      Propuesta por el agente de inventario
                      {orden.ejecucionAgente && <> (ejecución #{orden.ejecucionAgente.id}, {formatoFechaHora(orden.ejecucionAgente.fechaInicio)})</>}.
                      Requiere revisión y aprobación del gerente.
                    </div>
                  </div>
                )}
                {orden.vencida && (
                  <p className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-200">
                    La fecha esperada ya pasó y la mercancía no se ha recibido.
                  </p>
                )}
                {orden.estado === "CANCELADA" && orden.motivoCancelacion && (
                  <p className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm">Motivo de cancelación: {orden.motivoCancelacion}</p>
                )}

                <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <Dato etiqueta="Creada">{formatoFechaHora(orden.createdAt)}<div className="text-xs font-normal text-muted-foreground">{orden.creadaPor?.nombre ?? "—"}</div></Dato>
                  <Dato etiqueta="Aprobada">{formatoFechaHora(orden.fechaAprobacion)}<div className="text-xs font-normal text-muted-foreground">{orden.aprobadaPor?.nombre ?? ""}</div></Dato>
                  <Dato etiqueta="Fecha esperada">{formatoDia(orden.fechaEsperada)}<div className="text-xs font-normal text-muted-foreground">Proveedor: {orden.proveedor.tiempoEntregaDias} día(s)</div></Dato>
                  <Dato etiqueta="Recepción">
                    {formatoDia(orden.fechaRecepcion)}
                    {orden.aTiempo !== null && (
                      <div className={orden.aTiempo ? "text-xs text-emerald-700 dark:text-emerald-300" : "text-xs text-destructive"}>
                        {orden.aTiempo ? "A tiempo" : "Con retraso"} · {orden.recibidaPor?.nombre}
                      </div>
                    )}
                  </Dato>
                </dl>
                {orden.observaciones && <p className="text-sm text-muted-foreground">Observaciones: {orden.observaciones}</p>}

                <div className="max-h-[40vh] overflow-auto rounded-lg border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>SKU</TableHead>
                        <TableHead>Producto</TableHead>
                        <TableHead className="text-right">Cantidad</TableHead>
                        <TableHead className="text-right">Costo unit.</TableHead>
                        <TableHead className="text-right">Subtotal</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {orden.detalles.map((d) => (
                        <TableRow key={d.id}>
                          <TableCell className="font-mono text-xs">{d.producto.sku}</TableCell>
                          <TableCell className="whitespace-normal">
                            {d.producto.nombre}
                            {!d.producto.activo && <span className="ml-2 text-xs text-destructive">(inactivo)</span>}
                          </TableCell>
                          <TableCell className="text-right tabular-nums">{formatoNumero(d.cantidad)}</TableCell>
                          <TableCell className="text-right tabular-nums">{formatoCOP(d.costoUnitario)}</TableCell>
                          <TableCell className="text-right font-medium tabular-nums">{formatoCOP(d.subtotal)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                    <TableFooter>
                      <TableRow>
                        <TableCell colSpan={2}>{formatoNumero(unidades)} unidades</TableCell>
                        <TableCell colSpan={2} className="text-right">Total</TableCell>
                        <TableCell className="text-right font-semibold tabular-nums">{formatoCOP(orden.total)}</TableCell>
                      </TableRow>
                    </TableFooter>
                  </Table>
                </div>
              </>
            )}

            {puede && (puede.editar || puede.aprobar || puede.cancelar || puede.recibir) && (
              <DialogFooter className="gap-2">
                {puede.cancelar && (
                  <Button variant="outline" onClick={() => setPendiente("cancelar")} disabled={procesando}>
                    <XCircle /> Cancelar orden
                  </Button>
                )}
                {puede.editar && (
                  <Button variant="outline" onClick={() => orden && onEditar(orden)} disabled={procesando}>
                    <Pencil /> Editar borrador
                  </Button>
                )}
                {puede.aprobar && (
                  <Button onClick={() => setPendiente("aprobar")} disabled={procesando}>
                    {procesando ? <Loader2 className="animate-spin" /> : <CheckCircle2 />} Aprobar
                  </Button>
                )}
                {puede.recibir && (
                  <Button onClick={() => setPendiente("recibir")} disabled={procesando}>
                    {procesando ? <Loader2 className="animate-spin" /> : <PackageCheck />} Registrar recepción
                  </Button>
                )}
              </DialogFooter>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <ConfirmarAccion
        abierto={pendiente === "aprobar"}
        onCambio={(v) => !v && setPendiente(null)}
        titulo={`¿Aprobar la orden #${orden?.id}?`}
        descripcion={`Se autoriza la compra a ${orden?.proveedor.nombre} por ${formatoCOP(orden?.total)}. Después de aprobada ya no se puede editar.`}
        textoAccion="Aprobar"
        onConfirmar={() => ejecutar("aprobar")}
      />
      <ConfirmarAccion
        abierto={pendiente === "recibir"}
        onCambio={(v) => !v && setPendiente(null)}
        titulo={`¿Registrar la recepción de la orden #${orden?.id}?`}
        descripcion={`Se sumarán ${formatoNumero(unidades)} unidades al inventario de ${orden?.sucursal.nombre} y quedarán en el kardex. Confirme que la mercancía llegó completa.`}
        textoAccion="Registrar recepción"
        onConfirmar={() => ejecutar("recibir")}
      />
      <DialogoMotivo
        abierto={pendiente === "cancelar"}
        titulo={`Cancelar la orden #${orden?.id}`}
        descripcion="La orden quedará cancelada y no se podrá reabrir."
        textoAccion="Cancelar orden"
        placeholder="Ej. El proveedor no tiene existencias"
        onCerrar={() => setPendiente(null)}
        onConfirmar={(motivo) => ejecutar("cancelar", { motivo })}
      />
    </>
  );
}
