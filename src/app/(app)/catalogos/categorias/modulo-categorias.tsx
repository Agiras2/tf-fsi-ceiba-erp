"use client";

import { useState } from "react";
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
import { FormularioCategoria } from "./formulario-categoria";
import type { Acciones, Categoria } from "./tipos";

export function ModuloCategorias({ acciones }: { acciones: Acciones }) {
  const listado = useListado<Categoria>("/api/categorias", { activo: "true" });
  const [formulario, setFormulario] = useState<{ abierto: boolean; categoria: Categoria | null }>({ abierto: false, categoria: null });
  const [aDesactivar, setADesactivar] = useState<Categoria | null>(null);

  async function desactivar(categoria: Categoria) {
    try {
      const r = await api<{ resultado: string }>(`/api/categorias/${categoria.id}`, { method: "DELETE" });
      toast.success(r.resultado === "eliminado"
        ? "Categoría eliminada."
        : "Categoría desactivada: tiene productos asociados.");
      listado.recargar();
    } catch (e) {
      toast.error(e instanceof ErrorCliente ? e.message : "No fue posible desactivar la categoría.");
    } finally {
      setADesactivar(null);
    }
  }

  async function reactivar(categoria: Categoria) {
    try {
      await api(`/api/categorias/${categoria.id}`, { method: "PATCH", json: { activo: true } });
      toast.success("Categoría reactivada.");
      listado.recargar();
    } catch (e) {
      toast.error(e instanceof ErrorCliente ? e.message : "No fue posible reactivar la categoría.");
    }
  }

  const columnas = acciones.editar || acciones.eliminar ? 5 : 4;

  return (
    <Card>
      <CardContent className="space-y-4">
        <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-col gap-2 sm:flex-row">
            <Buscador valor={listado.busqueda} onCambio={listado.setBusqueda} placeholder="Buscar por nombre" />
            <NativeSelect value={listado.filtros.activo} onChange={(e) => listado.setFiltro("activo", e.target.value)} aria-label="Filtrar por estado">
              <NativeSelectOption value="true">Activas</NativeSelectOption>
              <NativeSelectOption value="false">Inactivas</NativeSelectOption>
              <NativeSelectOption value="todos">Todas</NativeSelectOption>
            </NativeSelect>
          </div>
          {acciones.crear && (
            <Button onClick={() => setFormulario({ abierto: true, categoria: null })}>
              <Plus /> Nueva categoría
            </Button>
          )}
        </div>

        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre</TableHead>
                <TableHead>Descripción</TableHead>
                <TableHead className="text-right">Productos</TableHead>
                <TableHead>Estado</TableHead>
                {columnas === 5 && <TableHead className="text-right">Acciones</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              <FilasEstado columnas={columnas} cargando={listado.cargando} error={listado.error} vacio={listado.datos.length === 0} />
              {!listado.error && listado.datos.map((categoria) => (
                <TableRow key={categoria.id}>
                  <TableCell className="font-medium">{categoria.nombre}</TableCell>
                  <TableCell className="max-w-96 truncate" title={categoria.descripcion ?? ""}>{categoria.descripcion ?? "—"}</TableCell>
                  <TableCell className="text-right tabular-nums">{categoria.productos}</TableCell>
                  <TableCell><InsigniaEstado activo={categoria.activo} /></TableCell>
                  {columnas === 5 && (
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        {acciones.editar && (
                          <Button variant="ghost" size="icon-sm" onClick={() => setFormulario({ abierto: true, categoria })} aria-label={`Editar ${categoria.nombre}`} title="Editar">
                            <Pencil />
                          </Button>
                        )}
                        {acciones.eliminar && categoria.activo && (
                          <Button variant="ghost" size="icon-sm" onClick={() => setADesactivar(categoria)} aria-label={`Desactivar ${categoria.nombre}`} title="Desactivar">
                            <PowerOff />
                          </Button>
                        )}
                        {acciones.editar && !categoria.activo && (
                          <Button variant="ghost" size="icon-sm" onClick={() => reactivar(categoria)} aria-label={`Reactivar ${categoria.nombre}`} title="Reactivar">
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

      <FormularioCategoria
        abierto={formulario.abierto}
        categoria={formulario.categoria}
        onCerrar={() => setFormulario({ abierto: false, categoria: null })}
        onGuardado={listado.recargar}
      />
      <ConfirmarAccion
        abierto={aDesactivar !== null}
        onCambio={(v) => !v && setADesactivar(null)}
        titulo="¿Desactivar esta categoría?"
        descripcion={`"${aDesactivar?.nombre ?? ""}" podría desactivarse si tiene productos asociados; si no tiene historial, se eliminará definitivamente.`}
        textoAccion="Desactivar"
        onConfirmar={() => aDesactivar && desactivar(aDesactivar)}
      />
    </Card>
  );
}
