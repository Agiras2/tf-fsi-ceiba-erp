// ============================================================
// CeibaERP - Esquemas de los catalogos (docs/04-REQ RF-03, RF-06 a RF-10)
// Base sin refinamientos (para .partial() en edicion) + esquema completo.
// Las reglas que combinan campos (RN-14, RN-20) se verifican tambien en
// el servicio al editar, con los valores ya guardados.
// ============================================================
import { z } from "@/lib/zod";
import { correoOpcional, id, monto, telefonoOpcional, texto, textoOpcional } from "./comunes";
import { ROLES } from "@/lib/navegacion";

// --- Sucursal (RF-06) ---
export const baseSucursal = z.object({
  codigo: z.string().trim().toUpperCase().regex(/^[A-Z0-9-]{3,10}$/, { message: "Use de 3 a 10 letras, números o guiones." }),
  nombre: texto(2, 80),
  ciudad: texto(2, 60),
  direccion: texto(3, 120),
  activa: z.boolean().optional(),
});
export const esquemaSucursal = baseSucursal.strict();
export const esquemaSucursalEdicion = baseSucursal.partial().strict();

// --- Categoria (RF-07) ---
export const baseCategoria = z.object({
  nombre: texto(2, 60),
  descripcion: textoOpcional(200),
  activa: z.boolean().optional(),
});
export const esquemaCategoria = baseCategoria.strict();
export const esquemaCategoriaEdicion = baseCategoria.partial().strict();

// --- Proveedor (RF-08) ---
export const baseProveedor = z.object({
  nit: z.string().trim().regex(/^[0-9]{6,12}(-[0-9])?$/, { message: "NIT no válido (ej. 900123456-7)." }),
  nombre: texto(2, 120),
  contacto: textoOpcional(100),
  telefono: telefonoOpcional,
  email: correoOpcional,
  tiempoEntregaDias: z.coerce.number().int().min(1).max(60),
  activo: z.boolean().optional(),
});
export const esquemaProveedor = baseProveedor.strict();
export const esquemaProveedorEdicion = baseProveedor.partial().strict();

// --- Producto (RF-09) ---
export const UNIDADES = ["unidad", "kg", "paquete", "litro"] as const;
export const baseProducto = z.object({
  sku: z.string().trim().toUpperCase().regex(/^[A-Z0-9-]{3,20}$/, { message: "Use de 3 a 20 letras, números o guiones." }),
  nombre: texto(2, 120),
  descripcion: textoOpcional(300),
  categoriaId: id,
  proveedorId: id,
  unidad: z.enum(UNIDADES),
  costo: monto,
  precio: monto,
  activo: z.boolean().optional(),
});
/** RN-14: el precio no puede ser menor que el costo. */
export const reglaPrecioCosto = (d: { costo?: number; precio?: number }) =>
  d.costo === undefined || d.precio === undefined || d.precio >= d.costo;
export const esquemaProducto = baseProducto
  .strict()
  .refine(reglaPrecioCosto, { message: "El precio debe ser mayor o igual al costo.", path: ["precio"] });
export const esquemaProductoEdicion = baseProducto.partial().strict();

// --- Cliente (RF-10) ---
export const baseCliente = z.object({
  documento: z.string().trim().regex(/^[0-9]{5,20}$/, { message: "Use solo números (5 a 20 dígitos)." }),
  nombre: texto(3, 120),
  email: correoOpcional,
  telefono: telefonoOpcional,
  activo: z.boolean().optional(),
});
export const esquemaCliente = baseCliente.strict();
export const esquemaClienteEdicion = baseCliente.partial().strict();

// --- Usuario (RF-03) ---
export const contrasena = z
  .string()
  .min(10, { message: "Mínimo 10 caracteres." })
  .max(100)
  .regex(/[A-Za-z]/, { message: "Debe incluir letras." })
  .regex(/[0-9]/, { message: "Debe incluir números." });

/** RN-20: BODEGA y CAJERO requieren sucursal; ADMIN y GERENTE no la tienen. */
export const reglaRolSucursal = (d: { rol?: string; sucursalId?: number | null }) =>
  d.rol === undefined ||
  ((d.rol === "BODEGA" || d.rol === "CAJERO") ? d.sucursalId != null : d.sucursalId == null);

const sucursalOpcional = z.preprocess((v) => (v === "" || v === undefined ? null : v), id.nullable());

export const baseUsuario = z.object({
  nombre: texto(3, 100),
  email: z.string().trim().toLowerCase().pipe(z.email()).pipe(z.string().max(120)),
  rol: z.enum(ROLES),
  sucursalId: sucursalOpcional,
  activo: z.boolean().optional(),
});
export const esquemaUsuario = baseUsuario
  .extend({ password: contrasena })
  .strict()
  .refine(reglaRolSucursal, {
    message: "Bodega y Cajero requieren sucursal; Administrador y Gerente no la tienen.",
    path: ["sucursalId"],
  });
export const esquemaUsuarioEdicion = baseUsuario.extend({ password: contrasena }).partial().strict();

export type DatosSucursal = z.infer<typeof esquemaSucursal>;
export type DatosCategoria = z.infer<typeof esquemaCategoria>;
export type DatosProveedor = z.infer<typeof esquemaProveedor>;
export type DatosProducto = z.infer<typeof esquemaProducto>;
export type DatosCliente = z.infer<typeof esquemaCliente>;
export type DatosUsuario = z.infer<typeof esquemaUsuario>;
