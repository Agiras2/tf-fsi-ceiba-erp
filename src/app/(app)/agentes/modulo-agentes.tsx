"use client";
// ============================================================
// Agentes de IA (docs/04-REQ RF-36 a RF-41; docs/07-IAG secciones 5 a 7)
// Ejecutar el analista de inventario, el analista comercial o el informe ejecutivo;
// validar las recomendaciones y consultar el historial de ejecuciones.
// ============================================================
import { useCallback, useEffect, useState } from "react";
import { BarChart3, Boxes, FileText, Loader2, Play } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { Campo } from "@/components/comun/campo";
import { api, ErrorCliente } from "@/lib/api-cliente";
import { cn } from "@/lib/utils";
import { formatoFechaHora } from "@/lib/formato";
import { periodoPorDefecto } from "@/lib/esquemas/kpi";
import { ETIQUETA_AGENTE, type Agente } from "@/lib/esquemas/agentes";
import type { Pagina } from "@/lib/esquemas/comunes";
import { DetalleEjecucion } from "./detalle-ejecucion";
import { HistorialEjecuciones } from "./historial-ejecuciones";
import { Recomendaciones } from "./recomendaciones";
import type { AccionesAgentes, Ejecucion, FilaEjecucion, Opcion, RespuestaRecomendaciones } from "./tipos";

type Pestana = "ejecutar" | "recomendaciones" | "historial";

const RUTA: Record<Agente, string> = {
  INVENTARIO: "/api/agentes/inventario",
  COMERCIAL: "/api/agentes/comercial",
  INFORME_EJECUTIVO: "/api/agentes/informe-ejecutivo",
};

function Periodo({ prefijo, desde, hasta, onCambio, deshabilitado }: {
  prefijo: string; desde: string; hasta: string; onCambio: (d: { desde: string; hasta: string }) => void; deshabilitado: boolean;
}) {
  return (
    <div className="grid grid-cols-2 gap-2">
      <Campo id={`${prefijo}-desde`} etiqueta="Desde">
        <Input id={`${prefijo}-desde`} type="date" value={desde} max={hasta} disabled={deshabilitado} onChange={(e) => onCambio({ desde: e.target.value, hasta })} />
      </Campo>
      <Campo id={`${prefijo}-hasta`} etiqueta="Hasta">
        <Input id={`${prefijo}-hasta`} type="date" value={hasta} min={desde} disabled={deshabilitado} onChange={(e) => onCambio({ desde, hasta: e.target.value })} />
      </Campo>
    </div>
  );
}

function SelectorSucursal({ id, valor, sucursales, onCambio, deshabilitado }: {
  id: string; valor: string; sucursales: Opcion[]; onCambio: (v: string) => void; deshabilitado: boolean;
}) {
  return (
    <Campo id={id} etiqueta="Sucursal">
      <NativeSelect id={id} value={valor} disabled={deshabilitado} onChange={(e) => onCambio(e.target.value)} className="w-full">
        <NativeSelectOption value="">Todas las sucursales</NativeSelectOption>
        {sucursales.map((s) => <NativeSelectOption key={s.id} value={s.id}>{s.nombre}</NativeSelectOption>)}
      </NativeSelect>
    </Campo>
  );
}

function BotonEjecutar({ agente, cuerpo, texto, enCurso, habilitado, onEjecutar }: {
  agente: Agente; cuerpo: Record<string, unknown>; texto: string; enCurso: Agente | null; habilitado: boolean;
  onEjecutar: (agente: Agente, cuerpo: Record<string, unknown>) => void;
}) {
  return (
    <Button onClick={() => onEjecutar(agente, cuerpo)} disabled={enCurso !== null || !habilitado}>
      {enCurso === agente ? <Loader2 className="animate-spin" /> : <Play />}
      {enCurso === agente ? "Analizando…" : texto}
    </Button>
  );
}

export function ModuloAgentes({ acciones }: { acciones: AccionesAgentes }) {
  const [pestana, setPestana] = useState<Pestana>("ejecutar");
  const [sucursales, setSucursales] = useState<Opcion[]>([]);
  const [ejecucionesA1, setEjecucionesA1] = useState<FilaEjecucion[]>([]);
  const [pendientes, setPendientes] = useState<number | null>(null);
  const [enCurso, setEnCurso] = useState<Agente | null>(null);
  const [detalleId, setDetalleId] = useState<number | null>(null);
  const [version, setVersion] = useState(0);
  const [a1, setA1] = useState({ sucursalId: "" });
  const [a2, setA2] = useState(() => ({ ...periodoPorDefecto(), sucursalId: "", ejecucionInventarioId: "" }));
  const [informe, setInforme] = useState(() => ({ ...periodoPorDefecto(), sucursalId: "" }));

  useEffect(() => {
    api<Pagina<Opcion>>("/api/sucursales?tamano=100&activo=true")
      .then((r) => setSucursales(r.datos))
      .catch(() => toast.error("No fue posible cargar las sucursales."));
  }, []);

  // Ejecuciones completadas del Agente 1 (entrada opcional del Agente 2) y recomendaciones pendientes.
  const refrescar = useCallback(() => setVersion((v) => v + 1), []);
  useEffect(() => {
    let cancelado = false;
    api<Pagina<FilaEjecucion>>("/api/agentes/ejecuciones?agente=INVENTARIO&estado=COMPLETADA&tamano=10")
      .then((r) => !cancelado && setEjecucionesA1(r.datos))
      .catch(() => undefined);
    api<RespuestaRecomendaciones>("/api/recomendaciones?estado=PENDIENTE&tamano=1")
      .then((r) => !cancelado && setPendientes(r.pendientes))
      .catch(() => undefined);
    return () => {
      cancelado = true;
    };
  }, [version]);

  async function ejecutar(agente: Agente, cuerpo: Record<string, unknown>) {
    setEnCurso(agente);
    try {
      const e = await api<Ejecucion>(RUTA[agente], { method: "POST", json: cuerpo });
      if (e.estado === "COMPLETADA") toast.success(`${ETIQUETA_AGENTE[agente]}: ejecución #${e.id} completada.`);
      else toast.warning(`${ETIQUETA_AGENTE[agente]}: la ejecución #${e.id} no se completó. ${e.error ?? ""}`);
      setDetalleId(e.id);
      refrescar();
    } catch (err) {
      toast.error(err instanceof ErrorCliente ? err.message : "No fue posible ejecutar el agente.");
    } finally {
      setEnCurso(null);
    }
  }

  const id = (v: string) => (v ? Number(v) : null);
  const ocupado = enCurso !== null;

  const pestanas: { clave: Pestana; texto: string; extra?: React.ReactNode }[] = [
    { clave: "ejecutar", texto: "Ejecutar agentes" },
    { clave: "recomendaciones", texto: "Recomendaciones", extra: pendientes ? <Badge className="ml-1.5">{pendientes}</Badge> : null },
    { clave: "historial", texto: "Historial de ejecuciones" },
  ];

  return (
    <div className="space-y-4">
      <div role="tablist" aria-label="Secciones de agentes" className="inline-flex rounded-lg border bg-muted/40 p-1">
        {pestanas.map((p) => (
          <button key={p.clave} type="button" role="tab" aria-selected={pestana === p.clave} onClick={() => setPestana(p.clave)}
            className={cn("inline-flex items-center rounded-md px-3 py-1.5 text-sm font-medium transition", pestana === p.clave ? "bg-background shadow-sm" : "text-muted-foreground hover:text-foreground")}>
            {p.texto}{p.extra}
          </button>
        ))}
      </div>

      {pestana === "ejecutar" && (
        <>
          {ocupado && (
            <div role="status" className="flex items-center gap-2 rounded-lg border border-violet-200 bg-violet-50 px-3 py-2 text-sm text-violet-800 dark:border-violet-900 dark:bg-violet-950 dark:text-violet-200">
              <Loader2 className="size-4 animate-spin" />
              {ETIQUETA_AGENTE[enCurso]} en ejecución: consulta las herramientas y redacta su análisis. Puede tardar de 1 a 3 minutos; no cierre la página.
            </div>
          )}
          <div className="grid gap-4 lg:grid-cols-3">
            <Card className="flex flex-col">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base"><Boxes className="size-4" /> Agente 1 · Analista de inventario</CardTitle>
                <CardDescription>
                  Calcula en código los productos bajo el mínimo o en riesgo, con el tiempo de entrega de cada proveedor. La IA prioriza y explica; el sistema crea órdenes en <strong>borrador</strong> para su aprobación.
                </CardDescription>
              </CardHeader>
              <CardContent className="flex-1 space-y-3">
                <SelectorSucursal id="a1-sucursal" valor={a1.sucursalId} sucursales={sucursales} deshabilitado={ocupado} onCambio={(v) => setA1({ sucursalId: v })} />
              </CardContent>
              <CardFooter><BotonEjecutar agente="INVENTARIO" enCurso={enCurso} habilitado={acciones.ejecutar} onEjecutar={ejecutar} texto="Ejecutar analista" cuerpo={{ sucursalId: id(a1.sucursalId) }} /></CardFooter>
            </Card>

            <Card className="flex flex-col">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base"><BarChart3 className="size-4" /> Agente 2 · Analista comercial</CardTitle>
                <CardDescription>
                  Analiza ventas, tendencias y márgenes con los mismos KPI del dashboard y propone acciones comerciales. Considera el resultado del Agente 1 para no promocionar productos en riesgo.
                </CardDescription>
              </CardHeader>
              <CardContent className="flex-1 space-y-3">
                <Periodo prefijo="a2" desde={a2.desde} hasta={a2.hasta} deshabilitado={ocupado} onCambio={(p) => setA2({ ...a2, ...p })} />
                <SelectorSucursal id="a2-sucursal" valor={a2.sucursalId} sucursales={sucursales} deshabilitado={ocupado} onCambio={(v) => setA2({ ...a2, sucursalId: v })} />
                <Campo id="a2-entrada" etiqueta="Resultado del Agente 1 a considerar">
                  <NativeSelect id="a2-entrada" value={a2.ejecucionInventarioId} disabled={ocupado} className="w-full"
                    onChange={(e) => setA2({ ...a2, ejecucionInventarioId: e.target.value })}>
                    <NativeSelectOption value="">El más reciente de las últimas 24 horas</NativeSelectOption>
                    {ejecucionesA1.map((e) => (
                      <NativeSelectOption key={e.id} value={e.id}>#{e.id} · {String(e.parametros.sucursal ?? "")} · {formatoFechaHora(e.fechaFin)}</NativeSelectOption>
                    ))}
                  </NativeSelect>
                </Campo>
              </CardContent>
              <CardFooter>
                <BotonEjecutar agente="COMERCIAL" enCurso={enCurso} habilitado={acciones.ejecutar} onEjecutar={ejecutar} texto="Ejecutar analista"
                  cuerpo={{ desde: a2.desde, hasta: a2.hasta, sucursalId: id(a2.sucursalId), ejecucionInventarioId: id(a2.ejecucionInventarioId) }} />
              </CardFooter>
            </Card>

            <Card className="flex flex-col">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base"><FileText className="size-4" /> Informe ejecutivo</CardTitle>
                <CardDescription>
                  Ejecuta el Agente 1 y luego el Agente 2 con la salida validada del primero, y redacta un resumen consolidado. Todo queda pendiente de su validación.
                </CardDescription>
              </CardHeader>
              <CardContent className="flex-1 space-y-3">
                <Periodo prefijo="ie" desde={informe.desde} hasta={informe.hasta} deshabilitado={ocupado} onCambio={(p) => setInforme({ ...informe, ...p })} />
                <SelectorSucursal id="ie-sucursal" valor={informe.sucursalId} sucursales={sucursales} deshabilitado={ocupado} onCambio={(v) => setInforme({ ...informe, sucursalId: v })} />
              </CardContent>
              <CardFooter>
                <BotonEjecutar agente="INFORME_EJECUTIVO" enCurso={enCurso} habilitado={acciones.ejecutar} onEjecutar={ejecutar} texto="Generar informe"
                  cuerpo={{ desde: informe.desde, hasta: informe.hasta, sucursalId: id(informe.sucursalId) }} />
              </CardFooter>
            </Card>
          </div>
          <p className="text-xs text-muted-foreground">
            Los agentes solo leen datos mediante herramientas del servidor. Las órdenes que propone el Agente 1 nacen en borrador y las recomendaciones, pendientes: nada se ejecuta sin la decisión del gerente.
          </p>
        </>
      )}

      {pestana === "recomendaciones" && <Recomendaciones decidir={acciones.decidir} onVerEjecucion={setDetalleId} onCambio={refrescar} />}
      {pestana === "historial" && <HistorialEjecuciones onVer={setDetalleId} />}

      <DetalleEjecucion ejecucionId={detalleId} onCerrar={() => setDetalleId(null)} onAbrir={setDetalleId} />
    </div>
  );
}
