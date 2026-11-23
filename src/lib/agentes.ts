// ============================================================
// CeibaERP - Reglas de los agentes que se calculan en codigo (docs/07-IAG 5.2, 5.4 y 6.4)
// El modelo interpreta; las cantidades, prioridades base, agrupaciones y la
// regla de coherencia entre agentes las decide este modulo. Sin acceso a BD.
// ============================================================
import type { Prioridad, TipoRecomendacion } from "@/lib/esquemas/agentes";

/** Dias de seguridad (S) que se suman al tiempo de entrega (configurable). */
export const DIAS_SEGURIDAD = 7;

/** Datos de un producto en una sucursal para el calculo de reposicion. */
export type FilaReposicion = {
  productoId: number;
  sku: string;
  producto: string;
  categoria: string;
  sucursalId: number;
  sucursal: string;
  proveedorId: number;
  proveedor: string;
  tiempoEntregaDias: number;
  costo: number;
  stock: number;
  stockMinimo: number;
  stockMaximo: number;
  /** Venta diaria promedio de los ultimos 28 dias completos (v). */
  ventaDiaria: number;
  /** Unidades en ordenes BORRADOR o APROBADA para ese producto y sucursal (t). */
  enTransito: number;
};

export type MotivoReposicion = "AGOTADO" | "BAJO_MINIMO" | "COBERTURA_BAJA";

export const ETIQUETA_MOTIVO: Record<MotivoReposicion, string> = {
  AGOTADO: "Agotado",
  BAJO_MINIMO: "Bajo el mínimo",
  COBERTURA_BAJA: "Cobertura menor al tiempo de entrega más los días de seguridad",
};

export type Candidato = FilaReposicion & {
  candidatoId: string;
  /** Dias de cobertura (null = sin ventas, cobertura infinita). */
  coberturaDias: number | null;
  stockObjetivo: number;
  cantidadSugerida: number;
  prioridadBase: Prioridad;
  motivo: MotivoReposicion;
};

const RANGO: Record<Prioridad, number> = { ALTA: 3, MEDIA: 2, BAJA: 1 };

export function idCandidato(productoId: number, sucursalId: number): string {
  return `P${productoId}-S${sucursalId}`;
}

/**
 * docs/07-IAG 5.2. Stock objetivo = min(maximo, max(minimo + 1, ceil(v * (L + S)))).
 * Cantidad = max(0, objetivo - stock - en transito). Es candidato si (stock <= minimo o
 * cobertura < L + S) y la cantidad es mayor que 0. Prioridad base: ALTA si esta agotado o
 * la cobertura es menor que L; MEDIA si es menor que L + S; BAJA en los demas casos.
 */
export function evaluarReposicion(f: FilaReposicion, diasSeguridad = DIAS_SEGURIDAD): Candidato | null {
  const v = Math.max(0, f.ventaDiaria);
  const L = Math.max(0, f.tiempoEntregaDias);
  const horizonte = L + diasSeguridad;
  const cobertura = v > 0 ? f.stock / v : null;
  // El epsilon evita que 6.0000000001 por redondeo binario se convierta en 7.
  const porDemanda = Math.ceil(v * horizonte - 1e-9);
  const objetivo = Math.min(f.stockMaximo, Math.max(f.stockMinimo + 1, porDemanda));
  const cantidad = Math.max(0, objetivo - f.stock - Math.max(0, f.enTransito));
  const coberturaBaja = cobertura !== null && cobertura < horizonte;
  if (!(f.stock <= f.stockMinimo || coberturaBaja) || cantidad <= 0) return null;

  const prioridadBase: Prioridad = f.stock === 0 || (cobertura !== null && cobertura < L) ? "ALTA" : coberturaBaja ? "MEDIA" : "BAJA";
  const motivo: MotivoReposicion = f.stock === 0 ? "AGOTADO" : f.stock <= f.stockMinimo ? "BAJO_MINIMO" : "COBERTURA_BAJA";
  return {
    ...f,
    ventaDiaria: Math.round(v * 100) / 100,
    candidatoId: idCandidato(f.productoId, f.sucursalId),
    coberturaDias: cobertura === null ? null : Math.round(cobertura * 10) / 10,
    stockObjetivo: objetivo,
    cantidadSugerida: cantidad,
    prioridadBase,
    motivo,
  };
}

/** Candidatos ordenados: primero la prioridad, luego la menor cobertura. */
export function calcularCandidatos(filas: FilaReposicion[], diasSeguridad = DIAS_SEGURIDAD): Candidato[] {
  return filas
    .map((f) => evaluarReposicion(f, diasSeguridad))
    .filter((c): c is Candidato => c !== null)
    .sort((a, b) =>
      RANGO[b.prioridadBase] - RANGO[a.prioridadBase]
      || (a.coberturaDias ?? Number.POSITIVE_INFINITY) - (b.coberturaDias ?? Number.POSITIVE_INFINITY)
      || a.producto.localeCompare(b.producto, "es")
      || a.sucursal.localeCompare(b.sucursal, "es"));
}

export type DecisionModelo = { candidatoId: string; incluir: boolean; prioridad: Prioridad; justificacion: string };

export type Decision = Candidato & {
  incluir: boolean;
  prioridad: Prioridad;
  justificacion: string;
  /** true si el modelo excluyo el candidato o le subio la prioridad. */
  ajustadaPorIA: boolean;
};

function justificacionBase(c: Candidato): string {
  const cobertura = c.coberturaDias === null ? "sin ventas en 28 días" : `cobertura de ${String(c.coberturaDias).replace(".", ",")} días`;
  return `${ETIQUETA_MOTIVO[c.motivo]}: stock ${c.stock} (mínimo ${c.stockMinimo}), ${cobertura}, entrega del proveedor en ${c.tiempoEntregaDias} días.`;
}

/**
 * docs/07-IAG 5.4: aplica las decisiones del modelo sobre los candidatos del codigo.
 * - Se descartan los candidatoId que no existen (se informan en "ignorados").
 * - La prioridad solo sube respecto a la base; las cantidades siempre son las del codigo.
 * - Un candidato que el modelo no menciona se incluye con su prioridad base.
 */
export function aplicarDecisiones(candidatos: Candidato[], items: DecisionModelo[]): { decisiones: Decision[]; ignorados: string[] } {
  const porId = new Map(items.map((i) => [i.candidatoId, i] as const).reverse()); // la primera mencion gana
  const existentes = new Set(candidatos.map((c) => c.candidatoId));
  const ignorados = [...new Set(items.map((i) => i.candidatoId).filter((idc) => !existentes.has(idc)))];
  const decisiones = candidatos.map((c): Decision => {
    const d = porId.get(c.candidatoId);
    if (!d) return { ...c, incluir: true, prioridad: c.prioridadBase, justificacion: justificacionBase(c), ajustadaPorIA: false };
    const prioridad = RANGO[d.prioridad] > RANGO[c.prioridadBase] ? d.prioridad : c.prioridadBase;
    const ajustada = !d.incluir || prioridad !== c.prioridadBase;
    return {
      ...c,
      incluir: d.incluir,
      prioridad,
      justificacion: ajustada ? d.justificacion : justificacionBase(c),
      ajustadaPorIA: ajustada,
    };
  });
  return { decisiones, ignorados };
}

export type GrupoOrden = {
  proveedorId: number;
  proveedor: string;
  sucursalId: number;
  sucursal: string;
  tiempoEntregaDias: number;
  prioridad: Prioridad;
  items: Decision[];
};

/** Una orden en BORRADOR por cada combinacion (proveedor, sucursal) con items incluidos. */
export function agruparOrdenes(decisiones: Decision[], maxItems = 60): GrupoOrden[] {
  const grupos = new Map<string, GrupoOrden>();
  for (const d of decisiones) {
    if (!d.incluir || d.cantidadSugerida <= 0) continue;
    const clave = `${d.proveedorId}-${d.sucursalId}`;
    let g = grupos.get(clave);
    if (!g) {
      g = { proveedorId: d.proveedorId, proveedor: d.proveedor, sucursalId: d.sucursalId, sucursal: d.sucursal, tiempoEntregaDias: d.tiempoEntregaDias, prioridad: d.prioridad, items: [] };
      grupos.set(clave, g);
    }
    if (g.items.length < maxItems) g.items.push(d);
    if (RANGO[d.prioridad] > RANGO[g.prioridad]) g.prioridad = d.prioridad;
  }
  return [...grupos.values()].sort((a, b) =>
    RANGO[b.prioridad] - RANGO[a.prioridad] || a.proveedor.localeCompare(b.proveedor, "es") || a.sucursal.localeCompare(b.sucursal, "es"));
}

/** Observaciones de la orden (maximo 500 caracteres): origen, prioridad y criterio. */
export function observacionesOrden(g: GrupoOrden, ejecucionId: number): string {
  const altas = g.items.filter((i) => i.prioridad === "ALTA").length;
  const ajustadas = g.items.filter((i) => i.ajustadaPorIA).map((i) => `${i.sku}: ${i.justificacion}`);
  const base = `Propuesta del Agente 1 (ejecución #${ejecucionId}). Prioridad ${g.prioridad.toLowerCase()}; ${g.items.length} producto(s), ${altas} de prioridad alta. `
    + `Cantidades calculadas en código para cubrir ${g.tiempoEntregaDias} días de entrega más ${DIAS_SEGURIDAD} de seguridad, descontando lo que ya está en tránsito.`;
  const texto = ajustadas.length ? `${base} Ajustes de la IA: ${ajustadas.join(" ")}` : base;
  return texto.length > 500 ? `${texto.slice(0, 499)}…` : texto;
}

// ------------------------------------------------------------
// Regla de coherencia entre agentes (docs/07-IAG 6.4)
// ------------------------------------------------------------

export type RecomendacionResuelta = {
  tipo: TipoRecomendacion;
  prioridad: Prioridad;
  productoId: number | null;
  sucursalId: number | null;
  titulo: string;
  justificacion: string;
};

export type ProductoEnRiesgo = { productoId: number; sucursalId: number };

/** Tipos que empujan la venta de un producto: incoherentes si el producto esta en riesgo de agotamiento. */
const IMPULSAN_VENTA: readonly TipoRecomendacion[] = ["PROMOCION", "LIQUIDACION"];

export const MOTIVO_COHERENCIA = "Descartada por regla de coherencia: el Agente 1 marcó este producto en riesgo de agotamiento.";

/**
 * No se acepta una promocion (ni una liquidacion) de un producto que el Agente 1 marco en
 * riesgo. Si la recomendacion indica sucursal, se compara el par producto-sucursal; si no,
 * basta con que el producto este en riesgo en alguna sucursal.
 */
export function aplicarCoherencia<T extends RecomendacionResuelta>(recomendaciones: T[], enRiesgo: ProductoEnRiesgo[]) {
  const pares = new Set(enRiesgo.map((r) => `${r.productoId}-${r.sucursalId}`));
  const productos = new Set(enRiesgo.map((r) => r.productoId));
  const validas: T[] = [];
  const descartadas: { recomendacion: T; motivo: string }[] = [];
  for (const r of recomendaciones) {
    const enConflicto = IMPULSAN_VENTA.includes(r.tipo) && r.productoId !== null
      && (r.sucursalId !== null ? pares.has(`${r.productoId}-${r.sucursalId}`) : productos.has(r.productoId));
    if (enConflicto) descartadas.push({ recomendacion: r, motivo: MOTIVO_COHERENCIA });
    else validas.push(r);
  }
  return { validas, descartadas };
}

/** Quita bloques ```json ... ``` si el modelo los agrega alrededor del JSON. */
export function extraerJson(texto: string): unknown {
  const limpio = texto.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
  return JSON.parse(limpio);
}
