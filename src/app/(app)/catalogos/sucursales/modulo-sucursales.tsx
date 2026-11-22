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
import { FormularioSucursal } from "./formulario-sucursal";
import type { Acciones, Sucursal } from "./tipos";

export function ModuloSucursales({ acciones }: { acciones: Acciones }) {
  const listado = useListado<Sucursal>("/api/sucursales", { activo: "true" });
  const [formulario, setFormulario] = useState<{ abierto: boolean; sucursal: Sucursal | null }>({ abierto: false, sucursal: null });
  const [aDesactivar, setADesactivar] = useState<Sucursal | null>(null);

  async function desactivar(sucursal: Sucursal) {
    try {
      const r = await api<{ resultado: string }>(`/api/sucursales/${sucursal.id}`, { method: "DELETE" });
      toast.success(r.resultado === "eliminado"
        ? "Sucursal eliminada."
        : "Sucursal desactivada: tiene historial asociado.");
      listado.recargar();
    } catch (e) {
      toast.error(e instanceof ErrorCliente ? e.message : "No fue posible desactivar la sucursal.");
    } finally {
      setADesactivar(null);
    }
  }

  async function reactivar(sucursal: Sucursal) {
    try {
      await api(`/api/sucursales/${sucursal.id}`, { method: "PATCH", json: { activa: true } });
      toast.success("Sucursal reactivada.");
      listado.recargar();
    } catch (e) {
      toast.error(e instanceof ErrorCliente ? e.message : "No fue posible reactivar la sucursal.");
    }
  }

  const columnas = acciones.editar || acciones.eliminar ? 6 : 5;

  return (
    <Card>
      <CardContent className="space-y-4">
        <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-col gap-2 sm:flex-row">
            <Buscador valor={listado.busqueda} onCambio={listado.setBusqueda} placeholder="Buscar por código o nombre" />
            <NativeSelect value={listado.filtros.activo} onChange={(e) => listado.setFiltro("activo", e.target.value)} aria-label="Filtrar por estado">
              <NativeSelectOption value="true">Activas</NativeSelectOption>
              <NativeSelectOption value="false">Inactivas</NativeSelectOption>
              <NativeSelectOption value="todos">Todas</NativeSelectOption>
            </NativeSelect>
          </div>
          {acciones.crear && (
            <Button onClick={() => setFormulario({ abierto: true, sucursal: null })}>
              <Plus /> Nueva sucursal
            </Button>
          )}
        </div>

        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Código</TableHead>
                <TableHead>Nombre</TableHead>
                <TableHead>Ciudad</TableHead>
                <TableHead>Dirección</TableHead>
                <TableHead>Estado</TableHead>
                {columnas === 6 && <TableHead className="text-right">Acciones</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              <FilasEstado columnas={columnas} cargando={listado.cargando} error={listado.error} vacio={listado.datos.length === 0} />
              {!listado.error && listado.datos.map((sucursal) => (
                <TableRow key={sucursal.id}>
                  <TableCell className="font-mono text-xs">{sucursal.codigo}</TableCell>
                  <TableCell className="font-medium">{sucursal.nombre}</TableCell>
                  <TableCell>{sucursal.ciudad}</TableCell>
                  <TableCell className="max-w-72 truncate" title={sucursal.direccion}>{sucursal.direccion}</TableCell>
                  <TableCell><InsigniaEstado activo={sucursal.activa} /></TableCell>
                  {columnas === 6 && (
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        {acciones.editar && (
                          <Button variant="ghost" size="icon-sm" onClick={() => setFormulario({ abierto: true, sucursal })} aria-label={`Editar ${sucursal.nombre}`} title="Editar">
                            <Pencil />
                          </Button>
                        )}
                        {acciones.eliminar && sucursal.activa && (
                          <Button variant="ghost" size="icon-sm" onClick={() => setADesactivar(sucursal)} aria-label={`Desactivar ${sucursal.nombre}`} title="Desactivar">
                            <PowerOff />
                          </Button>
                        )}
                        {acciones.editar && !sucursal.activa && (
                          <Button variant="ghost" size="icon-sm" onClick={() => reactivar(sucursal)} aria-label={`Reactivar ${sucursal.nombre}`} title="Reactivar">
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

      <FormularioSucursal
        abierto={formulario.abierto}
        sucursal={formulario.sucursal}
        onCerrar={() => setFormulario({ abierto: false, sucursal: null })}
        onGuardado={listado.recargar}
      />
      <ConfirmarAccion
        abierto={aDesactivar !== null}
        onCambio={(v) => !v && setADesactivar(null)}
        titulo="¿Desactivar esta sucursal?"
        descripcion={`"${aDesactivar?.nombre ?? ""}" quedará inactiva si tiene historial asociado; si no tiene historial, se eliminará definitivamente.`}
        textoAccion="Desactivar"
        onConfirmar={() => aDesactivar && desactivar(aDesactivar)}
      />
    </Card>
  );
}
