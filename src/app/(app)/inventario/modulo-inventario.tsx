"use client";

import { useEffect, useState } from "react";
import { ArrowUpDown, History, SlidersHorizontal } from "lucide-react";
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
import { formatoNumero } from "@/lib/formato";
import type { Pagina } from "@/lib/esquemas/comunes";
import { ESTADOS_INVENTARIO, ETIQUETA_ESTADO_INVENTARIO, type EstadoInventario } from "@/lib/esquemas/inventario";
import { COLOR_ESTADO, InsigniaInventario } from "./insignia-inventario";
import { DialogoUmbrales } from "./dialogo-umbrales";
import { DialogoAjuste } from "./dialogo-ajuste";
import { DialogoKardex } from "./dialogo-kardex";
import type { AccionesInventario, FilaInventario, Opcion, RespuestaInventario } from "./tipos";

/** Opciones para filtros; solo se consultan si el rol puede leer el recurso (DEF-01). */
function useOpciones(url: string, habilitado: boolean) {
  const [opciones, setOpciones] = useState<Opcion[]>([]);
  useEffect(() => {
    if (!habilitado) return;
    let cancelado = false;
    api<Pagina<Opcion>>(`${url}?activo=true&tamano=100`)
      .then((r) => {
        if (!cancelado) setOpciones(r.datos);
      })
      .catch(() => {
        if (!cancelado) toast.error("No fue posible cargar las opciones de los filtros.");
      });
    return () => {
      cancelado = true;
    };
  }, [url, habilitado]);
  return opciones;
}

type Dialogo = { tipo: "umbrales" | "ajuste" | "kardex"; fila: FilaInventario } | null;

export function ModuloInventario({
  acciones, verSucursales, verCategorias,
}: {
  acciones: AccionesInventario;
  verSucursales: boolean;
  verCategorias: boolean;
}) {
  const listado = useListado<FilaInventario, RespuestaInventario>("/api/inventario", {
    estado: "todos", sucursalId: "todos", categoriaId: "todos",
  });
  const sucursales = useOpciones("/api/sucursales", verSucursales);
  const categorias = useOpciones("/api/categorias", verCategorias);
  const [dialogo, setDialogo] = useState<Dialogo>(null);
  const resumen = listado.respuesta?.resumen;
  const conAcciones = acciones.umbrales || acciones.ajustar || acciones.kardex;
  const columnas = 7 + (verSucursales ? 1 : 0) + (conAcciones ? 1 : 0);

  return (
    <div className="space-y-4">
      {/* Resumen por estado (RN-12): cada tarjeta filtra la tabla */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {ESTADOS_INVENTARIO.map((e: EstadoInventario) => {
          const activo = listado.filtros.estado === e;
          return (
            <button
              key={e}
              type="button"
              onClick={() => listado.setFiltro("estado", activo ? "todos" : e)}
              className={cn(
                "rounded-xl border p-4 text-left transition hover:shadow-sm focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
                COLOR_ESTADO[e],
                activo && "ring-2 ring-current",
              )}
              aria-pressed={activo}
            >
              <div className="text-sm font-medium">{ETIQUETA_ESTADO_INVENTARIO[e]}</div>
              <div className="text-2xl font-semibold tabular-nums">{resumen ? formatoNumero(resumen[e]) : "…"}</div>
              <div className="text-xs opacity-80">{activo ? "Mostrando solo este estado" : "Clic para filtrar"}</div>
            </button>
          );
        })}
      </div>

      <Card>
        <CardContent className="space-y-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
            <Buscador valor={listado.busqueda} onCambio={listado.setBusqueda} placeholder="Buscar por SKU o producto" />
            {verSucursales && (
              <NativeSelect value={listado.filtros.sucursalId} onChange={(e) => listado.setFiltro("sucursalId", e.target.value)} aria-label="Filtrar por sucursal">
                <NativeSelectOption value="todos">Todas las sucursales</NativeSelectOption>
                {sucursales.map((s) => (
                  <NativeSelectOption key={s.id} value={s.id}>{s.nombre}</NativeSelectOption>
                ))}
              </NativeSelect>
            )}
            {verCategorias && (
              <NativeSelect value={listado.filtros.categoriaId} onChange={(e) => listado.setFiltro("categoriaId", e.target.value)} aria-label="Filtrar por categoría">
                <NativeSelectOption value="todos">Todas las categorías</NativeSelectOption>
                {categorias.map((c) => (
                  <NativeSelectOption key={c.id} value={c.id}>{c.nombre}</NativeSelectOption>
                ))}
              </NativeSelect>
            )}
            <NativeSelect value={listado.filtros.estado} onChange={(e) => listado.setFiltro("estado", e.target.value)} aria-label="Filtrar por estado">
              <NativeSelectOption value="todos">Todos los estados</NativeSelectOption>
              {ESTADOS_INVENTARIO.map((e) => (
                <NativeSelectOption key={e} value={e}>{ETIQUETA_ESTADO_INVENTARIO[e]}</NativeSelectOption>
              ))}
            </NativeSelect>
          </div>

          <div className="rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>SKU</TableHead>
                  <TableHead>Producto</TableHead>
                  {verSucursales && <TableHead>Sucursal</TableHead>}
                  <TableHead className="text-right">Stock</TableHead>
                  <TableHead className="text-right">Mínimo</TableHead>
                  <TableHead className="text-right">Máximo</TableHead>
                  <TableHead>Unidad</TableHead>
                  <TableHead>Estado</TableHead>
                  {conAcciones && <TableHead className="text-right">Acciones</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                <FilasEstado columnas={columnas} cargando={listado.cargando} error={listado.error} vacio={listado.datos.length === 0} />
                {!listado.error &&
                  listado.datos.map((f) => (
                    <TableRow key={f.id}>
                      <TableCell className="font-mono text-xs">{f.producto.sku}</TableCell>
                      <TableCell>
                        <div className="font-medium">{f.producto.nombre}</div>
                        <div className="text-xs text-muted-foreground">{f.producto.categoria.nombre}</div>
                      </TableCell>
                      {verSucursales && <TableCell>{f.sucursal.nombre}</TableCell>}
                      <TableCell className="text-right font-semibold tabular-nums">{formatoNumero(f.stock)}</TableCell>
                      <TableCell className="text-right tabular-nums text-muted-foreground">{formatoNumero(f.stockMinimo)}</TableCell>
                      <TableCell className="text-right tabular-nums text-muted-foreground">{formatoNumero(f.stockMaximo)}</TableCell>
                      <TableCell className="text-muted-foreground">{f.producto.unidad}</TableCell>
                      <TableCell><InsigniaInventario estado={f.estado} /></TableCell>
                      {conAcciones && (
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            {acciones.ajustar && (
                              <Button variant="ghost" size="icon-sm" onClick={() => setDialogo({ tipo: "ajuste", fila: f })} title="Ajustar existencias" aria-label={`Ajustar existencias de ${f.producto.nombre}`}>
                                <ArrowUpDown />
                              </Button>
                            )}
                            {acciones.umbrales && (
                              <Button variant="ghost" size="icon-sm" onClick={() => setDialogo({ tipo: "umbrales", fila: f })} title="Mínimo y máximo" aria-label={`Cambiar mínimo y máximo de ${f.producto.nombre}`}>
                                <SlidersHorizontal />
                              </Button>
                            )}
                            {acciones.kardex && (
                              <Button variant="ghost" size="icon-sm" onClick={() => setDialogo({ tipo: "kardex", fila: f })} title="Kardex" aria-label={`Ver kardex de ${f.producto.nombre}`}>
                                <History />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
          </div>

          <Paginacion pagina={listado.pagina} tamano={listado.tamano} total={listado.total} onCambio={listado.setPagina} />
        </CardContent>
      </Card>

      <DialogoUmbrales fila={dialogo?.tipo === "umbrales" ? dialogo.fila : null} onCerrar={() => setDialogo(null)} onGuardado={listado.recargar} />
      <DialogoAjuste fila={dialogo?.tipo === "ajuste" ? dialogo.fila : null} onCerrar={() => setDialogo(null)} onGuardado={listado.recargar} />
      <DialogoKardex fila={dialogo?.tipo === "kardex" ? dialogo.fila : null} onCerrar={() => setDialogo(null)} />
    </div>
  );
}
