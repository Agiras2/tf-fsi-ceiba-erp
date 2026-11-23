"use client";

import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import { Loader2, MessageSquarePlus, SendHorizontal, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { api, ErrorCliente } from "@/lib/api-cliente";
import { formatoFechaHora } from "@/lib/formato";
import { MAX_LARGO_MENSAJE, type Conversacion, type MensajeChat } from "@/lib/esquemas/chat";
import { Mensaje } from "./mensaje";

type Hilo = { id: number | null; mensajes: MensajeChat[]; cargando: boolean };
type RespuestaEnvio = { conversacionId: number; titulo: string; mensajes: MensajeChat[] };

export function ModuloChat({ sugerencias, alcance }: { sugerencias: string[]; alcance: string }) {
  const [conversaciones, setConversaciones] = useState<{ version: number; datos: Conversacion[] | null }>({ version: -1, datos: null });
  const [version, setVersion] = useState(0);
  const [hilo, setHilo] = useState<Hilo>({ id: null, mensajes: [], cargando: false });
  const [borrador, setBorrador] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const finRef = useRef<HTMLDivElement>(null);
  const provisionales = useRef(0);

  useEffect(() => {
    let cancelado = false;
    api<{ datos: Conversacion[] }>("/api/chat/conversaciones")
      .then((r) => !cancelado && setConversaciones({ version, datos: r.datos }))
      .catch(() => !cancelado && setConversaciones({ version, datos: [] }));
    return () => {
      cancelado = true;
    };
  }, [version]);

  // Lleva la vista al ultimo mensaje.
  useEffect(() => {
    finRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [hilo.mensajes.length, enviando]);

  function nueva() {
    setHilo({ id: null, mensajes: [], cargando: false });
    setError(null);
  }

  function abrir(id: number) {
    setError(null);
    setHilo({ id, mensajes: [], cargando: true });
    api<{ mensajes: MensajeChat[] }>(`/api/chat/conversaciones/${id}`)
      .then((r) => setHilo((h) => (h.id === id ? { id, mensajes: r.mensajes, cargando: false } : h)))
      .catch((e: unknown) => {
        setHilo((h) => (h.id === id ? { ...h, cargando: false } : h));
        setError(e instanceof ErrorCliente ? e.message : "No fue posible abrir la conversación.");
      });
  }

  async function enviar(texto: string) {
    const mensaje = texto.trim();
    if (!mensaje || enviando) return;
    setError(null);
    setEnviando(true);
    provisionales.current += 1;
    const provisional: MensajeChat = {
      id: -provisionales.current, rol: "USUARIO", contenido: mensaje, herramientasUsadas: null, modelo: null, createdAt: "",
    };
    const anterior = hilo;
    setHilo((h) => ({ ...h, mensajes: [...h.mensajes, provisional] }));
    setBorrador("");
    try {
      const r = await api<RespuestaEnvio>("/api/chat", { method: "POST", json: { conversacionId: hilo.id, mensaje } });
      setHilo({ id: r.conversacionId, mensajes: [...anterior.mensajes, ...r.mensajes], cargando: false });
      setVersion((v) => v + 1);
    } catch (e) {
      // Se conserva la pregunta para reintentar (por ejemplo, si la IA no esta disponible: 503).
      setHilo(anterior);
      setBorrador(mensaje);
      setError(e instanceof ErrorCliente ? e.message : "No fue posible obtener la respuesta.");
    } finally {
      setEnviando(false);
    }
  }

  function alEnviar(e: FormEvent) {
    e.preventDefault();
    void enviar(borrador);
  }

  function alTeclear(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void enviar(borrador);
    }
  }

  const lista = conversaciones.datos;

  return (
    <div className="grid gap-4 lg:grid-cols-[260px_1fr]">
      <Card className="h-fit lg:sticky lg:top-4">
        <CardContent className="space-y-3">
          <Button className="w-full" variant="outline" onClick={nueva} disabled={enviando}>
            <MessageSquarePlus /> Nueva conversación
          </Button>
          <div className="text-xs font-medium text-muted-foreground">Mis conversaciones</div>
          {lista === null ? (
            <div className="space-y-2">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-10" />)}</div>
          ) : lista.length === 0 ? (
            <p className="text-xs text-muted-foreground">Aún no tiene conversaciones.</p>
          ) : (
            <ul className="max-h-[60vh] space-y-1 overflow-auto">
              {lista.map((c) => (
                <li key={c.id}>
                  <button type="button" onClick={() => abrir(c.id)} disabled={enviando}
                    className={cn("w-full rounded-md px-2 py-1.5 text-left text-sm hover:bg-muted", hilo.id === c.id && "bg-muted font-medium")}>
                    <div className="truncate">{c.titulo}</div>
                    <div className="text-[11px] text-muted-foreground">{formatoFechaHora(c.ultimoMensaje ?? c.createdAt)} · {c.mensajes} mensajes</div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card className="flex min-h-[70vh] flex-col">
        <CardContent className="flex flex-1 flex-col gap-4">
          <div className="flex-1 space-y-4 overflow-y-auto pr-1" aria-live="polite">
            {hilo.cargando && <Skeleton className="h-24 w-full" />}
            {!hilo.cargando && hilo.mensajes.length === 0 && (
              <div className="mx-auto max-w-xl space-y-4 py-8 text-center">
                <Sparkles className="mx-auto size-8 text-violet-600" aria-hidden />
                <div>
                  <p className="font-medium">Pregunte sobre ventas, inventario, compras e indicadores</p>
                  <p className="text-sm text-muted-foreground">
                    Las respuestas se generan con IA a partir de los datos del sistema y muestran las fuentes consultadas. {alcance}
                  </p>
                </div>
                <div className="flex flex-wrap justify-center gap-2">
                  {sugerencias.map((s) => (
                    <Button key={s} type="button" variant="outline" size="sm" className="h-auto whitespace-normal py-1.5 text-left" onClick={() => enviar(s)} disabled={enviando}>
                      {s}
                    </Button>
                  ))}
                </div>
              </div>
            )}
            {hilo.mensajes.map((m) => <Mensaje key={m.id} m={m} />)}
            {enviando && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="size-4 animate-spin" /> Consultando los datos del sistema…
              </div>
            )}
            <div ref={finRef} />
          </div>

          {error && <p className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive" role="alert">{error}</p>}

          <form onSubmit={alEnviar} className="space-y-1">
            <div className="flex gap-2">
              <Textarea
                value={borrador}
                onChange={(e) => setBorrador(e.target.value)}
                onKeyDown={alTeclear}
                maxLength={MAX_LARGO_MENSAJE}
                rows={2}
                placeholder="Escriba su pregunta… (Enter para enviar, Mayús + Enter para una nueva línea)"
                aria-label="Pregunta para el asistente"
                disabled={enviando}
                className="min-h-14 resize-none"
              />
              <Button type="submit" size="icon" className="size-14" disabled={enviando || !borrador.trim()} aria-label="Enviar pregunta">
                {enviando ? <Loader2 className="animate-spin" /> : <SendHorizontal />}
              </Button>
            </div>
            <p className="text-[11px] text-muted-foreground">
              El asistente solo consulta datos (no crea ni modifica nada) y puede equivocarse: verifique las cifras importantes en el dashboard o los módulos. {borrador.length}/{MAX_LARGO_MENSAJE}
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
