// ============================================================
// CeibaERP - Cliente HTTP para los componentes del navegador
// Convierte las respuestas de error al formato uniforme de la API.
// ============================================================

export type DetalleError = { campo: string; mensaje: string };

export class ErrorCliente extends Error {
  constructor(
    public readonly status: number,
    public readonly codigo: string,
    mensaje: string,
    public readonly detalles: DetalleError[] = [],
  ) {
    super(mensaje);
  }

  /** Errores por campo para mostrarlos junto a cada input. */
  porCampo(): Record<string, string> {
    const r: Record<string, string> = {};
    for (const d of this.detalles) if (d.campo && !r[d.campo]) r[d.campo] = d.mensaje;
    return r;
  }
}

export async function api<T = unknown>(url: string, init?: RequestInit & { json?: unknown }): Promise<T> {
  const { json, ...resto } = init ?? {};
  let res: Response;
  try {
    res = await fetch(url, {
      ...resto,
      headers: { ...(json !== undefined ? { "Content-Type": "application/json" } : {}), ...resto.headers },
      body: json !== undefined ? JSON.stringify(json) : resto.body,
    });
  } catch {
    throw new ErrorCliente(0, "SIN_CONEXION", "No hay conexión con el servidor. Intente de nuevo.");
  }
  // Sesion vencida: al recargar, el proxy envia al usuario a /login con la ruta de destino.
  if (res.status === 401 && typeof window !== "undefined") window.location.reload();
  const cuerpo = await res.json().catch(() => null);
  if (!res.ok) {
    const e = cuerpo?.error;
    throw new ErrorCliente(res.status, e?.codigo ?? "ERROR", e?.mensaje ?? "Ocurrió un error inesperado.", e?.detalles ?? []);
  }
  return cuerpo as T;
}
