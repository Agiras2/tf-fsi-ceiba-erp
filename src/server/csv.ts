// ============================================================
// CeibaERP - Generacion de archivos CSV para los reportes (RF-30)
// Formato pensado para Excel en espanol: separador ";", coma decimal,
// UTF-8 con BOM y fechas en hora de Bogota.
// ============================================================

export type ColumnaCsv<T> = { titulo: string; valor: (fila: T) => string | number | null | undefined };

const fechaHora = new Intl.DateTimeFormat("sv-SE", {
  timeZone: "America/Bogota", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit",
});

/** "2026-11-22 14:05" en hora de Bogota. */
export const fechaCsv = (d: Date) => fechaHora.format(d);

function celda(v: string | number | null | undefined): string {
  if (v === null || v === undefined) return "";
  if (typeof v === "number") return String(v).replace(".", ",");
  // Evita la inyeccion de formulas al abrir el archivo en una hoja de calculo.
  let texto = /^[=+\-@\t\r]/.test(v) ? `'${v}` : v;
  if (/[;"\n\r]/.test(texto)) texto = `"${texto.replace(/"/g, '""')}"`;
  return texto;
}

export function generarCsv<T>(columnas: ColumnaCsv<T>[], filas: T[]): string {
  const lineas = [columnas.map((c) => celda(c.titulo)).join(";")];
  for (const f of filas) lineas.push(columnas.map((c) => celda(c.valor(f))).join(";"));
  return `﻿${lineas.join("\r\n")}\r\n`;
}

export function respuestaCsv(nombreArchivo: string, contenido: string): Response {
  return new Response(contenido, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${nombreArchivo}"`,
      "Cache-Control": "no-store",
    },
  });
}
