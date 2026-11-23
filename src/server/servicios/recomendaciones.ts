// ============================================================
// CeibaERP - Validacion humana de las recomendaciones de IA (docs/04-REQ RF-40, RN-18)
// Nacen PENDIENTES; solo el gerente las acepta o descarta y queda registrado quien
// y cuando. La actualizacion condicional evita decidir dos veces la misma.
// ============================================================
import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/server/db";
import { ErrorApi, errores } from "@/server/errores";
import { z } from "@/lib/zod";
import { esquemaListado } from "@/lib/esquemas/comunes";
import {
  ESTADOS_RECOMENDACION, ETIQUETA_ESTADO_RECOMENDACION, PRIORIDADES, TIPOS_RECOMENDACION,
  esquemaAceptarRecomendacion, esquemaDescartarRecomendacion,
} from "@/lib/esquemas/agentes";
import { auditar, pagina, paginar, type Contexto } from "./comun";
import { salidaRecomendacion } from "./agentes";

const sinFiltro = (v: unknown) => (v === "" || v === "todos" ? undefined : v);
const esquemaFiltros = esquemaListado.extend({
  estado: z.preprocess(sinFiltro, z.enum(ESTADOS_RECOMENDACION).optional()),
  tipo: z.preprocess(sinFiltro, z.enum(TIPOS_RECOMENDACION).optional()),
  prioridad: z.preprocess(sinFiltro, z.enum(PRIORIDADES).optional()),
});

const incluir = {
  producto: { select: { sku: true, nombre: true } },
  sucursal: { select: { nombre: true } },
  decididaPor: { select: { nombre: true } },
  ejecucion: { select: { id: true, agente: true, modelo: true, fechaInicio: true } },
} as const satisfies Prisma.RecomendacionInclude;

type Fila = Prisma.RecomendacionGetPayload<{ include: typeof incluir }>;

function salida(r: Fila) {
  return {
    ...salidaRecomendacion(r),
    ejecucion: { id: r.ejecucion.id, agente: r.ejecucion.agente, modelo: r.ejecucion.modelo, fechaInicio: r.ejecucion.fechaInicio.toISOString() },
  };
}

const ORDEN_PRIORIDAD: Record<string, number> = { ALTA: 0, MEDIA: 1, BAJA: 2 };

async function decidir(id: number, estado: "ACEPTADA" | "DESCARTADA", comentario: string | null, ctx: Contexto) {
  const r = await prisma.recomendacion.updateMany({
    where: { id, estado: "PENDIENTE" },
    data: { estado, comentarioDecision: comentario, decididaPorId: ctx.sesion.usuarioId, fechaDecision: new Date() },
  });
  if (r.count === 0) {
    const actual = await prisma.recomendacion.findUnique({ where: { id }, select: { estado: true } });
    if (!actual) throw errores.noEncontrado("La recomendación");
    throw new ErrorApi(409, "ESTADO_INVALIDO", `La recomendación #${id} ya fue decidida (${ETIQUETA_ESTADO_RECOMENDACION[actual.estado].toLowerCase()}).`);
  }
  await auditar(ctx, estado === "ACEPTADA" ? "RECOMENDACION_ACEPTADA" : "RECOMENDACION_DESCARTADA", "recomendacion", id, comentario ? { comentario } : {});
  return servicioRecomendaciones.obtener(id);
}

export const servicioRecomendaciones = {
  async listar(params: URLSearchParams) {
    const f = esquemaFiltros.parse(Object.fromEntries(params));
    const where: Prisma.RecomendacionWhereInput = {
      estado: f.estado, tipo: f.tipo, prioridad: f.prioridad,
      ...(f.q ? { OR: [{ titulo: { contains: f.q, mode: "insensitive" } }, { producto: { nombre: { contains: f.q, mode: "insensitive" } } }] } : {}),
    };
    const [filas, total, pendientes] = await Promise.all([
      prisma.recomendacion.findMany({ where, include: incluir, orderBy: { id: "desc" }, ...paginar(f) }),
      prisma.recomendacion.count({ where }),
      prisma.recomendacion.count({ where: { estado: "PENDIENTE" } }),
    ]);
    // Dentro de la pagina, primero las pendientes y las de mayor prioridad.
    filas.sort((a, b) => Number(b.estado === "PENDIENTE") - Number(a.estado === "PENDIENTE") || ORDEN_PRIORIDAD[a.prioridad] - ORDEN_PRIORIDAD[b.prioridad] || b.id - a.id);
    return { ...pagina(filas.map(salida), total, f), pendientes };
  },

  async obtener(id: number) {
    const r = await prisma.recomendacion.findUnique({ where: { id }, include: incluir });
    if (!r) throw errores.noEncontrado("La recomendación");
    return salida(r);
  },

  async aceptar(id: number, entrada: unknown, ctx: Contexto) {
    const d = esquemaAceptarRecomendacion.parse(entrada);
    return decidir(id, "ACEPTADA", d.comentario ?? null, ctx);
  },

  async descartar(id: number, entrada: unknown, ctx: Contexto) {
    const d = esquemaDescartarRecomendacion.parse(entrada);
    return decidir(id, "DESCARTADA", d.comentario, ctx);
  },
};
