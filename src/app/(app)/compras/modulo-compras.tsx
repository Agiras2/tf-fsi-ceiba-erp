"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, Eye, Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Buscador } from "@/components/comun/buscador";
import { FilasEstado } from "@/components/comun/filas-estado";
import { Paginacion } from "@/components/comun/paginacion";
import { useListado } from "@/hooks/use-listado";
import { api } from "@/lib/api-cliente";
import { cn } from "@/lib/utils";
import { formatoCOP, formatoDia, formatoFechaHora, formatoNumero } from "@/lib/formato";
import type { Pagina } from "@/lib/esquemas/comunes";
import {
  ESTADOS_ORDEN, ETIQUETA_ESTADO_ORDEN, ETIQUETA_ORIGEN_ORDEN, ORIGENES_ORDEN, type EstadoOrden,
} from "@/lib/esquemas/compras";
import { COLOR_ESTADO_ORDEN, InsigniaOrden, InsigniaOrigen } from "./insignias";
import { DetalleOrden } from "./detalle-orden";
import { FormularioOrden } from "./formulario-orden";
import type { AccionesCompras, FilaOrden, Opcion, Orden, RespuestaOrdenes } from "./tipos";

/** Opciones para filtros; solo se consultan si el rol puede leer el recurso (DEF-01). */
function useOpciones(url: string, habilitado: boolean) {
  const [opciones, setOpciones] = useState<Opcion[]>([]);
  useEffect(() => {
    if (!habilitado) return;
    let cancelado = false;
    api<Pagina<Opcion>>(`${url}?tamano=100`)
      .then((r) => !cancelado && setOpciones(r.datos))
      .catch(() => !cancelado && toast.error("No fue posible cargar las opciones de los filtros."));
    return () => {
      cancelado = true;
    };
  }, [url, habilitado]);
  return opciones;
}

const DESCRIPCION_ESTADO: Record<EstadoOrden, string> = {
  BORRADOR: "Pendientes de aprobación",
  APROBADA: "Esperando mercancía",
  RECIBIDA: "Mercancía en inventario",
  CANCELADA: "No se ejecutaron",
};

export function ModuloCompras({ acciones, verSucursales }: { acciones: AccionesCompras; verSucursales: boolean }) {
  const listado = useListado<FilaOrden, RespuestaOrdenes>("/api/ordenes-compra", {
    estado: "todos", proveedorId: "todos", sucursalId: "todos", origen: "todos",
  });
  const proveedores = useOpciones("/api/proveedores", true);
  const sucursales = useOpciones("/api/sucursales", verSucursales);
  const [detalleId, setDetalleId] = useState<number | null>(null);
  const [formulario, setFormulario] = useState<{ abierto: boolean; orden: Orden | null }>({ abierto: false, orden: null });
  const resumen = listado.respuesta?.resumen;
  const columnas = 9 + (verSucursales ? 1 : 0);

  function guardada(o: Orden) {
    setFormulario({ abierto: false, orden: null });
    listado.recargar();
    setDetalleId(o.id);
  }

  return (
    <div className="space-y-4">
      {/* Resumen por estado: cada tarjeta filtra la tabla */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {ESTADOS_ORDEN.map((e) => {
          const activo = listado.filtros.estado === e;
          return (
            <button key={e} type="button" onClick={() => listado.setFiltro("estado", activo ? "todos" : e)} aria-pressed={activo}
              className={cn(
                "rounded-xl border p-4 text-left transition hover:shadow-sm focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
                COLOR_ESTADO_ORDEN[e], activo && "ring-2 ring-current",
              )}>
              <div className="text-sm font-medium">{ETIQUETA_ESTADO_ORDEN[e]}</div>
              <div className="text-2xl font-semibold tabular-nums">{resumen ? formatoNumero(resumen[e]) : "…"}</div>
              <div className="text-xs opacity-80">{activo ? "Mostrando solo este estado" : DESCRIPCION_ESTADO[e]}</div>
            </button>
          );
        })}
      </div>

      {resumen && resumen.vencidas > 0 && (
        <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-200">
          <AlertTriangle className="size-4 shrink-0" />
          {formatoNumero(resumen.vencidas)} orden(es) aprobada(s) con la fecha esperada vencida y sin recibir.
        </div>
      )}

      <Card>
        <CardContent className="space-y-4">
          <div className="flex flex-col gap-2 lg:flex-row lg:flex-wrap lg:items-center">
            <Buscador valor={listado.busqueda} onCambio={listado.setBusqueda} placeholder="Buscar por número o proveedor" />
            <NativeSelect value={listado.filtros.proveedorId} onChange={(e) => listado.setFiltro("proveedorId", e.target.value)} aria-label="Filtrar por proveedor">
              <NativeSelectOption value="todos">Todos los proveedores</NativeSelectOption>
              {proveedores.map((p) => <NativeSelectOption key={p.id} value={p.id}>{p.nombre}</NativeSelectOption>)}
            </NativeSelect>
            {verSucursales && (
              <NativeSelect value={listado.filtros.sucursalId} onChange={(e) => listado.setFiltro("sucursalId", e.target.value)} aria-label="Filtrar por sucursal">
                <NativeSelectOption value="todos">Todas las sucursales</NativeSelectOption>
                {sucursales.map((s) => <NativeSelectOption key={s.id} value={s.id}>{s.nombre}</NativeSelectOption>)}
              </NativeSelect>
            )}
            <NativeSelect value={listado.filtros.estado} onChange={(e) => listado.setFiltro("estado", e.target.value)} aria-label="Filtrar por estado">
              <NativeSelectOption value="todos">Todos los estados</NativeSelectOption>
              {ESTADOS_ORDEN.map((e) => <NativeSelectOption key={e} value={e}>{ETIQUETA_ESTADO_ORDEN[e]}</NativeSelectOption>)}
            </NativeSelect>
            <NativeSelect value={listado.filtros.origen} onChange={(e) => listado.setFiltro("origen", e.target.value)} aria-label="Filtrar por origen">
              <NativeSelectOption value="todos">Manual e IA</NativeSelectOption>
              {ORIGENES_ORDEN.map((o) => <NativeSelectOption key={o} value={o}>{ETIQUETA_ORIGEN_ORDEN[o]}</NativeSelectOption>)}
            </NativeSelect>
            {acciones.crear && (
              <Button className="lg:ml-auto" onClick={() => setFormulario({ abierto: true, orden: null })}>
                <Plus /> Nueva orden
              </Button>
            )}
          </div>

          <div className="rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>N.º</TableHead>
                  <TableHead>Creada</TableHead>
                  <TableHead>Proveedor</TableHead>
                  {verSucursales && <TableHead>Sucursal</TableHead>}
                  <TableHead className="text-right">Ítems</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead>Fecha esperada</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Origen</TableHead>
                  <TableHead className="text-right"><span className="sr-only">Acciones</span></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <FilasEstado columnas={columnas} cargando={listado.cargando} error={listado.error} vacio={listado.datos.length === 0} />
                {!listado.error && listado.datos.map((o) => (
                  <TableRow key={o.id} className="cursor-pointer" onClick={() => setDetalleId(o.id)}>
                    <TableCell className="font-mono text-xs">#{o.id}</TableCell>
                    <TableCell className="text-muted-foreground">{formatoFechaHora(o.createdAt)}</TableCell>
                    <TableCell className="max-w-56 truncate font-medium">{o.proveedor.nombre}</TableCell>
                    {verSucursales && <TableCell>{o.sucursal.nombre}</TableCell>}
                    <TableCell className="text-right tabular-nums">{o.items}</TableCell>
                    <TableCell className="text-right tabular-nums">{formatoCOP(o.total)}</TableCell>
                    <TableCell>
                      {formatoDia(o.fechaEsperada)}
                      {o.vencida && <div className="text-xs font-medium text-destructive">Vencida</div>}
                      {o.aTiempo === false && <div className="text-xs text-muted-foreground">Recibida con retraso</div>}
                    </TableCell>
                    <TableCell><InsigniaOrden estado={o.estado} /></TableCell>
                    <TableCell><InsigniaOrigen origen={o.origen} /></TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon-sm" onClick={(e) => { e.stopPropagation(); setDetalleId(o.id); }}
                        aria-label={`Ver la orden ${o.id}`} title="Ver detalle">
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

      <DetalleOrden
        ordenId={formulario.abierto ? null : detalleId}
        acciones={acciones}
        onCerrar={() => setDetalleId(null)}
        onCambio={listado.recargar}
        onEditar={(o) => setFormulario({ abierto: true, orden: o })}
      />
      <FormularioOrden
        abierto={formulario.abierto}
        orden={formulario.orden}
        onCerrar={() => setFormulario({ abierto: false, orden: null })}
        onGuardado={guardada}
      />
    </div>
  );
}
