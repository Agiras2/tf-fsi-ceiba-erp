"use client";

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { FilasEstado } from "@/components/comun/filas-estado";
import { Paginacion } from "@/components/comun/paginacion";
import { useListado } from "@/hooks/use-listado";
import { cn } from "@/lib/utils";
import { formatoFechaHora, formatoNumero } from "@/lib/formato";
import type { FilaInventario, Movimiento } from "./tipos";

const ETIQUETA_MOVIMIENTO: Record<Movimiento["tipo"], string> = {
  CARGA_INICIAL: "Carga inicial",
  VENTA: "Venta",
  ANULACION_VENTA: "Anulación de venta",
  RECEPCION_COMPRA: "Recepción de compra",
  AJUSTE_ENTRADA: "Ajuste de entrada",
  AJUSTE_SALIDA: "Ajuste de salida",
};

const ETIQUETA_REFERENCIA: Record<string, string> = { VENTA: "Venta", ORDEN_COMPRA: "Orden de compra", AJUSTE: "Ajuste" };

export function DialogoKardex({ fila, onCerrar }: { fila: FilaInventario | null; onCerrar: () => void }) {
  return (
    <Dialog open={fila !== null} onOpenChange={(v) => !v && onCerrar()}>
      <DialogContent className="sm:max-w-5xl">
        {fila && <Contenido key={fila.id} fila={fila} />}
      </DialogContent>
    </Dialog>
  );
}

// min-w-0: el contenido del dialogo es un elemento de grid; sin esto se ensancha
// hasta el ancho de la tabla y la desborda (DEF-03).
function Contenido({ fila }: { fila: FilaInventario }) {
  const listado = useListado<Movimiento>(
    "/api/inventario/kardex",
    { productoId: String(fila.productoId), sucursalId: String(fila.sucursalId) },
    10,
  );

  return (
    <div className="min-w-0 space-y-4">
      <DialogHeader>
        <DialogTitle>Kardex · {fila.producto.nombre}</DialogTitle>
        <DialogDescription>
          {fila.sucursal.nombre} · Stock actual {formatoNumero(fila.stock)} {fila.producto.unidad}. Movimientos del más reciente al más antiguo.
        </DialogDescription>
      </DialogHeader>
      <div className="max-h-[60vh] overflow-auto rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Fecha</TableHead>
              <TableHead>Movimiento</TableHead>
              <TableHead className="text-right">Cantidad</TableHead>
              <TableHead className="text-right">Stock resultante</TableHead>
              <TableHead>Referencia</TableHead>
              <TableHead>Usuario</TableHead>
              <TableHead>Motivo</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <FilasEstado columnas={7} cargando={listado.cargando} error={listado.error} vacio={listado.datos.length === 0} />
            {!listado.error &&
              listado.datos.map((m) => (
                <TableRow key={m.id}>
                  <TableCell className="whitespace-nowrap text-xs">{formatoFechaHora(m.fecha)}</TableCell>
                  <TableCell>{ETIQUETA_MOVIMIENTO[m.tipo]}</TableCell>
                  <TableCell className={cn("text-right font-medium tabular-nums", m.cantidad < 0 ? "text-red-600" : "text-emerald-600")}>
                    {m.cantidad > 0 ? `+${formatoNumero(m.cantidad)}` : formatoNumero(m.cantidad)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{formatoNumero(m.stockResultante)}</TableCell>
                  <TableCell className="text-xs">
                    {m.referenciaTipo ? `${ETIQUETA_REFERENCIA[m.referenciaTipo] ?? m.referenciaTipo}${m.referenciaId ? ` #${m.referenciaId}` : ""}` : "—"}
                  </TableCell>
                  <TableCell className="text-xs">{m.usuario?.nombre ?? "Sistema"}</TableCell>
                  <TableCell className="min-w-48 max-w-72 text-xs whitespace-normal">{m.motivo ?? "—"}</TableCell>
                </TableRow>
              ))}
          </TableBody>
        </Table>
      </div>
      <Paginacion pagina={listado.pagina} tamano={listado.tamano} total={listado.total} onCambio={listado.setPagina} />
    </div>
  );
}
