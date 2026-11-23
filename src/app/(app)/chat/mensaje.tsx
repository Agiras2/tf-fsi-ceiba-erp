import { AlertCircle, Bot, Database, UserRound } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatoFechaHora } from "@/lib/formato";
import { ETIQUETA_HERRAMIENTA, type FuenteConsultada, type MensajeChat } from "@/lib/esquemas/chat";
import { TextoIA } from "@/components/comun/texto-ia";

/** Fuentes consultadas: herramienta y filtros que aplico el servidor (RF-34). */
function Fuentes({ fuentes }: { fuentes: FuenteConsultada[] }) {
  if (fuentes.length === 0) {
    return <p className="text-xs text-muted-foreground">Fuentes consultadas: ninguna. La respuesta no usó datos del sistema.</p>;
  }
  return (
    <details className="text-xs" open={fuentes.some((f) => !f.ok)}>
      <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
        <Database className="mr-1 inline size-3" aria-hidden />Fuentes consultadas ({fuentes.length})
      </summary>
      <ul className="mt-2 space-y-1.5">
        {fuentes.map((f, i) => (
          <li key={i} className="rounded-md border bg-background px-2 py-1.5">
            <div className="flex flex-wrap items-center gap-x-2">
              <span className="font-medium">{ETIQUETA_HERRAMIENTA[f.herramienta] ?? f.herramienta}</span>
              <code className="text-[11px] text-muted-foreground">{f.herramienta}</code>
            </div>
            {f.filtros && (
              <div className="mt-1 flex flex-wrap gap-1">
                {Object.entries(f.filtros).filter(([k]) => k !== "nota").map(([k, v]) => (
                  <span key={k} className="rounded bg-muted px-1.5 py-0.5 text-[11px]">{k}: {v}</span>
                ))}
              </div>
            )}
            {f.filtros?.nota && <div className="mt-1 text-[11px] text-amber-700 dark:text-amber-300">{f.filtros.nota}</div>}
            {!f.ok && <div className="mt-1 flex items-center gap-1 text-[11px] text-destructive"><AlertCircle className="size-3" />{f.error}</div>}
          </li>
        ))}
      </ul>
    </details>
  );
}

export function Mensaje({ m }: { m: MensajeChat }) {
  const usuario = m.rol === "USUARIO";
  return (
    <div className={cn("flex gap-3", usuario && "flex-row-reverse")}>
      <div className={cn("mt-1 flex size-7 shrink-0 items-center justify-center rounded-full", usuario ? "bg-primary text-primary-foreground" : "bg-violet-100 text-violet-700 dark:bg-violet-950 dark:text-violet-300")}>
        {usuario ? <UserRound className="size-4" aria-hidden /> : <Bot className="size-4" aria-hidden />}
      </div>
      <div className={cn("max-w-[85%] space-y-2 rounded-xl px-4 py-3", usuario ? "bg-primary text-primary-foreground" : "border bg-muted/40")}>
        {usuario ? (
          <p className="text-sm whitespace-pre-wrap">{m.contenido}</p>
        ) : (
          <>
            {/* RNF-08: toda salida de IA lleva etiqueta, modelo y fecha */}
            <div className="text-[11px] font-medium text-violet-700 dark:text-violet-300">
              Respuesta generada por IA · Gemini ({m.modelo ?? "modelo"}) · {formatoFechaHora(m.createdAt)}
            </div>
            <TextoIA texto={m.contenido} />
            <Fuentes fuentes={m.herramientasUsadas ?? []} />
          </>
        )}
      </div>
    </div>
  );
}
