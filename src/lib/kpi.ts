// ============================================================
// CeibaERP - Definicion de los KPI, semaforos e interpretacion por reglas
// (docs/06-KPI secciones 2, 4 y 5). Compartido por cliente y servidor:
// las reglas son deterministas y se prueban sin base de datos (PRU-U06).
// ============================================================
import { formatoCOP, formatoNumero, formatoPct } from "@/lib/formato";

export const IDS_KPI = ["KPI-01", "KPI-02", "KPI-03", "KPI-04", "KPI-05", "KPI-06", "KPI-07", "KPI-08"] as const;
export type IdKpi = (typeof IDS_KPI)[number];

export type Semaforo = "verde" | "amarillo" | "rojo" | "sin-dato";

/** relativa: % frente al anterior; puntos: diferencia en puntos porcentuales; ninguna: foto actual. */
export type Comparacion = "relativa" | "puntos" | "ninguna";

export type DefinicionKpi = {
  id: IdKpi;
  nombre: string;
  unidad: "COP" | "%" | "productos" | "clientes" | "veces";
  definicion: string;
  formula: string;
  comparacion: Comparacion;
  /** El filtro de categoria no aplica a este KPI (docs/06-KPI). */
  sinCategoria?: boolean;
  /** Herramienta de IA que consulta el mismo dato (docs/06-KPI seccion 5). */
  herramienta: string;
};

export const KPIS: Record<IdKpi, DefinicionKpi> = {
  "KPI-01": {
    id: "KPI-01", nombre: "Ventas totales", unidad: "COP", comparacion: "relativa", herramienta: "consultarKpis",
    definicion: "Valor total vendido en el periodo (sin ventas anuladas).",
    formula: "Σ subtotal de los ítems de las ventas registradas",
  },
  "KPI-02": {
    id: "KPI-02", nombre: "Ticket promedio", unidad: "COP", comparacion: "relativa", herramienta: "consultarKpis",
    definicion: "Valor promedio de cada venta.",
    formula: "Ventas totales / número de ventas registradas",
  },
  "KPI-03": {
    id: "KPI-03", nombre: "Margen bruto", unidad: "%", comparacion: "puntos", herramienta: "consultarKpis",
    definicion: "Parte de las ventas que queda después del costo de lo vendido.",
    formula: "(Ventas − costo de lo vendido) / ventas × 100",
  },
  "KPI-04": {
    id: "KPI-04", nombre: "Nivel de agotamiento", unidad: "%", comparacion: "ninguna", herramienta: "productosEnRiesgo",
    definicion: "Combinaciones producto–sucursal activas sin existencias (situación actual).",
    formula: "Inventarios con stock 0 / inventarios de productos activos × 100",
  },
  "KPI-05": {
    id: "KPI-05", nombre: "Baja rotación", unidad: "productos", comparacion: "ninguna", herramienta: "productosBajaRotacion",
    definicion: "Productos con existencias que no se vendieron o cuyo stock alcanza para más de 60 días.",
    formula: "Productos con stock > 0 y (sin ventas o cobertura > 60 días)",
  },
  "KPI-06": {
    id: "KPI-06", nombre: "Cumplimiento de pedidos", unidad: "%", comparacion: "puntos", sinCategoria: true,
    herramienta: "cumplimientoProveedores",
    definicion: "Órdenes entregadas a tiempo entre las que debían llegar en el periodo (hasta hoy).",
    formula: "Recibidas en o antes de la fecha esperada / aprobadas o recibidas con fecha esperada en el periodo × 100",
  },
  "KPI-07": {
    id: "KPI-07", nombre: "Clientes recurrentes", unidad: "clientes", comparacion: "relativa", sinCategoria: true,
    herramienta: "clientesRecurrentes",
    definicion: "Clientes identificados con más de una compra en el periodo.",
    formula: "Clientes con más de una venta registrada en el periodo",
  },
  "KPI-08": {
    id: "KPI-08", nombre: "Rotación de inventario", unidad: "veces", comparacion: "relativa", herramienta: "consultarKpis",
    definicion: "Veces que el inventario promedio se vendió en el periodo.",
    formula: "Costo de lo vendido / ((inventario inicial + final) / 2), al costo actual",
  },
};

/** Variacion frente al periodo anterior segun el tipo de comparacion del KPI. */
export function calcularVariacion(id: IdKpi, actual: number | null, anterior: number | null): number | null {
  const tipo = KPIS[id].comparacion;
  if (tipo === "ninguna" || actual === null || anterior === null) return null;
  if (tipo === "puntos") return redondear(actual - anterior, 2);
  if (anterior === 0) return null;
  return redondear(((actual - anterior) / Math.abs(anterior)) * 100, 2);
}

/** Semaforos de docs/06-KPI seccion 4. */
export function calcularSemaforo(id: IdKpi, valor: number | null, variacion: number | null): Semaforo {
  const porVariacion = (limiteAmarillo: number) => {
    if (variacion === null) return "sin-dato" as const;
    if (variacion >= 0) return "verde" as const;
    return variacion >= -limiteAmarillo ? ("amarillo" as const) : ("rojo" as const);
  };
  if (id === "KPI-01" || id === "KPI-02") return porVariacion(5);
  if (id === "KPI-07" || id === "KPI-08") return porVariacion(10);
  if (valor === null) return "sin-dato";
  switch (id) {
    case "KPI-03":
      return valor >= 22 ? "verde" : valor >= 15 ? "amarillo" : "rojo";
    case "KPI-04":
      return valor < 3 ? "verde" : valor <= 8 ? "amarillo" : "rojo";
    case "KPI-05":
      return valor <= 5 ? "verde" : valor <= 10 ? "amarillo" : "rojo";
    case "KPI-06":
      return valor >= 90 ? "verde" : valor >= 75 ? "amarillo" : "rojo";
  }
}

export type ValorKpi = {
  id: IdKpi;
  valor: number | null;
  anterior: number | null;
  variacion: number | null;
  semaforo: Semaforo;
};

export function valorKpi(id: IdKpi, valor: number | null, anterior: number | null): ValorKpi {
  const variacion = calcularVariacion(id, valor, anterior);
  return { id, valor, anterior, variacion, semaforo: calcularSemaforo(id, valor, variacion) };
}

/** Texto del valor de un KPI segun su unidad. */
export function formatoKpi(id: IdKpi, valor: number | null): string {
  if (valor === null) return "—";
  switch (KPIS[id].unidad) {
    case "COP":
      return formatoCOP(valor);
    case "%":
      return formatoPct(valor);
    case "veces":
      return `${formatoNumero(redondear(valor, 2))} veces`;
    default:
      return formatoNumero(valor);
  }
}

/** Texto de la variacion ("+4,2 %", "−1,3 pp"). */
export function formatoVariacion(id: IdKpi, variacion: number | null): string {
  if (variacion === null) return KPIS[id].comparacion === "ninguna" ? "Situación actual" : "Sin periodo comparable";
  const signo = variacion > 0 ? "+" : variacion < 0 ? "−" : "";
  const n = formatoNumero(redondear(Math.abs(variacion), 1));
  return `${signo}${n} ${KPIS[id].comparacion === "puntos" ? "pp" : "%"}`;
}

// ------------------------------------------------------------
// Interpretacion automatica (docs/06-KPI seccion 4, reglas IR-01 a IR-06)
// ------------------------------------------------------------

export type DatosInterpretacion = {
  kpis: Record<IdKpi, ValorKpi>;
  /** Ventas por sucursal en el periodo (IR-01). */
  sucursales: { nombre: string; ventas: number }[];
  /** Agotados por sucursal, situacion actual (IR-02). */
  agotadosPorSucursal: { nombre: string; agotados: number }[];
  /** Proveedor con mas entregas tardias o incumplidas en el periodo (IR-03). */
  proveedorMasTardio: { nombre: string; tardias: number; debidas: number } | null;
  /** KPI-05 con el valor inmovilizado al costo (IR-04). */
  bajaRotacion: { productos: number; valorInmovilizado: number };
  /** Categoria de menor margen en el periodo (IR-05). */
  categoriaMenorMargen: { nombre: string; margen: number } | null;
  /** Clientes recurrentes e identificados con alguna compra (IR-06). */
  clientes: { recurrentes: number; identificados: number };
};

export type Hallazgo = { regla: string; texto: string; semaforo: Semaforo };

export const MAX_HALLAZGOS = 5;

const alerta = (s: Semaforo) => s === "amarillo" || s === "rojo";

export function interpretar(d: DatosInterpretacion): Hallazgo[] {
  const h: Hallazgo[] = [];
  const k = d.kpis;

  // IR-01: variacion de ventas con la sucursal de mayor y menor venta.
  const ventas = k["KPI-01"];
  const orden = [...d.sucursales].filter((s) => s.ventas > 0).sort((a, b) => b.ventas - a.ventas);
  const extremos = orden.length >= 2
    ? ` La sucursal con más ventas es ${orden[0].nombre} (${formatoCOP(orden[0].ventas)}) y la de menos, ${orden[orden.length - 1].nombre} (${formatoCOP(orden[orden.length - 1].ventas)}).`
    : orden.length === 1 ? ` Todas las ventas del filtro son de ${orden[0].nombre}.` : "";
  if (ventas.variacion === null) {
    h.push({ regla: "IR-01", semaforo: "sin-dato", texto: `Las ventas del periodo suman ${formatoKpi("KPI-01", ventas.valor)}; no hay ventas en el periodo anterior para comparar.${extremos}` });
  } else {
    const sentido = ventas.variacion >= 0 ? "subieron" : "bajaron";
    h.push({ regla: "IR-01", semaforo: ventas.semaforo, texto: `Las ventas ${sentido} ${formatoVariacion("KPI-01", ventas.variacion).replace(/^[+−]/, "")} frente al periodo anterior (${formatoKpi("KPI-01", ventas.valor)}).${extremos}` });
  }

  // IR-02: agotamiento en amarillo o rojo.
  const agot = k["KPI-04"];
  if (alerta(agot.semaforo)) {
    const total = d.agotadosPorSucursal.reduce((a, s) => a + s.agotados, 0);
    const mayor = [...d.agotadosPorSucursal].sort((a, b) => b.agotados - a.agotados)[0];
    const donde = mayor && mayor.agotados > 0 ? ` y se concentran en ${mayor.nombre} (${formatoNumero(mayor.agotados)})` : "";
    h.push({ regla: "IR-02", semaforo: agot.semaforo, texto: `El agotamiento es de ${formatoKpi("KPI-04", agot.valor)}: hay ${formatoNumero(total)} combinaciones producto–sucursal sin existencias${donde}.` });
  }

  // IR-03: cumplimiento en amarillo o rojo.
  const cump = k["KPI-06"];
  if (alerta(cump.semaforo) && d.proveedorMasTardio && d.proveedorMasTardio.tardias > 0) {
    const p = d.proveedorMasTardio;
    h.push({ regla: "IR-03", semaforo: cump.semaforo, texto: `El cumplimiento de pedidos es de ${formatoKpi("KPI-06", cump.valor)}. ${p.nombre} es el proveedor con más entregas tardías o pendientes vencidas (${formatoNumero(p.tardias)} de ${formatoNumero(p.debidas)}).` });
  }

  // IR-04: baja rotacion.
  if (d.bajaRotacion.productos > 0) {
    h.push({ regla: "IR-04", semaforo: k["KPI-05"].semaforo, texto: `${formatoNumero(d.bajaRotacion.productos)} producto(s) tienen baja rotación, con ${formatoCOP(d.bajaRotacion.valorInmovilizado)} inmovilizados al costo.` });
  }

  // IR-05: margen en amarillo o rojo.
  const margen = k["KPI-03"];
  if (alerta(margen.semaforo) && d.categoriaMenorMargen) {
    h.push({ regla: "IR-05", semaforo: margen.semaforo, texto: `El margen bruto es de ${formatoKpi("KPI-03", margen.valor)}; la categoría de menor margen es ${d.categoriaMenorMargen.nombre} (${formatoPct(d.categoriaMenorMargen.margen)}).` });
  }

  // IR-06: proporcion de clientes recurrentes.
  if (d.clientes.identificados > 0) {
    const pct = (d.clientes.recurrentes / d.clientes.identificados) * 100;
    h.push({ regla: "IR-06", semaforo: k["KPI-07"].semaforo, texto: `${formatoNumero(d.clientes.recurrentes)} de ${formatoNumero(d.clientes.identificados)} clientes identificados compraron más de una vez (${formatoPct(pct)}).` });
  }

  return h.slice(0, MAX_HALLAZGOS);
}

function redondear(n: number, decimales: number) {
  const f = 10 ** decimales;
  return Math.round(n * f) / f;
}
