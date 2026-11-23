"use client";
// ============================================================
// Detalle de una ejecucion de agente (docs/04-REQ RF-41): entrada, herramientas
// usadas, salida validada, modelo, duracion y estado. Muestra lo que el codigo
// decidio (cantidades, ordenes, reglas) separado de lo que interpreto la IA.
// ============================================================
import { useEffect, useState } from "react";
import Link from "next/link";
import { AlertTriangle, ArrowRight, Bot, ExternalLink, ShieldCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { TextoIA } from "@/components/comun/texto-ia";
import { Fuentes } from "@/app/(app)/chat/mensaje";
import { InsigniaOrden } from "@/app/(app)/compras/insignias";
import { api, ErrorCliente } from "@/lib/api-cliente";
import { formatoCOP, formatoDia, formatoFechaHora, formatoNumero } from "@/lib/formato";
import { ETIQUETA_AGENTE, ETIQUETA_GRAFICO } from "@/lib/esquemas/agentes";
import { KPIS, type IdKpi } from "@/lib/kpi";
import { duracion, EtiquetaIA, InsigniaEjecucion, InsigniaPrioridad, InsigniaRecomendacion, InsigniaTipo } from "./insignias";
import type { Ejecucion, ResultadoComercial, ResultadoInforme, ResultadoInventario } from "./tipos";

function Dato({ etiqueta, children }: { etiqueta: string; children: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs text-muted-foreground">{etiqueta}</dt>
      <dd className="text-sm font-medium">{children}</dd>
    </div>
  );
}

function Seccion({ titulo, children, accion }: { titulo: string; children: React.ReactNode; accion?: React.ReactNode }) {
  return (
    <section className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold">{titulo}</h3>
        {accion}
      </div>
      {children}
    </section>
  );
}

function Enlace({ id, texto, onAbrir }: { id: number; texto: string; onAbrir: (id: number) => void }) {
  return (
    <button type="button" onClick={() => onAbrir(id)} className="inline-flex items-center gap-1 text-sm font-medium text-primary underline-offset-4 hover:underline">
      {texto} <ArrowRight className="size-3.5" />
    </button>
  );
}

function referencia(ref: string): string {
  if (ref in KPIS) return `${ref} · ${KPIS[ref as IdKpi].nombre}`;
  return `${ref} · ${ETIQUETA_GRAFICO[ref as keyof typeof ETIQUETA_GRAFICO] ?? "Gráfico"}`;
}

/** Decisiones del Agente 1: cantidades del codigo y ajustes de la IA. */
function TablaDecisiones({ decisiones, sinIA }: { decisiones: ResultadoInventario["decisiones"]; sinIA: boolean }) {
  return (
    <div className="max-h-80 overflow-auto rounded-lg border">
      <Table>
        <TableHeader className="sticky top-0 bg-background">
          <TableRow>
            <TableHead>Producto</TableHead>
            <TableHead>Sucursal</TableHead>
            <TableHead className="text-right">Cobertura</TableHead>
            <TableHead className="text-right">Cantidad</TableHead>
            <TableHead>Prioridad</TableHead>
            <TableHead>{sinIA ? "Criterio del cálculo" : "Decisión"}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {decisiones.map((d) => (
            <TableRow key={d.candidatoId} className={d.incluir ? undefined : "opacity-60"}>
              <TableCell className="max-w-52">
                <div className="truncate font-medium">{d.producto}</div>
                <div className="font-mono text-[11px] text-muted-foreground">{d.sku} · {d.proveedor}</div>
              </TableCell>
              <TableCell>{d.sucursal}</TableCell>
              <TableCell className="text-right tabular-nums">{d.coberturaDias === null ? "Sin ventas" : `${formatoNumero(d.coberturaDias)} d`}</TableCell>
              <TableCell className="text-right tabular-nums">{formatoNumero(d.cantidad)}</TableCell>
              <TableCell>
                <div className="flex items-center gap-1">
                  <InsigniaPrioridad prioridad={d.prioridad} />
                  {d.prioridad !== d.prioridadBase && <span className="text-[11px] text-muted-foreground">(base {d.prioridadBase.toLowerCase()})</span>}
                </div>
              </TableCell>
              <TableCell className="max-w-72 text-xs whitespace-normal">
                {!d.incluir && <Badge variant="outline" className="mr-1">Excluido</Badge>}
                {d.ajustadaPorIA && <Badge variant="outline" className="mr-1 border-violet-200 text-violet-700 dark:border-violet-900 dark:text-violet-300"><Bot data-icon="inline-start" />IA</Badge>}
                {d.justificacion}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

function ContenidoInventario({ e }: { e: Ejecucion }) {
  const r = e.resultado as ResultadoInventario | null;
  if (!r) return null;
  const sinIA = !!r.sinAnalisisIA;
  return (
    <>
      {r.resumen && (
        <Seccion titulo="Resumen">
          <TextoIA texto={r.resumen} />
        </Seccion>
      )}
      {r.criterios && r.criterios.length > 0 && (
        <Seccion titulo="Criterios de priorización">
          <ul className="list-disc space-y-1 pl-5 text-sm">{r.criterios.map((c, i) => <li key={i}>{c}</li>)}</ul>
        </Seccion>
      )}
      {!sinIA && (
        <Seccion titulo={`Órdenes de compra en borrador (${e.ordenes.length})`}
          accion={e.ordenes.length > 0 && (
            <Button asChild variant="outline" size="sm"><Link href="/compras"><ExternalLink /> Aprobar en Órdenes de compra</Link></Button>
          )}>
          {e.ordenes.length === 0 ? (
            <p className="text-sm text-muted-foreground">No se crearon órdenes.</p>
          ) : (
            <div className="max-h-72 overflow-auto rounded-lg border">
              <Table>
                <TableHeader className="sticky top-0 bg-background">
                  <TableRow>
                    <TableHead>N.º</TableHead>
                    <TableHead>Proveedor</TableHead>
                    <TableHead>Sucursal</TableHead>
                    <TableHead className="text-right">Ítems</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead>Fecha esperada</TableHead>
                    <TableHead>Estado</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {e.ordenes.map((o) => (
                    <TableRow key={o.id}>
                      <TableCell className="font-mono text-xs">#{o.id}</TableCell>
                      <TableCell className="max-w-56 truncate">{o.proveedor}</TableCell>
                      <TableCell>{o.sucursal}</TableCell>
                      <TableCell className="text-right tabular-nums">{o.items}</TableCell>
                      <TableCell className="text-right tabular-nums">{formatoCOP(o.total)}</TableCell>
                      <TableCell>{formatoDia(o.fechaEsperada)}</TableCell>
                      <TableCell><InsigniaOrden estado={o.estado} /></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
          {r.ordenesFallidas && r.ordenesFallidas.length > 0 && (
            <ul className="text-xs text-destructive">
              {r.ordenesFallidas.map((f, i) => <li key={i}>No se creó la orden de {f.proveedor} ({f.sucursal}): {f.error}</li>)}
            </ul>
          )}
        </Seccion>
      )}
      <Seccion titulo={sinIA ? `Candidatos calculados · sin análisis de IA (${r.decisiones.length})` : `Productos analizados (${r.decisiones.length})`}>
        <p className="text-xs text-muted-foreground">
          Cantidades calculadas en código: stock objetivo para cubrir el tiempo de entrega más {r.diasSeguridad} días de seguridad, menos el stock y lo que ya está en tránsito. La IA solo puede excluir candidatos o subir su prioridad.
        </p>
        {r.decisiones.length > 0 ? <TablaDecisiones decisiones={r.decisiones} sinIA={sinIA} /> : <p className="text-sm text-muted-foreground">Ningún producto requiere reposición.</p>}
        {r.ignorados && r.ignorados.length > 0 && (
          <p className="text-xs text-muted-foreground">Se ignoraron {r.ignorados.length} identificador(es) que la IA mencionó y no existen en el cálculo: {r.ignorados.join(", ")}.</p>
        )}
      </Seccion>
    </>
  );
}

function ContenidoComercial({ e, onAbrir }: { e: Ejecucion; onAbrir: (id: number) => void }) {
  const r = e.resultado as ResultadoComercial | null;
  if (!r) return null;
  return (
    <>
      <div className="rounded-lg border bg-muted/30 px-3 py-2 text-sm">
        {r.ejecucionInventarioId
          ? <>Consideró el resultado del analista de inventario: <Enlace id={r.ejecucionInventarioId} texto={`ejecución #${r.ejecucionInventarioId}`} onAbrir={onAbrir} /></>
          : "No había una ejecución reciente del analista de inventario; la regla de coherencia usó los productos en riesgo calculados por el sistema."}
      </div>
      {r.resumen && <Seccion titulo="Resumen"><TextoIA texto={r.resumen} /></Seccion>}
      {r.hallazgos && r.hallazgos.length > 0 && (
        <Seccion titulo="Hallazgos contrastables con el dashboard">
          <div className="rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Hallazgo</TableHead>
                  <TableHead>KPI o gráfico</TableHead>
                  <TableHead>Valor citado por la IA</TableHead>
                  <TableHead>Valor del sistema</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {r.hallazgos.map((h, i) => (
                  <TableRow key={i}>
                    <TableCell className="max-w-80 whitespace-normal">
                      <div className="font-medium">{h.titulo}</div>
                      <div className="text-xs text-muted-foreground">{h.detalle}</div>
                    </TableCell>
                    <TableCell className="text-xs">{referencia(h.kpiRelacionado)}</TableCell>
                    <TableCell className="tabular-nums">{h.valor}</TableCell>
                    <TableCell className="tabular-nums">
                      {h.valorSistema ?? <Link href="/dashboard" className="text-xs text-primary hover:underline">Ver en el dashboard</Link>}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <p className="text-xs text-muted-foreground">
            El valor del sistema lo calcula el mismo servicio del dashboard para el periodo {r.periodo ? `${formatoDia(r.periodo.desde)} a ${formatoDia(r.periodo.hasta)}` : ""}.
          </p>
        </Seccion>
      )}
      {r.descartadas && r.descartadas.length > 0 && (
        <Seccion titulo={`Recomendaciones descartadas por reglas (${r.descartadas.length})`}>
          <ul className="space-y-1.5">
            {r.descartadas.map((d, i) => (
              <li key={i} className="flex gap-2 rounded-md border border-dashed px-3 py-2 text-sm">
                <ShieldCheck className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                <div>
                  <div className="font-medium">{d.titulo}{d.sku ? ` · ${d.sku}` : ""}</div>
                  <div className="text-xs text-muted-foreground">{d.motivo}</div>
                </div>
              </li>
            ))}
          </ul>
        </Seccion>
      )}
    </>
  );
}

function ContenidoInforme({ e, onAbrir }: { e: Ejecucion; onAbrir: (id: number) => void }) {
  const r = e.resultado as ResultadoInforme | null;
  return (
    <>
      {e.resumen && (
        <Seccion titulo="Resumen consolidado">
          {r?.resumenGenerado === "plantilla" && <p className="text-xs text-muted-foreground">Redactado con plantilla del sistema (la IA no respondió).</p>}
          <TextoIA texto={e.resumen} />
        </Seccion>
      )}
      {r && (
        <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Dato etiqueta="Órdenes en borrador">{formatoNumero(r.ordenes ?? 0)}</Dato>
          <Dato etiqueta="Alertas de inventario">{formatoNumero(r.alertas ?? 0)}</Dato>
          <Dato etiqueta="Recomendaciones pendientes">{formatoNumero(r.recomendaciones ?? 0)}</Dato>
          <Dato etiqueta="Descartadas por reglas">{formatoNumero(r.descartadas ?? 0)}</Dato>
        </dl>
      )}
      <Seccion titulo="Agentes encadenados">
        <ol className="space-y-2">
          {e.hijas.map((h, i) => (
            <li key={h.id} className="flex flex-wrap items-center gap-2 rounded-lg border px-3 py-2 text-sm">
              <span className="text-muted-foreground">{i + 1}.</span>
              <span className="font-medium">{ETIQUETA_AGENTE[h.agente]}</span>
              <InsigniaEjecucion estado={h.estado} />
              <span className="text-xs text-muted-foreground">{duracion(h.duracionMs)}</span>
              <span className="ml-auto"><Enlace id={h.id} texto={`Ver ejecución #${h.id}`} onAbrir={onAbrir} /></span>
              {h.error && <div className="w-full text-xs text-destructive">{h.error}</div>}
            </li>
          ))}
        </ol>
        <p className="text-xs text-muted-foreground">El analista comercial recibe como entrada la salida validada del analista de inventario (ejecucionEntradaId).</p>
      </Seccion>
    </>
  );
}

function Parametros({ p }: { p: Record<string, unknown> }) {
  const partes: string[] = [];
  if (typeof p.sucursal === "string") partes.push(p.sucursal);
  if (typeof p.desde === "string" && typeof p.hasta === "string") partes.push(`${formatoDia(p.desde)} a ${formatoDia(p.hasta)}`);
  if (typeof p.diasSeguridad === "number") partes.push(`${p.diasSeguridad} días de seguridad`);
  return <>{partes.join(" · ") || "—"}</>;
}

type Estado = { id: number; ejecucion: Ejecucion | null; error: string | null };

export function DetalleEjecucion({ ejecucionId, onCerrar, onAbrir }: { ejecucionId: number | null; onCerrar: () => void; onAbrir: (id: number) => void }) {
  const [estado, setEstado] = useState<Estado>({ id: 0, ejecucion: null, error: null });

  useEffect(() => {
    if (ejecucionId === null) return;
    let cancelado = false;
    api<Ejecucion>(`/api/agentes/ejecuciones/${ejecucionId}`)
      .then((e) => !cancelado && setEstado({ id: ejecucionId, ejecucion: e, error: null }))
      .catch((err: unknown) => !cancelado && setEstado({ id: ejecucionId, ejecucion: null, error: err instanceof ErrorCliente ? err.message : "No fue posible cargar la ejecución." }));
    return () => {
      cancelado = true;
    };
  }, [ejecucionId]);

  const e = estado.id === ejecucionId ? estado.ejecucion : null;
  const error = estado.id === ejecucionId ? estado.error : null;
  const alertas = e?.recomendaciones ?? [];

  return (
    <Dialog open={ejecucionId !== null} onOpenChange={(v) => !v && onCerrar()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-5xl">
        <DialogHeader>
          <DialogTitle className="flex flex-wrap items-center gap-2">
            {e ? `${ETIQUETA_AGENTE[e.agente]} · ejecución #${e.id}` : "Ejecución"}
            {e && <InsigniaEjecucion estado={e.estado} />}
          </DialogTitle>
          <DialogDescription>
            {e?.modelo
              ? <EtiquetaIA modelo={e.modelo} fecha={e.fechaFin ?? e.fechaInicio} />
              : e?.estado === "FALLIDA" ? "Sin análisis de IA." : "Detalle de la ejecución."}
          </DialogDescription>
        </DialogHeader>

        {error && <p className="text-sm text-destructive">{error}</p>}
        {!e && !error && <div className="space-y-2"><Skeleton className="h-6 w-1/2" /><Skeleton className="h-40 w-full" /></div>}

        {e && (
          <div className="min-w-0 space-y-5">
            <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <Dato etiqueta="Entrada"><Parametros p={e.parametros} /></Dato>
              <Dato etiqueta="Inicio">{formatoFechaHora(e.fechaInicio)}</Dato>
              <Dato etiqueta="Duración">{duracion(e.duracionMs)}</Dato>
              <Dato etiqueta="Ejecutado por">{e.ejecutadoPor}</Dato>
            </dl>
            {e.ejecucionPadre && (
              <p className="text-xs text-muted-foreground">
                Parte del <Enlace id={e.ejecucionPadre.id} texto={`informe ejecutivo #${e.ejecucionPadre.id}`} onAbrir={onAbrir} />
              </p>
            )}
            {e.error && (
              <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-200">
                <AlertTriangle className="mt-0.5 size-4 shrink-0" />
                <div>
                  <div className="font-medium">La ejecución no se completó</div>
                  <div>{e.error}</div>
                  {e.agente === "INVENTARIO" && <div className="text-xs">Se muestran los candidatos calculados por el sistema; no se crearon órdenes.</div>}
                </div>
              </div>
            )}

            {e.agente === "INVENTARIO" && <ContenidoInventario e={e} />}
            {e.agente === "COMERCIAL" && <ContenidoComercial e={e} onAbrir={onAbrir} />}
            {e.agente === "INFORME_EJECUTIVO" && <ContenidoInforme e={e} onAbrir={onAbrir} />}

            {alertas.length > 0 && (
              <Seccion titulo={e.agente === "INVENTARIO" ? `Alertas para el gerente (${alertas.length})` : `Recomendaciones (${alertas.length})`}>
                <ul className="space-y-2">
                  {alertas.map((r) => (
                    <li key={r.id} className="rounded-lg border px-3 py-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <InsigniaTipo tipo={r.tipo} />
                        <InsigniaPrioridad prioridad={r.prioridad} />
                        <span className="text-sm font-medium">{r.titulo}</span>
                        <span className="ml-auto"><InsigniaRecomendacion estado={r.estado} /></span>
                      </div>
                      <p className="mt-1 text-sm text-muted-foreground">{r.justificacion}</p>
                      {(r.producto || r.sucursal) && (
                        <p className="mt-1 text-xs text-muted-foreground">{[r.producto && `${r.producto.nombre} (${r.producto.sku})`, r.sucursal].filter(Boolean).join(" · ")}</p>
                      )}
                    </li>
                  ))}
                </ul>
                <p className="text-xs text-muted-foreground">Se aceptan o descartan en la pestaña Recomendaciones (validación del gerente).</p>
              </Seccion>
            )}

            <Seccion titulo="Trazabilidad">
              {e.herramientasUsadas.length > 0 ? <Fuentes fuentes={e.herramientasUsadas} /> : <p className="text-xs text-muted-foreground">Sin llamadas a herramientas registradas.</p>}
            </Seccion>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
