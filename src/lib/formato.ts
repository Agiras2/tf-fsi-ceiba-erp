// ============================================================
// CeibaERP - Formatos de presentacion (es-CO, America/Bogota)
// ============================================================

const cop = new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 });
const numero = new Intl.NumberFormat("es-CO");
const fechaHora = new Intl.DateTimeFormat("es-CO", { dateStyle: "medium", timeStyle: "short", timeZone: "America/Bogota" });
const fecha = new Intl.DateTimeFormat("es-CO", { dateStyle: "medium", timeZone: "America/Bogota" });

export const formatoCOP = (v: number | null | undefined) => (v == null ? "—" : cop.format(v));
export const formatoNumero = (v: number | null | undefined) => (v == null ? "—" : numero.format(v));
export const formatoFechaHora = (v: string | Date | null | undefined) => (v ? fechaHora.format(new Date(v)) : "—");
export const formatoFecha = (v: string | Date | null | undefined) => (v ? fecha.format(new Date(v)) : "—");

/** Columnas DATE ("AAAA-MM-DD", p. ej. la fecha esperada de una orden): se muestran sin desfase horario. */
const dia = new Intl.DateTimeFormat("es-CO", { dateStyle: "medium", timeZone: "UTC" });
export const formatoDia = (v: string | null | undefined) => (v ? dia.format(new Date(`${v}T00:00:00Z`)) : "—");

/** Porcentaje con un decimal: 24,5 %. */
const pct = new Intl.NumberFormat("es-CO", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
export const formatoPct = (v: number | null | undefined) => (v == null ? "—" : `${pct.format(v)} %`);

/** Margen bruto de un producto sobre el precio de venta: 21,6 % (DEF-08). */
export const formatoMargen = (precio: number, costo: number) =>
  precio > 0 ? formatoPct(((precio - costo) / precio) * 100) : "—";

/** Pesos abreviados para ejes de graficos: $ 3,6 M. */
const copCorto = new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", notation: "compact", maximumFractionDigits: 1 });
export const formatoCOPCorto = (v: number | null | undefined) => (v == null ? "—" : copCorto.format(v));
