// ============================================================
// CeibaERP - Zod configurado con mensajes en espanol.
// Todos los esquemas deben importar "z" desde este archivo.
// ============================================================
import { z } from "zod";

z.config(z.locales.es());

export { z };
