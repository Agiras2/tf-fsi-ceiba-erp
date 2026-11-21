"use client";

import { useEffect, useState } from "react";
import { Pencil, Plus, Power, PowerOff } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Buscador } from "@/components/comun/buscador";
import { ConfirmarAccion } from "@/components/comun/confirmar-accion";
import { FilasEstado } from "@/components/comun/filas-estado";
import { InsigniaEstado } from "@/components/comun/insignia-estado";
import { Paginacion } from "@/components/comun/paginacion";
import { useListado } from "@/hooks/use-listado";
import { api, ErrorCliente } from "@/lib/api-cliente";
import { formatoCOP } from "@/lib/formato";
import type { Pagina } from "@/lib/esquemas/comunes";
import { FormularioProducto } from "./formulario-producto";
import type { Acciones, Opcion, Producto } from "./tipos";

/** Carga una lista corta de opciones activas para selects (categorias, proveedores). */
function useOpciones(url: string) {
  const [opciones, setOpciones] = useState<Opcion[]>([]);
  useEffect(() => {
    api<Pagina<Opcion>>(`${url}?activo=true&tamano=100`)
      .then((r) => setOpciones(r.datos))
      .catch(() => toast.error("No fue posible cargar las opciones del formulario."));
  }, [url]);
  return opciones;
}

export function ModuloProductos({ acciones }: { acciones: Acciones }) {
  const listado = useListado<Producto>("/api/productos", { activo: "true", categoriaId: "todos", proveedorId: "todos" });
  const categorias = useOpciones("/api/categorias");
  const proveedores = useOpciones("/api/proveedores");
  const [formulario, setFormulario] = useState<{ abierto: boolean; producto: Producto | null }>({ abierto: false, producto: null });
  const [aDesactivar, setADesactivar] = useState<Producto | null>(null);

  async function desactivar(p: Producto) {
    try {
      const r = await api<{ resultado: string }>(`/api/productos/${p.id}`, { method: "DELETE" });
      toast.success(r.resultado === "eliminado" ? "Producto eliminado." : "Producto desactivado: tiene historial de ventas o movimientos.");
      listado.recargar();
    } catch (e) {
      toast.error(e instanceof ErrorCliente ? e.message : "No fue posible desactivar el producto.");
    } finally {
      setADesactivar(null);
    }
  }

  async function reactivar(p: Producto) {
    try {
      await api(`/api/productos/${p.id}`, { method: "PATCH", json: { activo: true } });
      toast.success("Producto reactivado.");
      listado.recargar();
    } catch (e) {
      toast.error(e instanceof ErrorCliente ? e.message : "No fue posible reactivar el producto.");
    }
  }

  const columnas = acciones.editar || acciones.eliminar ? 9 : 8;

  return (
    <Card>
      <CardContent className="space-y-4">
        <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
            <Buscador valor={listado.busqueda} onCambio={listado.setBusqueda} placeholder="Buscar por SKU o nombre" />
            <NativeSelect value={listado.filtros.categoriaId} onChange={(e) => listado.setFiltro("categoriaId", e.target.value)} aria-label="Filtrar por categoría">
              <NativeSelectOption value="todos">Todas las categorías</NativeSelectOption>
              {categorias.map((c) => (
                <NativeSelectOption key={c.id} value={c.id}>{c.nombre}</NativeSelectOption>
              ))}
            </NativeSelect>
            <NativeSelect value={listado.filtros.proveedorId} onChange={(e) => listado.setFiltro("proveedorId", e.target.value)} aria-label="Filtrar por proveedor">
              <NativeSelectOption value="todos">Todos los proveedores</NativeSelectOption>
              {proveedores.map((p) => (
                <NativeSelectOption key={p.id} value={p.id}>{p.nombre}</NativeSelectOption>
              ))}
            </NativeSelect>
            <NativeSelect value={listado.filtros.activo} onChange={(e) => listado.setFiltro("activo", e.target.value)} aria-label="Filtrar por estado">
              <NativeSelectOption value="true">Activos</NativeSelectOption>
              <NativeSelectOption value="false">Inactivos</NativeSelectOption>
              <NativeSelectOption value="todos">Todos</NativeSelectOption>
            </NativeSelect>
          </div>
          {acciones.crear && (
            <Button onClick={() => setFormulario({ abierto: true, producto: null })}>
              <Plus /> Nuevo producto
            </Button>
          )}
        </div>

        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>SKU</TableHead>
                <TableHead>Nombre</TableHead>
                <TableHead>Categoría</TableHead>
                <TableHead>Proveedor</TableHead>
                <TableHead className="text-right">Costo</TableHead>
                <TableHead className="text-right">Precio</TableHead>
                <TableHead className="text-right">Margen</TableHead>
                <TableHead>Estado</TableHead>
                {columnas === 9 && <TableHead className="text-right">Acciones</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              <FilasEstado columnas={columnas} cargando={listado.cargando} error={listado.error} vacio={listado.datos.length === 0} />
              {!listado.error &&
                listado.datos.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-mono text-xs">{p.sku}</TableCell>
                    <TableCell>
                      <div className="font-medium">{p.nombre}</div>
                      <div className="text-xs text-muted-foreground">{p.unidad}</div>
                    </TableCell>
                    <TableCell>{p.categoria.nombre}</TableCell>
                    <TableCell className="max-w-48 truncate" title={p.proveedor.nombre}>{p.proveedor.nombre}</TableCell>
                    <TableCell className="text-right tabular-nums">{formatoCOP(p.costo)}</TableCell>
                    <TableCell className="text-right tabular-nums">{formatoCOP(p.precio)}</TableCell>
                    <TableCell className="text-right tabular-nums">{(((p.precio - p.costo) / p.precio) * 100).toFixed(1)} %</TableCell>
                    <TableCell><InsigniaEstado activo={p.activo} /></TableCell>
                    {columnas === 9 && (
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          {acciones.editar && (
                            <Button variant="ghost" size="icon-sm" onClick={() => setFormulario({ abierto: true, producto: p })} aria-label={`Editar ${p.nombre}`} title="Editar">
                              <Pencil />
                            </Button>
                          )}
                          {acciones.eliminar && p.activo && (
                            <Button variant="ghost" size="icon-sm" onClick={() => setADesactivar(p)} aria-label={`Desactivar ${p.nombre}`} title="Desactivar">
                              <PowerOff />
                            </Button>
                          )}
                          {acciones.editar && !p.activo && (
                            <Button variant="ghost" size="icon-sm" onClick={() => reactivar(p)} aria-label={`Reactivar ${p.nombre}`} title="Reactivar">
                              <Power />
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

      <FormularioProducto
        abierto={formulario.abierto}
        producto={formulario.producto}
        categorias={categorias}
        proveedores={proveedores}
        onCerrar={() => setFormulario({ abierto: false, producto: null })}
        onGuardado={listado.recargar}
      />
      <ConfirmarAccion
        abierto={aDesactivar !== null}
        onCambio={(v) => !v && setADesactivar(null)}
        titulo="¿Desactivar este producto?"
        descripcion={`"${aDesactivar?.nombre ?? ""}" dejará de estar disponible para ventas y pedidos. Si no tiene historial, se eliminará definitivamente.`}
        textoAccion="Desactivar"
        onConfirmar={() => aDesactivar && desactivar(aDesactivar)}
      />
    </Card>
  );
}
