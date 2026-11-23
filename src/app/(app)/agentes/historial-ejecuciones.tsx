"use client";

// Historial de ejecuciones de los agentes de IA (docs/04-REQ RF-41).
import { Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { FilasEstado } from "@/components/comun/filas-estado";
import { Paginacion } from "@/components/comun/paginacion";
import { useListado } from "@/hooks/use-listado";
import { formatoDia, formatoFechaHora, formatoNumero } from "@/lib/formato";
import {
  AGENTES, ESTADOS_EJECUCION, ETIQUETA_AGENTE, ETIQUETA_ESTADO_EJECUCION,
} from "@/lib/esquemas/agentes";
import { duracion, InsigniaEjecucion } from "./insignias";
import type { FilaEjecucion } from "./tipos";

function entrada(parametros: Record<string, unknown>) {
  const sucursal = typeof parametros.sucursal === "string" ? parametros.sucursal : "—";
  const desde = typeof parametros.desde === "string" ? parametros.desde : null;
  const hasta = typeof parametros.hasta === "string" ? parametros.hasta : null;
  return { sucursal, desde, hasta };
}

function resumenResultado(ordenes: number, recomendaciones: number) {
  const partes: string[] = [];
  if (ordenes > 0) partes.push(`${formatoNumero(ordenes)} órdenes`);
  if (recomendaciones > 0) partes.push(`${formatoNumero(recomendaciones)} recomendaciones`);
  return partes.length > 0 ? partes.join(" · ") : "—";
}

export function HistorialEjecuciones({ onVer }: { onVer: (id: number) => void }) {
  const listado = useListado<FilaEjecucion>("/api/agentes/ejecuciones", { agente: "todos", estado: "todos" }, 20);

  return (
    <Card>
      <CardContent className="space-y-4">
        <div className="flex flex-col gap-2 sm:flex-row">
          <NativeSelect
            value={listado.filtros.agente}
            onChange={(e) => listado.setFiltro("agente", e.target.value)}
            aria-label="Filtrar por agente"
          >
            <NativeSelectOption value="todos">Todos los agentes</NativeSelectOption>
            {AGENTES.map((agente) => (
              <NativeSelectOption key={agente} value={agente}>{ETIQUETA_AGENTE[agente]}</NativeSelectOption>
            ))}
          </NativeSelect>
          <NativeSelect
            value={listado.filtros.estado}
            onChange={(e) => listado.setFiltro("estado", e.target.value)}
            aria-label="Filtrar por estado"
          >
            <NativeSelectOption value="todos">Todos los estados</NativeSelectOption>
            {ESTADOS_EJECUCION.map((estado) => (
              <NativeSelectOption key={estado} value={estado}>{ETIQUETA_ESTADO_EJECUCION[estado]}</NativeSelectOption>
            ))}
          </NativeSelect>
        </div>

        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>N.º</TableHead>
                <TableHead>Agente</TableHead>
                <TableHead>Entrada</TableHead>
                <TableHead>Inicio</TableHead>
                <TableHead>Duración</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Modelo</TableHead>
                <TableHead>Resultado</TableHead>
                <TableHead>Ejecutado por</TableHead>
                <TableHead className="text-right"><span className="sr-only">Acciones</span></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <FilasEstado columnas={10} cargando={listado.cargando} error={listado.error} vacio={listado.datos.length === 0} />
              {!listado.error && listado.datos.map((ejecucion) => {
                const parametros = entrada(ejecucion.parametros);
                return (
                  <TableRow
                    key={ejecucion.id}
                    className="cursor-pointer"
                    onClick={() => onVer(ejecucion.id)}
                  >
                    <TableCell className="font-mono text-xs">
                      #{ejecucion.id}
                      {ejecucion.ejecucionPadreId !== null && (
                        <div className="font-sans text-xs text-muted-foreground">parte del informe #{ejecucion.ejecucionPadreId}</div>
                      )}
                    </TableCell>
                    <TableCell className="min-w-40">{ETIQUETA_AGENTE[ejecucion.agente]}</TableCell>
                    <TableCell className="min-w-40">
                      <div>{parametros.sucursal}</div>
                      {parametros.desde && parametros.hasta && (
                        <div className="text-xs text-muted-foreground">
                          {formatoDia(parametros.desde)} – {formatoDia(parametros.hasta)}
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-xs text-muted-foreground">{formatoFechaHora(ejecucion.fechaInicio)}</TableCell>
                    <TableCell className="whitespace-nowrap text-xs">{duracion(ejecucion.duracionMs)}</TableCell>
                    <TableCell>
                      <InsigniaEjecucion estado={ejecucion.estado} />
                      {ejecucion.error && (
                        <div className="max-w-40 truncate text-xs text-destructive" title={ejecucion.error}>
                          {ejecucion.error}
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="font-mono text-xs">{ejecucion.modelo ?? "—"}</TableCell>
                    <TableCell className="whitespace-nowrap text-xs">
                      {resumenResultado(ejecucion.ordenes, ejecucion.recomendaciones)}
                    </TableCell>
                    <TableCell>{ejecucion.ejecutadoPor.nombre}</TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={(e) => { e.stopPropagation(); onVer(ejecucion.id); }}
                        aria-label={`Ver la ejecución ${ejecucion.id}`}
                        title="Ver ejecución"
                      >
                        <Eye />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>

        <Paginacion pagina={listado.pagina} tamano={listado.tamano} total={listado.total} onCambio={listado.setPagina} />
      </CardContent>
    </Card>
  );
}
