// ============================================================
// CeibaERP - Piezas de validacion reutilizables (cliente y servidor)
// ============================================================
import { z } from "@/lib/zod";
import { esFechaValida } from "@/lib/fechas";

/** Texto obligatorio recortado. */
export const texto = (min: number, max: number) => z.string().trim().min(min).max(max);

/** Texto opcional: "" y espacios se guardan como null. */
export const textoOpcional = (max: number) =>
  z.preprocess(
    (v) => (typeof v === "string" && v.trim() === "" ? null : v),
    z.string().trim().max(max).nullable().optional(),
  );

/** Correo opcional: "" se guarda como null. */
export const correoOpcional = z.preprocess(
  (v) => (typeof v === "string" && v.trim() === "" ? null : typeof v === "string" ? v.trim().toLowerCase() : v),
  z.email().max(120).nullable().optional(),
);

/** Telefono opcional: digitos, espacios, guiones y +. */
export const telefonoOpcional = z.preprocess(
  (v) => (typeof v === "string" && v.trim() === "" ? null : v),
  z.string().trim().regex(/^[0-9+\-\s]{7,30}$/, { message: "Teléfono no válido." }).nullable().optional(),
);

/** Identificador numerico (acepta texto de formularios). */
export const id = z.coerce.number().int().positive();

/** Monto en pesos con hasta 2 decimales. */
export const monto = z.coerce
  .number()
  .positive()
  .max(1_000_000_000)
  .refine((n) => Math.round(n * 100) === n * 100, { message: "Use máximo 2 decimales." });

/** Fecha de calendario "AAAA-MM-DD" (los filtros y la fecha esperada de las ordenes). */
export const fecha = z.string().trim().refine(esFechaValida, { message: "Use una fecha válida (AAAA-MM-DD)." });

/** Parametros de listado: busqueda, paginacion y estado. */
export const esquemaListado = z.object({
  q: z.string().trim().max(100).optional().default(""),
  pagina: z.coerce.number().int().min(1).default(1),
  tamano: z.coerce.number().int().min(1).max(100).default(20),
  activo: z.enum(["true", "false", "todos"]).default("todos"),
});
export type ParametrosListado = z.infer<typeof esquemaListado>;

export type Pagina<T> = { datos: T[]; total: number; pagina: number; tamano: number };
