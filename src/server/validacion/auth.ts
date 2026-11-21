// ============================================================
// CeibaERP - Esquemas de validacion de autenticacion
// Modo estricto: los campos no declarados se rechazan (docs/09-SEG seccion 3).
// ============================================================
import { z } from "@/server/validacion/zod";

export const esquemaLogin = z
  .object({
    email: z.string().trim().toLowerCase().pipe(z.email({ message: "Ingrese un correo válido." })).pipe(z.string().max(120)),
    password: z.string().min(1, { message: "Ingrese la contraseña." }).max(200),
  })
  .strict();

export type DatosLogin = z.infer<typeof esquemaLogin>;
