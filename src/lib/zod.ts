// ============================================================
// CeibaERP - Zod con mensajes en espanol (cliente y servidor).
// Todos los esquemas deben importar "z" desde este archivo.
// ============================================================
import { z } from "zod";

z.config(z.locales.es());

export { z };
