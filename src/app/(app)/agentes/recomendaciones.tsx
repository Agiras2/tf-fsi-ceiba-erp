"use client";
// ============================================================
// Validacion humana de las recomendaciones de IA (docs/04-REQ RF-40, RN-18)
// Nacen PENDIENTES; solo el gerente las acepta o descarta, con comentario.
// ============================================================
import { useState, type FormEvent } from "react";
import { Check, Eye, Loader2, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { Buscador } from "@/components/comun/buscador";
import { Campo } from "@/components/comun/campo";
import { Paginacion } from "@/components/comun/paginacion";
import { useListado } from "@/hooks/use-listado";
import { api, ErrorCliente } from "@/lib/api-cliente";
import { formatoFechaHora } from "@/lib/formato";
import {
  ESTADOS_RECOMENDACION, ETIQUETA_AGENTE, ETIQUETA_ESTADO_RECOMENDACION, ETIQUETA_PRIORIDAD, ETIQUETA_TIPO_RECOMENDACION,
  PRIORIDADES, TIPOS_RECOMENDACION,
} from "@/lib/esquemas/agentes";
import { EtiquetaIA, InsigniaPrioridad, InsigniaRecomendacion, InsigniaTipo } from "./insignias";
import type { Recomendacion, RespuestaRecomendaciones } from "./tipos";

type Decision = { recomendacion: Recomendacion; accion: "aceptar" | "descartar" } | null;

function DialogoDecision({ decision, onCerrar, onDecidida }: { decision: Decision; onCerrar: () => void; onDecidida: () => void }) {
  return (
    <Dialog open={decision !== null} onOpenChange={(v) => !v && onCerrar()}>
      <DialogContent className="sm:max-w-md">
        {decision && <FormularioDecision key={`${decision.recomendacion.id}-${decision.accion}`} decision={decision} onCerrar={onCerrar} onDecidida={onDecidida} />}
      </DialogContent>
    </Dialog>
  );
}

function FormularioDecision({ decision, onCerrar, onDecidida }: { decision: NonNullable<Decision>; onCerrar: () => void; onDecidida: () => void }) {
  const [comentario, setComentario] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const descartar = decision.accion === "descartar";
  const r = decision.recomendacion;

  async function enviar(e: FormEvent) {
    e.preventDefault();
    const texto = comentario.trim();
    if (descartar && texto.length < 5) {
      setError("Indique el motivo del descarte (mínimo 5 caracteres).");
      return;
    }
    setEnviando(true);
    try {
      await api(`/api/recomendaciones/${r.id}/${decision.accion}`, { method: "POST", json: texto ? { comentario: texto } : {} });
      toast.success(descartar ? `Recomendación #${r.id} descartada.` : `Recomendación #${r.id} aceptada.`);
      onDecidida();
    } catch (err) {
      const msg = err instanceof ErrorCliente ? (err.porCampo().comentario ?? err.message) : "No fue posible registrar la decisión.";
      setError(msg);
      setEnviando(false);
    }
  }

  return (
    <form onSubmit={enviar} noValidate className="space-y-4">
      <DialogHeader>
        <DialogTitle>{descartar ? "Descartar recomendación" : "Aceptar recomendación"}</DialogTitle>
        <DialogDescription>
          {r.titulo}. La decisión queda registrada con su nombre, la fecha y el comentario.
        </DialogDescription>
      </DialogHeader>
      <Campo id="comentario" etiqueta={descartar ? "Motivo del descarte" : "Comentario (opcional)"} error={error ?? undefined}
        ayuda={descartar ? "Obligatorio, mínimo 5 caracteres." : "Por ejemplo, qué acción se tomará."}>
        <Textarea id="comentario" rows={3} maxLength={300} value={comentario} onChange={(e) => setComentario(e.target.value)}
          aria-invalid={!!error} aria-describedby={error ? "comentario-error" : undefined} autoFocus />
      </Campo>
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onCerrar} disabled={enviando}>Volver</Button>
        <Button type="submit" variant={descartar ? "destructive" : "default"} disabled={enviando}>
          {enviando && <Loader2 className="animate-spin" />}
          {descartar ? "Descartar" : "Aceptar"}
        </Button>
      </DialogFooter>
    </form>
  );
}

export function Recomendaciones({ decidir, onVerEjecucion, onCambio }: { decidir: boolean; onVerEjecucion: (id: number) => void; onCambio: () => void }) {
  const listado = useListado<Recomendacion, RespuestaRecomendaciones>("/api/recomendaciones", { estado: "PENDIENTE", tipo: "todos", prioridad: "todos" }, 10);
  const [decision, setDecision] = useState<Decision>(null);

  return (
    <Card>
      <CardContent className="space-y-4">
        <div className="flex flex-col gap-2 lg:flex-row lg:flex-wrap lg:items-center">
          <Buscador valor={listado.busqueda} onCambio={listado.setBusqueda} placeholder="Buscar por título o producto" />
          <NativeSelect value={listado.filtros.estado} onChange={(e) => listado.setFiltro("estado", e.target.value)} aria-label="Filtrar por estado">
            <NativeSelectOption value="todos">Todos los estados</NativeSelectOption>
            {ESTADOS_RECOMENDACION.map((e) => <NativeSelectOption key={e} value={e}>{ETIQUETA_ESTADO_RECOMENDACION[e]}</NativeSelectOption>)}
          </NativeSelect>
          <NativeSelect value={listado.filtros.tipo} onChange={(e) => listado.setFiltro("tipo", e.target.value)} aria-label="Filtrar por tipo">
            <NativeSelectOption value="todos">Todos los tipos</NativeSelectOption>
            {TIPOS_RECOMENDACION.map((t) => <NativeSelectOption key={t} value={t}>{ETIQUETA_TIPO_RECOMENDACION[t]}</NativeSelectOption>)}
          </NativeSelect>
          <NativeSelect value={listado.filtros.prioridad} onChange={(e) => listado.setFiltro("prioridad", e.target.value)} aria-label="Filtrar por prioridad">
            <NativeSelectOption value="todos">Todas las prioridades</NativeSelectOption>
            {PRIORIDADES.map((p) => <NativeSelectOption key={p} value={p}>{ETIQUETA_PRIORIDAD[p]}</NativeSelectOption>)}
          </NativeSelect>
        </div>

        {!decidir && (
          <p className="rounded-lg border bg-muted/30 px-3 py-2 text-sm text-muted-foreground">
            Solo el gerente acepta o descarta recomendaciones (RN-18). Con su rol puede consultarlas.
          </p>
        )}

        {listado.error && <p className="py-6 text-center text-sm text-destructive">{listado.error}</p>}
        {listado.cargando && listado.datos.length === 0 && (
          <div className="space-y-2">{Array.from({ length: 3 }, (_, i) => <Skeleton key={i} className="h-24 w-full" />)}</div>
        )}
        {!listado.cargando && !listado.error && listado.datos.length === 0 && (
          <p className="py-6 text-center text-sm text-muted-foreground">
            {listado.filtros.estado === "PENDIENTE" ? "No hay recomendaciones pendientes. Ejecute un agente para generar nuevas." : "No hay recomendaciones que coincidan con los filtros."}
          </p>
        )}

        <ul className="space-y-3">
          {listado.datos.map((r) => (
            <li key={r.id} className="rounded-xl border p-4">
              <div className="flex flex-wrap items-center gap-2">
                <InsigniaTipo tipo={r.tipo} />
                <InsigniaPrioridad prioridad={r.prioridad} />
                <span className="font-medium">{r.titulo}</span>
                <span className="ml-auto"><InsigniaRecomendacion estado={r.estado} /></span>
              </div>
              <p className="mt-2 text-sm">{r.justificacion}</p>
              {(r.producto || r.sucursal) && (
                <p className="mt-1 text-xs text-muted-foreground">
                  {[r.producto && `Producto: ${r.producto.nombre} (${r.producto.sku})`, r.sucursal && `Sucursal: ${r.sucursal}`].filter(Boolean).join(" · ")}
                </p>
              )}
              <div className="mt-3 flex flex-wrap items-center gap-2">
                {r.ejecucion && <EtiquetaIA modelo={r.ejecucion.modelo} fecha={r.createdAt} texto={`Recomendación generada por IA (${ETIQUETA_AGENTE[r.ejecucion.agente].toLowerCase()})`} />}
                <Button variant="ghost" size="xs" onClick={() => onVerEjecucion(r.ejecucionId)}><Eye /> Ejecución #{r.ejecucionId}</Button>
                {r.estado === "PENDIENTE" && decidir && (
                  <div className="ml-auto flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => setDecision({ recomendacion: r, accion: "descartar" })}><X /> Descartar</Button>
                    <Button size="sm" onClick={() => setDecision({ recomendacion: r, accion: "aceptar" })}><Check /> Aceptar</Button>
                  </div>
                )}
              </div>
              {r.estado !== "PENDIENTE" && (
                <p className="mt-2 text-xs text-muted-foreground">
                  {ETIQUETA_ESTADO_RECOMENDACION[r.estado]} por {r.decididaPor ?? "—"} el {formatoFechaHora(r.fechaDecision)}
                  {r.comentarioDecision ? `: “${r.comentarioDecision}”` : "."}
                </p>
              )}
            </li>
          ))}
        </ul>

        <Paginacion pagina={listado.pagina} tamano={listado.tamano} total={listado.total} onCambio={listado.setPagina} />
      </CardContent>

      <DialogoDecision decision={decision} onCerrar={() => setDecision(null)}
        onDecidida={() => { setDecision(null); listado.recargar(); onCambio(); }} />
    </Card>
  );
}
