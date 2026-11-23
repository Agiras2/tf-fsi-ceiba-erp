// ============================================================
// CeibaERP - Herramientas de los agentes (docs/07-IAG secciones 3, 5 y 6)
// Son de solo lectura y no se ofrecen en el chatbot (roles vacios).
// - calcularPropuestaReposicion devuelve los candidatos que el codigo ya calculo para
//   la ejecucion, para que el modelo trabaje exactamente sobre los mismos datos.
// - obtenerResultadoAgenteInventario lee de ejecucion_agente la salida validada del
//   Agente 1: es el contrato de datos entre agentes (docs/07-IAG seccion 7).
// ============================================================
import { z } from "@/lib/zod";
import { prisma } from "@/server/db";
import { ErrorApi } from "@/server/errores";
import { formatoDia } from "@/lib/formato";
import { hoyBogota } from "@/lib/fechas";
import { ETIQUETA_MOTIVO, type Candidato } from "@/lib/agentes";
import { HERRAMIENTAS, type Herramienta } from "./herramientas";

const SIN_ROLES = [] as const;

function deRegistro(...nombres: string[]): Herramienta[] {
  return nombres.map((n) => {
    const h = HERRAMIENTAS.find((x) => x.nombre === n);
    if (!h) throw new Error(`Herramienta ${n} no registrada.`);
    return h;
  });
}

/** Vista compacta de un candidato para el modelo (sin ids internos de la base de datos). */
export function candidatoParaModelo(c: Candidato) {
  return {
    candidatoId: c.candidatoId, sku: c.sku, producto: c.producto, categoria: c.categoria, sucursal: c.sucursal,
    proveedor: c.proveedor, tiempoEntregaDias: c.tiempoEntregaDias, stock: c.stock, stockMinimo: c.stockMinimo,
    stockMaximo: c.stockMaximo, ventaDiaria: c.ventaDiaria, coberturaDias: c.coberturaDias, enTransito: c.enTransito,
    stockObjetivo: c.stockObjetivo, cantidadSugerida: c.cantidadSugerida, prioridadBase: c.prioridadBase,
    motivo: ETIQUETA_MOTIVO[c.motivo],
  };
}

function herramientaPropuesta(candidatos: Candidato[], alcance: string, diasSeguridad: number): Herramienta {
  return {
    nombre: "calcularPropuestaReposicion",
    descripcion: "Candidatos de reposición calculados por el sistema para el alcance de esta ejecución: stock, umbrales, venta diaria de 28 días, cobertura, unidades en tránsito, stock objetivo, cantidad sugerida y prioridad base. Las cantidades las fija el sistema y no se pueden cambiar.",
    roles: SIN_ROLES,
    argumentos: z.object({
      sucursal: z.string().max(60).describe("Filtrar por nombre de sucursal dentro del alcance. Omitir para todas.").optional(),
    }),
    async ejecutar(args) {
      const filtro = typeof args.sucursal === "string" ? args.sucursal.trim().toLowerCase() : "";
      const lista = filtro ? candidatos.filter((c) => c.sucursal.toLowerCase().includes(filtro)) : candidatos;
      return {
        filtros: {
          alcance, situacion: `Actual (${formatoDia(hoyBogota())})`, demanda: "Últimos 28 días completos",
          diasSeguridad: String(diasSeguridad), ...(filtro ? { sucursal: String(args.sucursal) } : {}),
        },
        datos: {
          total: lista.length,
          formula: `stock objetivo = min(máximo, max(mínimo + 1, techo(venta diaria × (entrega + ${diasSeguridad})))); cantidad = objetivo − stock − en tránsito`,
          candidatos: lista.map(candidatoParaModelo),
        },
      };
    },
  };
}

/** Herramientas del Agente 1 para una ejecucion concreta. */
export function herramientasAgenteInventario(candidatos: Candidato[], alcance: string, diasSeguridad: number): Herramienta[] {
  return [
    herramientaPropuesta(candidatos, alcance, diasSeguridad),
    ...deRegistro("productosEnRiesgo", "ordenesPendientes", "cumplimientoProveedores"),
  ];
}

/** Salida del Agente 1 tal como queda guardada (la lee el Agente 2). */
export type ResultadoInventario = {
  alcance: string;
  diasSeguridad: number;
  resumen: string;
  criterios: string[];
  decisiones: {
    candidatoId: string; productoId: number; sucursalId: number; sku: string; producto: string; sucursal: string;
    proveedor: string; cantidad: number; prioridad: string; prioridadBase: string; incluir: boolean;
    motivo: string; coberturaDias: number | null; justificacion: string; ajustadaPorIA: boolean;
  }[];
  ignorados: string[];
  ordenes: { id: number; proveedor: string; sucursal: string; items: number; total: number | null; prioridad: string }[];
  ordenesFallidas: { proveedor: string; sucursal: string; error: string }[];
  alertas: { id: number; titulo: string }[];
};

function herramientaResultadoInventario(ejecucionPorDefecto: number | null): Herramienta {
  return {
    nombre: "obtenerResultadoAgenteInventario",
    descripcion: "Salida validada del Agente 1 (analista de inventario): resumen, criterios, productos en riesgo incluidos o excluidos de la reposición con su prioridad, órdenes en borrador creadas y alertas. Úsala para no recomendar promociones de productos en riesgo.",
    roles: SIN_ROLES,
    argumentos: z.object({
      ejecucionId: z.number().int().positive().describe("Número de la ejecución del Agente 1. Omitir para usar la indicada en las instrucciones.").optional(),
    }),
    async ejecutar(args) {
      const id = (args.ejecucionId as number | undefined) ?? ejecucionPorDefecto;
      if (!id) throw new ErrorApi(404, "SIN_RESULTADO", "No hay una ejecución completada del Agente 1 para considerar.");
      const e = await prisma.ejecucionAgente.findUnique({
        where: { id }, select: { id: true, agente: true, estado: true, resultado: true, fechaFin: true, modelo: true },
      });
      if (!e || e.agente !== "INVENTARIO" || e.estado !== "COMPLETADA" || !e.resultado) {
        throw new ErrorApi(404, "SIN_RESULTADO", `La ejecución #${id} no es una ejecución completada del Agente 1.`);
      }
      const r = e.resultado as unknown as ResultadoInventario;
      const enRiesgo = r.decisiones.map((d) => ({
        sku: d.sku, producto: d.producto, sucursal: d.sucursal, prioridad: d.prioridad, incluidoEnReposicion: d.incluir,
        cantidad: d.cantidad, coberturaDias: d.coberturaDias, motivo: d.motivo,
      }));
      return {
        filtros: { ejecucion: `#${e.id}`, alcance: r.alcance, fecha: e.fechaFin ? e.fechaFin.toISOString() : "" },
        datos: {
          resumen: r.resumen, criterios: r.criterios, productosEnRiesgo: enRiesgo,
          ordenesBorrador: r.ordenes.map((o) => ({ orden: o.id, proveedor: o.proveedor, sucursal: o.sucursal, items: o.items, prioridad: o.prioridad })),
          alertas: r.alertas.map((a) => a.titulo),
        },
      };
    },
  };
}

/** Herramientas del Agente 2: las comerciales del registro y la salida del Agente 1. */
export function herramientasAgenteComercial(ejecucionInventarioId: number | null): Herramienta[] {
  return [
    ...deRegistro("consultarKpis", "ventasPorSucursal", "topProductos", "tendenciaVentas", "margenPorCategoria", "productosBajaRotacion", "clientesRecurrentes"),
    herramientaResultadoInventario(ejecucionInventarioId),
  ];
}
