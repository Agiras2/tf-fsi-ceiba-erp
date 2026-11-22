// ============================================================
// CeibaERP - Descarga de archivos de la API desde el navegador
// Si la API responde un error, se muestra su mensaje en lugar de
// descargar un archivo con el JSON del error.
// ============================================================
import { ErrorCliente } from "@/lib/api-cliente";

export async function descargarArchivo(url: string): Promise<string> {
  const res = await fetch(url);
  if (res.status === 401) window.location.reload();
  if (!res.ok) {
    const cuerpo = await res.json().catch(() => null);
    throw new ErrorCliente(res.status, cuerpo?.error?.codigo ?? "ERROR", cuerpo?.error?.mensaje ?? "No fue posible generar el archivo.");
  }
  const nombre = /filename="([^"]+)"/.exec(res.headers.get("Content-Disposition") ?? "")?.[1] ?? "reporte.csv";
  const enlace = document.createElement("a");
  enlace.href = URL.createObjectURL(await res.blob());
  enlace.download = nombre;
  document.body.appendChild(enlace);
  enlace.click();
  enlace.remove();
  setTimeout(() => URL.revokeObjectURL(enlace.href), 1000);
  return nombre;
}
