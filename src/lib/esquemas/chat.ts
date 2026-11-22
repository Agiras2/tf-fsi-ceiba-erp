// ============================================================
// CeibaERP - Esquemas del chatbot (docs/04-REQ RF-31 a RF-35). Cliente y servidor.
// ============================================================
import { z } from "@/lib/zod";
import { id, texto } from "./comunes";

export const MAX_LARGO_MENSAJE = 1000;

export const esquemaMensajeChat = z
  .object({
    conversacionId: id.nullable().optional(),
    mensaje: texto(1, MAX_LARGO_MENSAJE),
  })
  .strict();

/** Fuente consultada por una respuesta (herramienta y filtros aplicados por el servidor). */
export type FuenteConsultada = {
  herramienta: string;
  argumentos: Record<string, unknown>;
  filtros: Record<string, string> | null;
  ok: boolean;
  error?: string;
  duracionMs: number;
};

export type MensajeChat = {
  id: number;
  rol: "USUARIO" | "ASISTENTE";
  contenido: string;
  herramientasUsadas: FuenteConsultada[] | null;
  modelo: string | null;
  createdAt: string;
};

export type Conversacion = { id: number; titulo: string; createdAt: string; mensajes: number; ultimoMensaje: string | null };

/** Etiquetas legibles de las herramientas para la lista "Fuentes consultadas". */
export const ETIQUETA_HERRAMIENTA: Record<string, string> = {
  buscarProducto: "Búsqueda de productos",
  topProductos: "Productos más vendidos (G-03)",
  productosEnRiesgo: "Productos en riesgo de agotamiento",
  productosBajaRotacion: "Baja rotación (KPI-05)",
  ordenesPendientes: "Órdenes de compra pendientes",
  cumplimientoProveedores: "Cumplimiento de proveedores (KPI-06)",
  consultarKpis: "KPI del dashboard",
  ventasPorSucursal: "Ventas por sucursal (G-02)",
  tendenciaVentas: "Tendencia semanal de ventas",
  margenPorCategoria: "Margen por categoría",
  clientesRecurrentes: "Clientes recurrentes (KPI-07)",
  ultimasEjecucionesAgentes: "Últimos informes de los agentes",
};
