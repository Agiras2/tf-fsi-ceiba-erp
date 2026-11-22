"use client";

import { useEffect, useState } from "react";
import { Eye } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Buscador } from "@/components/comun/buscador";
import { FilasEstado } from "@/components/comun/filas-estado";
import { Paginacion } from "@/components/comun/paginacion";
import { useListado } from "@/hooks/use-listado";
import { api } from "@/lib/api-cliente";
import { formatoCOP, formatoFechaHora, formatoNumero } from "@/lib/formato";
import { hoyBogota, sumarDias } from "@/lib/fechas";
import type { Pagina } from "@/lib/esquemas/comunes";
import {
  ESTADOS_VENTA, ETIQUETA_ESTADO_VENTA, ETIQUETA_MEDIO_PAGO, MEDIOS_PAGO,
} from "@/lib/esquemas/ventas";
import type { FilaVenta, RespuestaVentas } from "./tipos";
import { InsigniaVenta } from "./insignia-venta";
import { DialogoVenta } from "./dialogo-venta";
import { accionesVentas } from "@/lib/permisos";

type AccionesVentas = ReturnType<typeof accionesVentas>;
type Opcion = { id: number; nombre: string };

function useOpciones(url: string, habilitado: boolean) {
  const [opciones, setOpciones] = useState<Opcion[]>([]);
  useEffect(() => {
    if (!habilitado) return;
    let cancelado = false;
    api<Pagina<Opcion>>(`${url}?tamano=100`)
      .then((r) => !cancelado && setOpciones(r.datos))
      .catch(() => !cancelado && toast.error("No fue posible cargar las opciones de sucursal."));
    return () => {
      cancelado = true;
    };
  }, [url, habilitado]);
  return opciones;
}

export function ModuloVentas({
  acciones, verSucursales,
}: {
  acciones: AccionesVentas;
  verSucursales: boolean;
}) {
  const hoy = hoyBogota();
  const listado = useListado<FilaVenta, RespuestaVentas>("/api/ventas", {
    desde: sumarDias(hoy, -6),
    hasta: hoy,
    sucursalId: "todos",
    estado: "todos",
    medioPago: "todos",
  });
  const sucursales = useOpciones("/api/sucursales", verSucursales);
  const [ventaId, setVentaId] = useState<number | null>(null);
  const resumen = listado.respuesta?.resumen;
  const columnas = verSucursales ? 10 : 9;

  return (
    <div className="space-y-4">
      <div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <TarjetaResumen etiqueta="Ventas registradas" valor={resumen ? formatoNumero(resumen.ventas) : "…"} />
          <TarjetaResumen etiqueta="Total vendido" valor={resumen ? formatoCOP(resumen.totalVendido) : "…"} />
          <TarjetaResumen etiqueta="Ticket promedio" valor={resumen ? formatoCOP(resumen.ticketPromedio) : "…"} />
          <TarjetaResumen etiqueta="Anuladas" valor={resumen ? formatoNumero(resumen.anuladas) : "…"} />
        </div>
        <p className="mt-2 text-xs text-muted-foreground">Las ventas anuladas no suman en los totales.</p>
      </div>

      <Card>
        <CardContent className="space-y-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:flex-wrap lg:items-end">
            <Buscador valor={listado.busqueda} onCambio={listado.setBusqueda} placeholder="Buscar por número o cliente" />
            <div className="flex items-end gap-2">
              <div className="space-y-1">
                <Label htmlFor="ventas-desde" className="text-xs">Desde</Label>
                <Input
                  id="ventas-desde"
                  type="date"
                  value={listado.filtros.desde}
                  onChange={(e) => listado.setFiltro("desde", e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="ventas-hasta" className="text-xs">Hasta</Label>
                <Input
                  id="ventas-hasta"
                  type="date"
                  value={listado.filtros.hasta}
                  onChange={(e) => listado.setFiltro("hasta", e.target.value)}
                />
              </div>
            </div>
            {verSucursales && (
              <NativeSelect
                value={listado.filtros.sucursalId}
                onChange={(e) => listado.setFiltro("sucursalId", e.target.value)}
                aria-label="Filtrar por sucursal"
              >
                <NativeSelectOption value="todos">Todas las sucursales</NativeSelectOption>
                {sucursales.map((sucursal) => (
                  <NativeSelectOption key={sucursal.id} value={String(sucursal.id)}>{sucursal.nombre}</NativeSelectOption>
                ))}
              </NativeSelect>
            )}
            <NativeSelect
              value={listado.filtros.estado}
              onChange={(e) => listado.setFiltro("estado", e.target.value)}
              aria-label="Filtrar por estado"
            >
              <NativeSelectOption value="todos">Todos los estados</NativeSelectOption>
              {ESTADOS_VENTA.map((estado) => (
                <NativeSelectOption key={estado} value={estado}>{ETIQUETA_ESTADO_VENTA[estado]}</NativeSelectOption>
              ))}
            </NativeSelect>
            <NativeSelect
              value={listado.filtros.medioPago}
              onChange={(e) => listado.setFiltro("medioPago", e.target.value)}
              aria-label="Filtrar por medio de pago"
            >
              <NativeSelectOption value="todos">Todos los medios de pago</NativeSelectOption>
              {MEDIOS_PAGO.map((medio) => (
                <NativeSelectOption key={medio} value={medio}>{ETIQUETA_MEDIO_PAGO[medio]}</NativeSelectOption>
              ))}
            </NativeSelect>
          </div>

          <div className="rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>N.º</TableHead>
                  <TableHead>Fecha</TableHead>
                  {verSucursales && <TableHead>Sucursal</TableHead>}
                  <TableHead>Cajero</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Medio de pago</TableHead>
                  <TableHead className="text-right">Ítems</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right"><span className="sr-only">Acciones</span></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <FilasEstado columnas={columnas} cargando={listado.cargando} error={listado.error} vacio={listado.datos.length === 0} />
                {!listado.error && listado.datos.map((venta) => (
                  <TableRow
                    key={venta.id}
                    className="cursor-pointer"
                    onClick={() => setVentaId(venta.id)}
                  >
                    <TableCell className="font-mono text-xs">#{venta.id}</TableCell>
                    <TableCell className="whitespace-nowrap text-muted-foreground">{formatoFechaHora(venta.fecha)}</TableCell>
                    {verSucursales && <TableCell>{venta.sucursal.nombre}</TableCell>}
                    <TableCell>{venta.cajero.nombre}</TableCell>
                    <TableCell>
                      {venta.cliente ? (
                        <>
                          <div className="font-medium">{venta.cliente.nombre}</div>
                          <div className="text-xs text-muted-foreground">{venta.cliente.documento}</div>
                        </>
                      ) : (
                        <span className="text-muted-foreground">Sin identificar</span>
                      )}
                    </TableCell>
                    <TableCell>{ETIQUETA_MEDIO_PAGO[venta.medioPago]}</TableCell>
                    <TableCell className="text-right tabular-nums">{formatoNumero(venta.items)}</TableCell>
                    <TableCell className="text-right tabular-nums">{formatoCOP(venta.total)}</TableCell>
                    <TableCell><InsigniaVenta estado={venta.estado} /></TableCell>
                    <TableCell className="text-right">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        onClick={(e) => { e.stopPropagation(); setVentaId(venta.id); }}
                        aria-label={`Ver la venta ${venta.id}`}
                        title="Ver detalle"
                      >
                        <Eye />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <Paginacion pagina={listado.pagina} tamano={listado.tamano} total={listado.total} onCambio={listado.setPagina} />
        </CardContent>
      </Card>

      <DialogoVenta
        ventaId={ventaId}
        puedeAnular={acciones.anular}
        onCerrar={() => setVentaId(null)}
        onCambio={listado.recargar}
      />
    </div>
  );
}

function TarjetaResumen({ etiqueta, valor }: { etiqueta: string; valor: string }) {
  return (
    <Card>
      <CardContent>
        <div className="text-sm text-muted-foreground">{etiqueta}</div>
        <div className="mt-1 text-2xl font-semibold tabular-nums">{valor}</div>
      </CardContent>
    </Card>
  );
}
