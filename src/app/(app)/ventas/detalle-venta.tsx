// Detalle de una venta: datos generales, productos y totales calculados por el servidor.
// Lo usan la caja (venta recien registrada) y la consulta de ventas.
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatoCOP, formatoFechaHora, formatoNumero } from "@/lib/formato";
import { ETIQUETA_MEDIO_PAGO } from "@/lib/esquemas/ventas";
import { InsigniaVenta } from "./insignia-venta";
import type { Venta } from "./tipos";

function Dato({ etiqueta, children }: { etiqueta: string; children: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs text-muted-foreground">{etiqueta}</dt>
      <dd className="truncate text-sm font-medium">{children}</dd>
    </div>
  );
}

export function DetalleVenta({ venta }: { venta: Venta }) {
  const conCostos = venta.utilidad !== undefined;
  return (
    <div className="min-w-0 space-y-4">
      <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <Dato etiqueta="Fecha">{formatoFechaHora(venta.fecha)}</Dato>
        <Dato etiqueta="Sucursal">{venta.sucursal.nombre}</Dato>
        <Dato etiqueta="Cajero">{venta.cajero.nombre}</Dato>
        <Dato etiqueta="Cliente">{venta.cliente ? `${venta.cliente.nombre} · ${venta.cliente.documento}` : "Sin identificar"}</Dato>
        <Dato etiqueta="Medio de pago">{ETIQUETA_MEDIO_PAGO[venta.medioPago]}</Dato>
        <Dato etiqueta="Estado"><InsigniaVenta estado={venta.estado} /></Dato>
      </dl>

      {venta.estado === "ANULADA" && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm">
          <span className="font-medium">Anulada</span> por {venta.anuladaPor?.nombre ?? "—"} el {formatoFechaHora(venta.fechaAnulacion)}.
          <div className="text-muted-foreground">Motivo: {venta.motivoAnulacion}</div>
          <div className="text-xs text-muted-foreground">Las existencias se restituyeron en el kardex y la venta no cuenta en los indicadores.</div>
        </div>
      )}

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>SKU</TableHead>
              <TableHead>Producto</TableHead>
              <TableHead className="text-right">Cantidad</TableHead>
              <TableHead className="text-right">Precio unit.</TableHead>
              {conCostos && <TableHead className="text-right">Costo unit.</TableHead>}
              <TableHead className="text-right">Subtotal</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {venta.detalles.map((d) => (
              <TableRow key={d.id}>
                <TableCell className="font-mono text-xs">{d.producto.sku}</TableCell>
                <TableCell className="whitespace-normal">{d.producto.nombre}</TableCell>
                <TableCell className="text-right tabular-nums">{formatoNumero(d.cantidad)}</TableCell>
                <TableCell className="text-right tabular-nums">{formatoCOP(d.precioUnitario)}</TableCell>
                {conCostos && <TableCell className="text-right tabular-nums text-muted-foreground">{formatoCOP(d.costoUnitario)}</TableCell>}
                <TableCell className="text-right font-medium tabular-nums">{formatoCOP(d.subtotal)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
          <TableFooter>
            <TableRow>
              <TableCell colSpan={conCostos ? 5 : 4} className="text-right">Total</TableCell>
              <TableCell className="text-right text-base font-semibold tabular-nums">{formatoCOP(venta.total)}</TableCell>
            </TableRow>
          </TableFooter>
        </Table>
      </div>

      {conCostos && (
        <p className="text-right text-xs text-muted-foreground">
          Costo total {formatoCOP(venta.costoTotal)} · Utilidad bruta {formatoCOP(venta.utilidad)}
        </p>
      )}
    </div>
  );
}
