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
import { formatoFechaHora } from "@/lib/formato";
import { ETIQUETA_ROL, ROLES } from "@/lib/navegacion";
import { FormularioUsuario } from "./formulario-usuario";
import type { Acciones, Usuario } from "./tipos";

export function ModuloUsuarios({
  acciones, usuarioId,
}: {
  acciones: Acciones;
  usuarioId: number;
}) {
  const listado = useListado<Usuario>("/api/usuarios", { activo: "true", rol: "todos" });
  const [formulario, setFormulario] = useState<{ abierto: boolean; usuario: Usuario | null }>({ abierto: false, usuario: null });
  const [aDesactivar, setADesactivar] = useState<Usuario | null>(null);

  async function desactivar(usuario: Usuario) {
    try {
      const r = await api<{ resultado: string }>(`/api/usuarios/${usuario.id}`, { method: "DELETE" });
      toast.success(r.resultado === "eliminado" ? "Usuario eliminado." : "Usuario desactivado.");
      listado.recargar();
    } catch (e) {
      toast.error(e instanceof ErrorCliente ? e.message : "No fue posible desactivar el usuario.");
    } finally {
      setADesactivar(null);
    }
  }

  async function reactivar(usuario: Usuario) {
    try {
      await api(`/api/usuarios/${usuario.id}`, { method: "PATCH", json: { activo: true } });
      toast.success("Usuario reactivado.");
      listado.recargar();
    } catch (e) {
      toast.error(e instanceof ErrorCliente ? e.message : "No fue posible reactivar el usuario.");
    }
  }

  const columnas = acciones.editar || acciones.eliminar ? 7 : 6;

  return (
    <Card>
      <CardContent className="space-y-4">
        <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
            <Buscador valor={listado.busqueda} onCambio={listado.setBusqueda} placeholder="Buscar por nombre o correo" />
            <NativeSelect value={listado.filtros.rol} onChange={(e) => listado.setFiltro("rol", e.target.value)} aria-label="Filtrar por rol">
              <NativeSelectOption value="todos">Todos los roles</NativeSelectOption>
              {ROLES.map((rol) => (
                <NativeSelectOption key={rol} value={rol}>{ETIQUETA_ROL[rol]}</NativeSelectOption>
              ))}
            </NativeSelect>
            <NativeSelect value={listado.filtros.activo} onChange={(e) => listado.setFiltro("activo", e.target.value)} aria-label="Filtrar por estado">
              <NativeSelectOption value="true">Activos</NativeSelectOption>
              <NativeSelectOption value="false">Inactivos</NativeSelectOption>
              <NativeSelectOption value="todos">Todos</NativeSelectOption>
            </NativeSelect>
          </div>
          {acciones.crear && (
            <Button onClick={() => setFormulario({ abierto: true, usuario: null })}>
              <Plus /> Nuevo usuario
            </Button>
          )}
        </div>

        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre</TableHead>
                <TableHead>Correo</TableHead>
                <TableHead>Rol</TableHead>
                <TableHead>Sucursal</TableHead>
                <TableHead>Último acceso</TableHead>
                <TableHead>Estado</TableHead>
                {columnas === 7 && <TableHead className="text-right">Acciones</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              <FilasEstado columnas={columnas} cargando={listado.cargando} error={listado.error} vacio={listado.datos.length === 0} />
              {!listado.error && listado.datos.map((usuario) => (
                <TableRow key={usuario.id}>
                  <TableCell className="font-medium">{usuario.nombre}</TableCell>
                  <TableCell className="max-w-48 truncate" title={usuario.email}>{usuario.email}</TableCell>
                  <TableCell>{ETIQUETA_ROL[usuario.rol]}</TableCell>
                  <TableCell>{usuario.sucursal?.nombre ?? "Todas"}</TableCell>
                  <TableCell>{usuario.ultimoAcceso ? formatoFechaHora(usuario.ultimoAcceso) : "Nunca"}</TableCell>
                  <TableCell><InsigniaEstado activo={usuario.activo} /></TableCell>
                  {columnas === 7 && (
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        {acciones.editar && (
                          <Button variant="ghost" size="icon-sm" onClick={() => setFormulario({ abierto: true, usuario })} aria-label={`Editar ${usuario.nombre}`} title="Editar">
                            <Pencil />
                          </Button>
                        )}
                        {acciones.eliminar && usuario.activo && usuario.id !== usuarioId && (
                          <Button variant="ghost" size="icon-sm" onClick={() => setADesactivar(usuario)} aria-label={`Desactivar ${usuario.nombre}`} title="Desactivar">
                            <PowerOff />
                          </Button>
                        )}
                        {acciones.editar && !usuario.activo && (
                          <Button variant="ghost" size="icon-sm" onClick={() => reactivar(usuario)} aria-label={`Reactivar ${usuario.nombre}`} title="Reactivar">
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

      <FormularioUsuario
        abierto={formulario.abierto}
        usuario={formulario.usuario}
        onCerrar={() => setFormulario({ abierto: false, usuario: null })}
        onGuardado={listado.recargar}
      />
      <ConfirmarAccion
        abierto={aDesactivar !== null}
        onCambio={(v) => !v && setADesactivar(null)}
        titulo="¿Desactivar este usuario?"
        descripcion={`"${aDesactivar?.nombre ?? ""}" no podrá iniciar sesión.`}
        textoAccion="Desactivar"
        onConfirmar={() => aDesactivar && desactivar(aDesactivar)}
      />
    </Card>
  );
}
