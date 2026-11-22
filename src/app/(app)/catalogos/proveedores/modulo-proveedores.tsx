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
import { FormularioProveedor } from "./formulario-proveedor";
import type { Acciones, Proveedor } from "./tipos";

export function ModuloProveedores({ acciones }: { acciones: Acciones }) {
  const listado = useListado<Proveedor>("/api/proveedores", { activo: "true" });
  const [formulario, setFormulario] = useState<{ abierto: boolean; proveedor: Proveedor | null }>({ abierto: false, proveedor: null });
  const [aDesactivar, setADesactivar] = useState<Proveedor | null>(null);

  async function desactivar(proveedor: Proveedor) {
    try {
      const r = await api<{ resultado: string }>(`/api/proveedores/${proveedor.id}`, { method: "DELETE" });
      toast.success(r.resultado === "eliminado"
        ? "Proveedor eliminado."
        : "Proveedor desactivado: tiene historial asociado.");
      listado.recargar();
    } catch (e) {
      toast.error(e instanceof ErrorCliente ? e.message : "No fue posible desactivar el proveedor.");
    } finally {
      setADesactivar(null);
    }
  }

  async function reactivar(proveedor: Proveedor) {
    try {
      await api(`/api/proveedores/${proveedor.id}`, { method: "PATCH", json: { activo: true } });
      toast.success("Proveedor reactivado.");
      listado.recargar();
    } catch (e) {
      toast.error(e instanceof ErrorCliente ? e.message : "No fue posible reactivar el proveedor.");
    }
  }

  const columnas = acciones.editar || acciones.eliminar ? 9 : 8;

  return (
    <Card>
      <CardContent className="space-y-4">
        <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-col gap-2 sm:flex-row">
            <Buscador valor={listado.busqueda} onCambio={listado.setBusqueda} placeholder="Buscar por NIT o nombre" />
            <NativeSelect value={listado.filtros.activo} onChange={(e) => listado.setFiltro("activo", e.target.value)} aria-label="Filtrar por estado">
              <NativeSelectOption value="true">Activos</NativeSelectOption>
              <NativeSelectOption value="false">Inactivos</NativeSelectOption>
              <NativeSelectOption value="todos">Todos</NativeSelectOption>
            </NativeSelect>
          </div>
          {acciones.crear && (
            <Button onClick={() => setFormulario({ abierto: true, proveedor: null })}>
              <Plus /> Nuevo proveedor
            </Button>
          )}
        </div>

        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>NIT</TableHead>
                <TableHead>Nombre</TableHead>
                <TableHead>Contacto</TableHead>
                <TableHead>Teléfono</TableHead>
                <TableHead>Correo</TableHead>
                <TableHead className="text-right">Tiempo (días)</TableHead>
                <TableHead className="text-right">Productos</TableHead>
                <TableHead>Estado</TableHead>
                {columnas === 9 && <TableHead className="text-right">Acciones</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              <FilasEstado columnas={columnas} cargando={listado.cargando} error={listado.error} vacio={listado.datos.length === 0} />
              {!listado.error && listado.datos.map((proveedor) => (
                <TableRow key={proveedor.id}>
                  <TableCell className="font-mono text-xs">{proveedor.nit}</TableCell>
                  <TableCell className="font-medium">{proveedor.nombre}</TableCell>
                  <TableCell>{proveedor.contacto ?? "—"}</TableCell>
                  <TableCell>{proveedor.telefono ?? "—"}</TableCell>
                  <TableCell className="max-w-48 truncate" title={proveedor.email ?? ""}>{proveedor.email ?? "—"}</TableCell>
                  <TableCell className="text-right tabular-nums">{proveedor.tiempoEntregaDias}</TableCell>
                  <TableCell className="text-right tabular-nums">{proveedor.productos}</TableCell>
                  <TableCell><InsigniaEstado activo={proveedor.activo} /></TableCell>
                  {columnas === 9 && (
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        {acciones.editar && (
                          <Button variant="ghost" size="icon-sm" onClick={() => setFormulario({ abierto: true, proveedor })} aria-label={`Editar ${proveedor.nombre}`} title="Editar">
                            <Pencil />
                          </Button>
                        )}
                        {acciones.eliminar && proveedor.activo && (
                          <Button variant="ghost" size="icon-sm" onClick={() => setADesactivar(proveedor)} aria-label={`Desactivar ${proveedor.nombre}`} title="Desactivar">
                            <PowerOff />
                          </Button>
                        )}
                        {acciones.editar && !proveedor.activo && (
                          <Button variant="ghost" size="icon-sm" onClick={() => reactivar(proveedor)} aria-label={`Reactivar ${proveedor.nombre}`} title="Reactivar">
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

      <FormularioProveedor
        abierto={formulario.abierto}
        proveedor={formulario.proveedor}
        onCerrar={() => setFormulario({ abierto: false, proveedor: null })}
        onGuardado={listado.recargar}
      />
      <ConfirmarAccion
        abierto={aDesactivar !== null}
        onCambio={(v) => !v && setADesactivar(null)}
        titulo="¿Desactivar este proveedor?"
        descripcion={`"${aDesactivar?.nombre ?? ""}" dejará de estar disponible si tiene historial asociado; si no tiene historial, se eliminará definitivamente.`}
        textoAccion="Desactivar"
        onConfirmar={() => aDesactivar && desactivar(aDesactivar)}
      />
    </Card>
  );
}
