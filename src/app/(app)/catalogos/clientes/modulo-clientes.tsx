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
import { FormularioCliente } from "./formulario-cliente";
import type { Acciones, Cliente } from "./tipos";

export function ModuloClientes({ acciones }: { acciones: Acciones }) {
  const listado = useListado<Cliente>("/api/clientes", { activo: "true" });
  const [formulario, setFormulario] = useState<{ abierto: boolean; cliente: Cliente | null }>({ abierto: false, cliente: null });
  const [aDesactivar, setADesactivar] = useState<Cliente | null>(null);

  async function desactivar(cliente: Cliente) {
    try {
      const r = await api<{ resultado: string }>(`/api/clientes/${cliente.id}`, { method: "DELETE" });
      toast.success(r.resultado === "eliminado"
        ? "Cliente eliminado."
        : "Cliente desactivado: tiene ventas asociadas.");
      listado.recargar();
    } catch (e) {
      toast.error(e instanceof ErrorCliente ? e.message : "No fue posible desactivar el cliente.");
    } finally {
      setADesactivar(null);
    }
  }

  async function reactivar(cliente: Cliente) {
    try {
      await api(`/api/clientes/${cliente.id}`, { method: "PATCH", json: { activo: true } });
      toast.success("Cliente reactivado.");
      listado.recargar();
    } catch (e) {
      toast.error(e instanceof ErrorCliente ? e.message : "No fue posible reactivar el cliente.");
    }
  }

  const columnas = acciones.editar || acciones.eliminar ? 6 : 5;

  return (
    <Card>
      <CardContent className="space-y-4">
        <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-col gap-2 sm:flex-row">
            <Buscador valor={listado.busqueda} onCambio={listado.setBusqueda} placeholder="Buscar por documento o nombre" />
            <NativeSelect value={listado.filtros.activo} onChange={(e) => listado.setFiltro("activo", e.target.value)} aria-label="Filtrar por estado">
              <NativeSelectOption value="true">Activos</NativeSelectOption>
              <NativeSelectOption value="false">Inactivos</NativeSelectOption>
              <NativeSelectOption value="todos">Todos</NativeSelectOption>
            </NativeSelect>
          </div>
          {acciones.crear && (
            <Button onClick={() => setFormulario({ abierto: true, cliente: null })}>
              <Plus /> Nuevo cliente
            </Button>
          )}
        </div>

        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Documento</TableHead>
                <TableHead>Nombre</TableHead>
                <TableHead>Correo</TableHead>
                <TableHead>Teléfono</TableHead>
                <TableHead>Estado</TableHead>
                {columnas === 6 && <TableHead className="text-right">Acciones</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              <FilasEstado columnas={columnas} cargando={listado.cargando} error={listado.error} vacio={listado.datos.length === 0} />
              {!listado.error && listado.datos.map((cliente) => (
                <TableRow key={cliente.id}>
                  <TableCell className="font-mono text-xs">{cliente.documento}</TableCell>
                  <TableCell className="font-medium">{cliente.nombre}</TableCell>
                  <TableCell className="max-w-48 truncate" title={cliente.email ?? ""}>{cliente.email ?? "—"}</TableCell>
                  <TableCell>{cliente.telefono ?? "—"}</TableCell>
                  <TableCell><InsigniaEstado activo={cliente.activo} /></TableCell>
                  {columnas === 6 && (
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        {acciones.editar && (
                          <Button variant="ghost" size="icon-sm" onClick={() => setFormulario({ abierto: true, cliente })} aria-label={`Editar ${cliente.nombre}`} title="Editar">
                            <Pencil />
                          </Button>
                        )}
                        {acciones.eliminar && cliente.activo && (
                          <Button variant="ghost" size="icon-sm" onClick={() => setADesactivar(cliente)} aria-label={`Desactivar ${cliente.nombre}`} title="Desactivar">
                            <PowerOff />
                          </Button>
                        )}
                        {acciones.editar && !cliente.activo && (
                          <Button variant="ghost" size="icon-sm" onClick={() => reactivar(cliente)} aria-label={`Reactivar ${cliente.nombre}`} title="Reactivar">
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

      <FormularioCliente
        abierto={formulario.abierto}
        cliente={formulario.cliente}
        onCerrar={() => setFormulario({ abierto: false, cliente: null })}
        onGuardado={listado.recargar}
      />
      <ConfirmarAccion
        abierto={aDesactivar !== null}
        onCambio={(v) => !v && setADesactivar(null)}
        titulo="¿Desactivar este cliente?"
        descripcion={`"${aDesactivar?.nombre ?? ""}" quedará inactivo si tiene ventas asociadas; si no tiene historial, se eliminará definitivamente.`}
        textoAccion="Desactivar"
        onConfirmar={() => aDesactivar && desactivar(aDesactivar)}
      />
    </Card>
  );
}
