"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Buscador } from "@/components/comun/buscador";
import { FilasEstado } from "@/components/comun/filas-estado";
import { Paginacion } from "@/components/comun/paginacion";
import { useListado } from "@/hooks/use-listado";
import { formatoFechaHora } from "@/lib/formato";

type Registro = {
  id: number;
  fecha: string;
  accion: string;
  entidad: string;
  entidadId: number | null;
  detalle: unknown;
  ip: string | null;
  usuario: { nombre: string; email: string } | null;
};

export function ModuloAuditoria({ entidades }: { entidades: string[] }) {
  const listado = useListado<Registro>("/api/auditoria", { entidad: "todas", desde: "", hasta: "" }, 25);

  return (
    <Card>
      <CardContent className="space-y-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end">
          <Buscador valor={listado.busqueda} onCambio={listado.setBusqueda} placeholder="Buscar acción (ej. LOGIN, AJUSTE)" />
          <NativeSelect value={listado.filtros.entidad} onChange={(e) => listado.setFiltro("entidad", e.target.value)} aria-label="Filtrar por entidad">
            <NativeSelectOption value="todas">Todas las entidades</NativeSelectOption>
            {entidades.map((e) => (
              <NativeSelectOption key={e} value={e}>{e}</NativeSelectOption>
            ))}
          </NativeSelect>
          <div className="flex items-end gap-2">
            <div className="space-y-1">
              <Label htmlFor="desde" className="text-xs">Desde</Label>
              <Input id="desde" type="date" value={listado.filtros.desde} onChange={(e) => listado.setFiltro("desde", e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="hasta" className="text-xs">Hasta</Label>
              <Input id="hasta" type="date" value={listado.filtros.hasta} onChange={(e) => listado.setFiltro("hasta", e.target.value)} />
            </div>
          </div>
        </div>

        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Fecha</TableHead>
                <TableHead>Usuario</TableHead>
                <TableHead>Acción</TableHead>
                <TableHead>Entidad</TableHead>
                <TableHead>Detalle</TableHead>
                <TableHead>IP</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <FilasEstado columnas={6} cargando={listado.cargando} error={listado.error} vacio={listado.datos.length === 0} />
              {!listado.error &&
                listado.datos.map((r) => (
                  <TableRow key={r.id} className="align-top">
                    <TableCell className="whitespace-nowrap text-xs">{formatoFechaHora(r.fecha)}</TableCell>
                    <TableCell className="text-xs">
                      {r.usuario ? (
                        <>
                          <div className="font-medium">{r.usuario.nombre}</div>
                          <div className="text-muted-foreground">{r.usuario.email}</div>
                        </>
                      ) : (
                        <span className="text-muted-foreground">Sistema / anónimo</span>
                      )}
                    </TableCell>
                    <TableCell className="font-mono text-xs">{r.accion}</TableCell>
                    <TableCell className="text-xs">
                      {r.entidad}
                      {r.entidadId !== null && <span className="text-muted-foreground"> #{r.entidadId}</span>}
                    </TableCell>
                    <TableCell className="max-w-md text-xs">
                      {r.detalle ? (
                        <details>
                          <summary className="cursor-pointer text-muted-foreground">Ver detalle</summary>
                          <pre className="mt-1 max-h-48 overflow-auto rounded bg-muted p-2 whitespace-pre-wrap break-all">
                            {JSON.stringify(r.detalle, null, 2)}
                          </pre>
                        </details>
                      ) : (
                        "—"
                      )}
                    </TableCell>
                    <TableCell className="font-mono text-xs">{r.ip ?? "—"}</TableCell>
                  </TableRow>
                ))}
            </TableBody>
          </Table>
        </div>

        <Paginacion pagina={listado.pagina} tamano={listado.tamano} total={listado.total} onCambio={listado.setPagina} />
      </CardContent>
    </Card>
  );
}
