// ============================================================
// CeibaERP - Muestra el texto del asistente con un Markdown minimo y seguro
// (parrafos, listas con guiones o numeros y **negrita**). No usa HTML del
// modelo: todo se arma con elementos de React, sin dangerouslySetInnerHTML.
// ============================================================
import { Fragment } from "react";

export type Bloque =
  | { tipo: "parrafo"; texto: string }
  | { tipo: "lista"; ordenada: boolean; items: string[] };

const VINETA = /^\s*[-*•]\s+(.*)$/;
const NUMERO = /^\s*\d+[.)]\s+(.*)$/;

/** Divide el texto en parrafos y listas (funcion pura, probada en tests/unit). */
export function analizarTexto(texto: string): Bloque[] {
  const bloques: Bloque[] = [];
  let parrafo: string[] = [];
  const cerrarParrafo = () => {
    if (parrafo.length) bloques.push({ tipo: "parrafo", texto: parrafo.join(" ") });
    parrafo = [];
  };
  for (const linea of texto.replace(/\r\n/g, "\n").split("\n")) {
    const vineta = VINETA.exec(linea);
    const numero = NUMERO.exec(linea);
    const item = vineta?.[1] ?? numero?.[1];
    if (item !== undefined) {
      cerrarParrafo();
      const ordenada = !!numero;
      const ultimo = bloques.at(-1);
      if (ultimo?.tipo === "lista" && ultimo.ordenada === ordenada) ultimo.items.push(item.trim());
      else bloques.push({ tipo: "lista", ordenada, items: [item.trim()] });
    } else if (linea.trim() === "") {
      cerrarParrafo();
    } else {
      parrafo.push(linea.trim().replace(/^#{1,6}\s+/, ""));
    }
  }
  cerrarParrafo();
  return bloques;
}

/** **negrita** como <strong>; el resto, texto plano. */
function Enfasis({ texto }: { texto: string }) {
  const partes = texto.split(/(\*\*[^*]+\*\*)/g);
  return (
    <>
      {partes.map((p, i) =>
        p.startsWith("**") && p.endsWith("**") && p.length > 4
          ? <strong key={i} className="font-semibold">{p.slice(2, -2)}</strong>
          : <Fragment key={i}>{p}</Fragment>,
      )}
    </>
  );
}

export function TextoIA({ texto }: { texto: string }) {
  return (
    <div className="space-y-2 text-sm leading-relaxed">
      {analizarTexto(texto).map((b, i) =>
        b.tipo === "parrafo" ? (
          <p key={i}><Enfasis texto={b.texto} /></p>
        ) : b.ordenada ? (
          <ol key={i} className="list-decimal space-y-1 pl-5">{b.items.map((t, j) => <li key={j}><Enfasis texto={t} /></li>)}</ol>
        ) : (
          <ul key={i} className="list-disc space-y-1 pl-5">{b.items.map((t, j) => <li key={j}><Enfasis texto={t} /></li>)}</ul>
        ),
      )}
    </div>
  );
}
