// ============================================================
// CeibaERP - Agentes de IA (docs/04-REQ RF-36 a RF-41; docs/07-IAG secciones 5 a 7)
// Agente 1 (inventario): el codigo calcula los candidatos; el modelo confirma,
// excluye o sube prioridades y explica los criterios; el codigo crea las ordenes
// en BORRADOR con sus propias cantidades (RN-09).
// Agente 2 (comercial): hallazgos que citan KPI y recomendaciones PENDIENTES,
// filtradas por la regla de coherencia con la salida del Agente 1 (RN-18).
// Informe ejecutivo: encadena ambos y redacta un resumen consolidado.
// ============================================================
import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/server/db";
import { ErrorApi, errores } from "@/server/errores";
import { z } from "@/lib/zod";
import { esquemaListado } from "@/lib/esquemas/comunes";
import { esquemaPeriodo, periodoPorDefecto, type Periodo } from "@/lib/esquemas/kpi";
import {
  AGENTES, ESTADOS_EJECUCION, ETIQUETA_AGENTE, esquemaEntradaComercial, esquemaEntradaInforme, esquemaEntradaInventario,
  esquemaSalidaComercial, esquemaSalidaInventario, type Agente, type SalidaComercial,
} from "@/lib/esquemas/agentes";
import {
  aplicarCoherencia, aplicarDecisiones, agruparOrdenes, calcularCandidatos, DIAS_SEGURIDAD, ETIQUETA_MOTIVO, extraerJson,
  observacionesOrden, type Candidato, type Decision, type ProductoEnRiesgo, type RecomendacionResuelta,
} from "@/lib/agentes";
import { formatoKpi, IDS_KPI, type IdKpi } from "@/lib/kpi";
import { formatoDia } from "@/lib/formato";
import { hoyBogota, sumarDias } from "@/lib/fechas";
import { obtenerModelo, type Content, type ModeloIA } from "@/server/ia/modelo";
import { conversarConHerramientas } from "@/server/ia/orquestador";
import {
  INSTRUCCION_INFORME, INSTRUCCION_SALIDA_JSON, instruccionesAgenteComercial, instruccionesAgenteInventario,
} from "@/server/ia/instrucciones";
import {
  herramientasAgenteComercial, herramientasAgenteInventario, type ResultadoInventario,
} from "@/server/ia/herramientas-agentes";
import type { LlamadaRegistrada } from "@/server/ia/herramientas";
import { consultarKpis, datosReposicion, productosEnRiesgo } from "./kpi";
import { crearOrdenBorrador } from "./compras";
import { aNumero, auditar, pagina, paginar, type Contexto } from "./comun";

/** Los agentes razonan mas que el chatbot y sus respuestas son mas largas. */
const TIEMPO_LIMITE_AGENTE_MS = 90_000;
/** Una ejecucion EN_CURSO mas antigua que esto se considera interrumpida. */
const MINUTOS_INTERRUMPIDA = 10;
/** El Agente 2 usa por defecto la ultima ejecucion completada del Agente 1 de las ultimas 24 horas. */
const HORAS_ENTRADA_RECIENTE = 24;

type OpcionesEjecucion = { modelo?: ModeloIA; padreId?: number | null };

const json = (v: unknown) => v as Prisma.InputJsonValue;
const mensajeError = (e: unknown) => (e instanceof ErrorApi ? e.message : "Error interno durante la ejecución del agente.");
const normalizar = (s: string) => s.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase().trim();

// ------------------------------------------------------------
// Registro de ejecuciones (memoria compartida y trazable, docs/07-IAG seccion 7)
// ------------------------------------------------------------

async function evitarSimultanea(agente: Agente) {
  const limite = new Date(Date.now() - MINUTOS_INTERRUMPIDA * 60_000);
  await prisma.ejecucionAgente.updateMany({
    where: { agente, estado: "EN_CURSO", fechaInicio: { lt: limite } },
    data: { estado: "FALLIDA", error: `Ejecución interrumpida: no terminó en ${MINUTOS_INTERRUMPIDA} minutos.`, fechaFin: new Date() },
  });
  const activa = await prisma.ejecucionAgente.findFirst({ where: { agente, estado: "EN_CURSO" }, select: { id: true } });
  if (activa) {
    throw new ErrorApi(409, "EJECUCION_EN_CURSO", `Ya hay una ejecución del ${ETIQUETA_AGENTE[agente].toLowerCase()} en curso (#${activa.id}). Espere a que termine.`);
  }
}

async function iniciar(agente: Agente, parametros: Record<string, unknown>, ctx: Contexto, extra: { padreId?: number | null; entradaId?: number | null } = {}) {
  return prisma.ejecucionAgente.create({
    data: {
      agente, estado: "EN_CURSO", parametros: json(parametros), ejecutadoPorId: ctx.sesion.usuarioId,
      ejecucionPadreId: extra.padreId ?? null, ejecucionEntradaId: extra.entradaId ?? null,
    },
    select: { id: true },
  });
}

async function terminar(
  id: number, inicio: number, ctx: Contexto, agente: Agente,
  datos: { estado: "COMPLETADA" | "FALLIDA"; resultado: unknown; resumen?: string | null; modelo?: string | null; herramientas?: LlamadaRegistrada[]; error?: string | null },
  detalleAuditoria: Record<string, unknown> = {},
) {
  const duracionMs = Date.now() - inicio;
  await prisma.ejecucionAgente.update({
    where: { id },
    data: {
      estado: datos.estado, resultado: json(datos.resultado), resumen: datos.resumen ?? null, modelo: datos.modelo ?? null,
      herramientasUsadas: json(datos.herramientas ?? []), error: datos.error ?? null, duracionMs, fechaFin: new Date(),
    },
  });
  await auditar(ctx, datos.estado === "COMPLETADA" ? "AGENTE_EJECUTADO" : "AGENTE_FALLIDO", "ejecucion_agente", id, json({
    agente, estado: datos.estado, duracionMs, ...(datos.modelo ? { modelo: datos.modelo } : {}), ...(datos.error ? { error: datos.error } : {}), ...detalleAuditoria,
  }));
}

/** JSON Schema para Gemini a partir del esquema Zod, sin palabras clave que el modelo no necesita. */
function esquemaParaModelo(esquema: z.ZodType): unknown {
  const limpiar = (v: unknown): unknown => {
    if (Array.isArray(v)) return v.map(limpiar);
    if (v && typeof v === "object") {
      return Object.fromEntries(Object.entries(v)
        .filter(([k]) => !["$schema", "additionalProperties", "minLength", "maxLength"].includes(k))
        .map(([k, x]) => [k, limpiar(x)]));
    }
    return v;
  };
  return limpiar(z.toJSONSchema(esquema, { io: "input" }));
}

/** Llamada final sin herramientas que devuelve JSON; el servidor lo valida con Zod antes de usarlo. */
async function salidaEstructurada<T>(ia: ModeloIA, sistema: string, texto: string, esquema: z.ZodType<T>): Promise<{ datos: T; modelo: string }> {
  const r = await ia.generar({
    sistema, contenidos: [{ role: "user", parts: [{ text: texto }] }], herramientas: [], nivel: "bajo",
    esquemaRespuesta: esquemaParaModelo(esquema), tiempoLimiteMs: TIEMPO_LIMITE_AGENTE_MS,
  });
  let crudo: unknown;
  try {
    crudo = extraerJson(r.texto);
  } catch {
    throw new ErrorApi(502, "IA_SALIDA_INVALIDA", "La IA devolvió una respuesta que no es JSON válido.");
  }
  const v = esquema.safeParse(crudo);
  if (!v.success) {
    const detalle = v.error.issues.slice(0, 3).map((i) => `${i.path.join(".")}: ${i.message}`).join("; ");
    throw new ErrorApi(502, "IA_SALIDA_INVALIDA", `La salida de la IA no cumple el formato esperado (${detalle}).`);
  }
  return { datos: v.data, modelo: r.modelo ?? ia.nombre };
}

async function sucursalDeEntrada(sucursalId: number | null | undefined) {
  if (!sucursalId) return null;
  const s = await prisma.sucursal.findUnique({ where: { id: sucursalId }, select: { id: true, nombre: true, activa: true } });
  if (!s || !s.activa) throw new ErrorApi(400, "DATOS_INVALIDOS", "Los datos enviados no son válidos.", [{ campo: "sucursalId", mensaje: "La sucursal no existe o está inactiva." }]);
  return s;
}

function periodoDeEntrada(d: { desde?: string; hasta?: string }): Periodo {
  const defecto = periodoPorDefecto();
  return esquemaPeriodo.parse({ desde: d.desde ?? defecto.desde, hasta: d.hasta ?? (d.desde ? hoyBogota() : defecto.hasta) });
}

// ------------------------------------------------------------
// Agente 1 - Analista de inventario
// ------------------------------------------------------------

function salidaDecision(d: Decision): ResultadoInventario["decisiones"][number] {
  return {
    candidatoId: d.candidatoId, productoId: d.productoId, sucursalId: d.sucursalId, sku: d.sku, producto: d.producto,
    sucursal: d.sucursal, proveedor: d.proveedor, cantidad: d.cantidadSugerida, prioridad: d.prioridad,
    prioridadBase: d.prioridadBase, incluir: d.incluir, motivo: ETIQUETA_MOTIVO[d.motivo], coberturaDias: d.coberturaDias,
    justificacion: d.justificacion, ajustadaPorIA: d.ajustadaPorIA,
  };
}

function textoParaJsonInventario(candidatos: Candidato[], analisis: string): string {
  const lista = candidatos
    .map((c) => `- ${c.candidatoId} · ${c.producto} · ${c.sucursal} · ${c.proveedor} · prioridad base ${c.prioridadBase} · ${ETIQUETA_MOTIVO[c.motivo]}`)
    .join("\n");
  return `${INSTRUCCION_SALIDA_JSON}

En "items" incluye solo los candidatos que se excluyen (incluir=false) o cuya prioridad sube; los demás se
incluyen automáticamente con su prioridad base. Usa los candidatoId exactamente como aparecen.

Candidatos calculados por el sistema:
${lista}

Análisis del agente:
${analisis || "(El agente no redactó un análisis; resume los candidatos sin excluir ninguno.)"}`;
}

async function ejecutarInventario(entrada: unknown, ctx: Contexto, opciones: OpcionesEjecucion = {}) {
  const datos = esquemaEntradaInventario.parse(entrada ?? {});
  const sucursal = await sucursalDeEntrada(datos.sucursalId);
  await evitarSimultanea("INVENTARIO");
  const alcance = sucursal?.nombre ?? "Todas las sucursales";
  const ej = await iniciar("INVENTARIO", { sucursalId: sucursal?.id ?? null, sucursal: alcance, diasSeguridad: DIAS_SEGURIDAD }, ctx, { padreId: opciones.padreId });
  const inicio = Date.now();
  let candidatos: Candidato[] = [];

  try {
    candidatos = calcularCandidatos(await datosReposicion(sucursal?.id ?? null), DIAS_SEGURIDAD);

    // Sin candidatos no hace falta gastar cuota del modelo.
    if (candidatos.length === 0) {
      const resultado: ResultadoInventario = {
        alcance, diasSeguridad: DIAS_SEGURIDAD, resumen: `No hay productos que requieran reposición en ${alcance}.`,
        criterios: ["Ningún producto está bajo el mínimo ni con cobertura menor al tiempo de entrega más los días de seguridad."],
        decisiones: [], ignorados: [], ordenes: [], ordenesFallidas: [], alertas: [],
      };
      await terminar(ej.id, inicio, ctx, "INVENTARIO", { estado: "COMPLETADA", resultado, resumen: resultado.resumen }, { ordenes: 0 });
      return servicioAgentes.obtener(ej.id);
    }

    const ia = opciones.modelo ?? obtenerModelo();
    const altas = candidatos.filter((c) => c.prioridadBase === "ALTA").length;
    const pregunta: Content = {
      role: "user",
      parts: [{ text: `Revisa la propuesta de reposición para ${alcance}: el sistema calculó ${candidatos.length} candidatos (${altas} de prioridad base alta). Explica los criterios y señala exclusiones, cambios de prioridad y alertas.` }],
    };
    const conv = await conversarConHerramientas({
      modelo: ia, sistema: instruccionesAgenteInventario({ alcance, diasSeguridad: DIAS_SEGURIDAD }), contenidos: [pregunta],
      herramientas: herramientasAgenteInventario(candidatos, alcance, DIAS_SEGURIDAD), ctx, nivel: "medio",
      tiempoLimiteMs: TIEMPO_LIMITE_AGENTE_MS,
    });
    const salida = await salidaEstructurada(ia, instruccionesAgenteInventario({ alcance, diasSeguridad: DIAS_SEGURIDAD }),
      textoParaJsonInventario(candidatos, conv.texto), esquemaSalidaInventario);

    // A partir de aqui decide el codigo (docs/07-IAG 5.4).
    const { decisiones, ignorados } = aplicarDecisiones(candidatos, salida.datos.items);
    const hoy = hoyBogota();
    const ordenes: ResultadoInventario["ordenes"] = [];
    const ordenesFallidas: ResultadoInventario["ordenesFallidas"] = [];
    for (const g of agruparOrdenes(decisiones)) {
      try {
        const id = await crearOrdenBorrador(
          {
            proveedorId: g.proveedorId, fechaEsperada: sumarDias(hoy, g.tiempoEntregaDias), observaciones: observacionesOrden(g, ej.id),
            items: g.items.map((i) => ({ productoId: i.productoId, cantidad: i.cantidadSugerida })),
          },
          { sucursalId: g.sucursalId, origen: "AGENTE_INVENTARIO", ejecucionAgenteId: ej.id },
          ctx,
        );
        const total = g.items.reduce((a, i) => a + Math.round(i.costo * i.cantidadSugerida * 100), 0) / 100;
        ordenes.push({ id, proveedor: g.proveedor, sucursal: g.sucursal, items: g.items.length, total, prioridad: g.prioridad });
      } catch (e) {
        ordenesFallidas.push({ proveedor: g.proveedor, sucursal: g.sucursal, error: mensajeError(e) });
      }
    }

    const alertas = salida.datos.alertas.length
      ? await prisma.recomendacion.createManyAndReturn({
          data: salida.datos.alertas.map((a) => ({
            ejecucionId: ej.id, tipo: "OTRA" as const, prioridad: "MEDIA" as const, titulo: a.titulo,
            justificacion: a.proveedor ? `Proveedor: ${a.proveedor.replace(/\.+$/, "")}. ${a.justificacion}` : a.justificacion,
          })),
          select: { id: true, titulo: true },
        })
      : [];

    const resultado: ResultadoInventario = {
      alcance, diasSeguridad: DIAS_SEGURIDAD, resumen: salida.datos.resumen, criterios: salida.datos.criterios,
      decisiones: decisiones.map(salidaDecision), ignorados, ordenes, ordenesFallidas, alertas,
    };
    await terminar(ej.id, inicio, ctx, "INVENTARIO", {
      estado: "COMPLETADA", resultado, resumen: salida.datos.resumen, modelo: salida.modelo, herramientas: conv.llamadas,
    }, { candidatos: candidatos.length, ordenes: ordenes.length, alertas: alertas.length });
  } catch (e) {
    // Si la IA falla se muestran los candidatos "sin análisis de IA" y no se crean ordenes (docs/07-IAG 5.4).
    if (!(e instanceof ErrorApi)) console.error("[agentes] Agente 1:", e);
    const base = aplicarDecisiones(candidatos, []).decisiones.map(salidaDecision);
    await terminar(ej.id, inicio, ctx, "INVENTARIO", {
      estado: "FALLIDA", error: mensajeError(e), resultado: { sinAnalisisIA: true, alcance, diasSeguridad: DIAS_SEGURIDAD, decisiones: base },
    });
  }
  return servicioAgentes.obtener(ej.id);
}

// ------------------------------------------------------------
// Agente 2 - Analista comercial
// ------------------------------------------------------------

export type ResultadoComercial = {
  periodo: Periodo;
  alcance: string;
  ejecucionInventarioId: number | null;
  resumen: string;
  hallazgos: (SalidaComercial["hallazgos"][number] & { valorSistema: string | null })[];
  recomendaciones: { id: number; tipo: string; prioridad: string; titulo: string; sku: string | null; sucursal: string | null }[];
  descartadas: { tipo: string; titulo: string; sku: string | null; sucursal: string | null; motivo: string }[];
};

async function entradaInventario(id: number | null | undefined) {
  if (id) {
    const e = await prisma.ejecucionAgente.findUnique({ where: { id }, select: { id: true, agente: true, estado: true, resultado: true } });
    if (!e || e.agente !== "INVENTARIO" || e.estado !== "COMPLETADA") {
      throw new ErrorApi(400, "DATOS_INVALIDOS", "Los datos enviados no son válidos.", [{ campo: "ejecucionInventarioId", mensaje: "Debe ser una ejecución completada del analista de inventario." }]);
    }
    return e;
  }
  return prisma.ejecucionAgente.findFirst({
    where: { agente: "INVENTARIO", estado: "COMPLETADA", fechaFin: { gte: new Date(Date.now() - HORAS_ENTRADA_RECIENTE * 3_600_000) } },
    select: { id: true, agente: true, estado: true, resultado: true },
    orderBy: { fechaFin: "desc" },
  });
}

/** Resuelve SKU y nombre de sucursal a ids; descarta lo que no existe o sale del alcance. */
async function resolverRecomendaciones(recs: SalidaComercial["recomendaciones"], sucursalAlcance: { id: number; nombre: string } | null) {
  const skus = [...new Set(recs.map((r) => r.sku).filter((s): s is string => !!s))];
  const [productos, sucursales] = await Promise.all([
    skus.length ? prisma.producto.findMany({ where: { sku: { in: skus } }, select: { id: true, sku: true } }) : [],
    prisma.sucursal.findMany({ where: { activa: true }, select: { id: true, nombre: true, codigo: true } }),
  ]);
  const porSku = new Map(productos.map((p) => [p.sku.toUpperCase(), p.id]));
  const resueltas: (RecomendacionResuelta & { sku: string | null; sucursal: string | null })[] = [];
  const descartadas: ResultadoComercial["descartadas"] = [];
  for (const r of recs) {
    const sku = r.sku?.trim() || null;
    const nombreSucursal = r.sucursal?.trim() || null;
    const base = { tipo: r.tipo, titulo: r.titulo, sku, sucursal: nombreSucursal };
    const productoId = sku ? porSku.get(sku.toUpperCase()) ?? null : null;
    if (sku && productoId === null) { descartadas.push({ ...base, motivo: `El producto con SKU ${sku} no existe.` }); continue; }
    let sucursalId: number | null = null;
    if (nombreSucursal) {
      const t = normalizar(nombreSucursal);
      const s = sucursales.find((x) => normalizar(x.nombre) === t || normalizar(x.codigo) === t) ?? sucursales.find((x) => normalizar(x.nombre).includes(t));
      if (!s) { descartadas.push({ ...base, motivo: `La sucursal "${nombreSucursal}" no existe.` }); continue; }
      sucursalId = s.id;
    }
    if (sucursalAlcance && sucursalId !== null && sucursalId !== sucursalAlcance.id) {
      descartadas.push({ ...base, motivo: `Fuera del alcance de la ejecución (${sucursalAlcance.nombre}).` });
      continue;
    }
    resueltas.push({
      tipo: r.tipo, prioridad: r.prioridad, productoId, sucursalId: sucursalId ?? sucursalAlcance?.id ?? null,
      titulo: r.titulo, justificacion: r.justificacion, sku, sucursal: nombreSucursal ?? sucursalAlcance?.nombre ?? null,
    });
  }
  return { resueltas, descartadas };
}

function textoParaJsonComercial(analisis: string): string {
  return `${INSTRUCCION_SALIDA_JSON}

Cada hallazgo debe citar en "kpiRelacionado" un KPI (KPI-01 a KPI-08) o gráfico (G-01 a G-04) y en "valor" la cifra
exacta del análisis. En las recomendaciones de producto indica el SKU; en las de sucursal, su nombre.

Análisis del agente:
${analisis || "(El agente no redactó un análisis.)"}`;
}

async function ejecutarComercial(entrada: unknown, ctx: Contexto, opciones: OpcionesEjecucion = {}) {
  const datos = esquemaEntradaComercial.parse(entrada ?? {});
  const periodo = periodoDeEntrada(datos);
  const sucursal = await sucursalDeEntrada(datos.sucursalId);
  const a1 = await entradaInventario(datos.ejecucionInventarioId);
  await evitarSimultanea("COMERCIAL");
  const alcance = sucursal?.nombre ?? "Todas las sucursales";
  const ej = await iniciar("COMERCIAL", { ...periodo, sucursalId: sucursal?.id ?? null, sucursal: alcance, ejecucionInventarioId: a1?.id ?? null }, ctx, {
    padreId: opciones.padreId, entradaId: a1?.id ?? null,
  });
  const inicio = Date.now();

  try {
    const ia = opciones.modelo ?? obtenerModelo();
    const sistema = instruccionesAgenteComercial({ periodo, alcance, ejecucionInventarioId: a1?.id ?? null });
    const pregunta: Content = {
      role: "user",
      parts: [{ text: `Analiza el desempeño comercial de ${alcance} entre el ${formatoDia(periodo.desde)} y el ${formatoDia(periodo.hasta)}, identifica tendencias y propone acciones comerciales.` }],
    };
    const conv = await conversarConHerramientas({
      modelo: ia, sistema, contenidos: [pregunta], herramientas: herramientasAgenteComercial(a1?.id ?? null), ctx,
      nivel: "medio", tiempoLimiteMs: TIEMPO_LIMITE_AGENTE_MS,
    });
    const salida = await salidaEstructurada(ia, sistema, textoParaJsonComercial(conv.texto), esquemaSalidaComercial);

    // Regla de coherencia (docs/07-IAG 6.4): productos en riesgo segun el Agente 1 o, si no hay, segun el sistema.
    const enRiesgo: ProductoEnRiesgo[] = a1?.resultado
      ? (a1.resultado as unknown as ResultadoInventario).decisiones.map((d) => ({ productoId: d.productoId, sucursalId: d.sucursalId }))
      : (await productosEnRiesgo({ sucursalId: null, categoriaId: null })).map((p) => ({ productoId: p.productoId, sucursalId: p.sucursalId }));
    const { resueltas, descartadas: noResueltas } = await resolverRecomendaciones(salida.datos.recomendaciones, sucursal);
    const { validas, descartadas } = aplicarCoherencia(resueltas, enRiesgo);

    // Valor actual de cada KPI citado, calculado por el servicio, para contrastar en pantalla.
    const kpis = await consultarKpis({ ...periodo, sucursalId: sucursal?.id ?? null, categoriaId: null });
    const hallazgos = salida.datos.hallazgos.map((h) => ({
      ...h,
      valorSistema: (IDS_KPI as readonly string[]).includes(h.kpiRelacionado) ? formatoKpi(h.kpiRelacionado as IdKpi, kpis.kpis[h.kpiRelacionado as IdKpi].valor) : null,
    }));

    const creadas = validas.length
      ? await prisma.recomendacion.createManyAndReturn({
          data: validas.map((r) => ({
            ejecucionId: ej.id, tipo: r.tipo, prioridad: r.prioridad, productoId: r.productoId, sucursalId: r.sucursalId,
            titulo: r.titulo, justificacion: r.justificacion,
          })),
          select: { id: true, tipo: true, prioridad: true, titulo: true },
        })
      : [];
    // Los ids crecen en el orden de insercion: asi cada fila se empareja con su recomendacion.
    creadas.sort((a, b) => a.id - b.id);

    const resultado: ResultadoComercial = {
      periodo, alcance, ejecucionInventarioId: a1?.id ?? null, resumen: salida.datos.resumen, hallazgos,
      recomendaciones: creadas.map((c, i) => ({ ...c, sku: validas[i].sku, sucursal: validas[i].sucursal })),
      descartadas: [
        ...noResueltas,
        ...descartadas.map((d) => ({ tipo: d.recomendacion.tipo, titulo: d.recomendacion.titulo, sku: d.recomendacion.sku, sucursal: d.recomendacion.sucursal, motivo: d.motivo })),
      ],
    };
    await terminar(ej.id, inicio, ctx, "COMERCIAL", {
      estado: "COMPLETADA", resultado, resumen: salida.datos.resumen, modelo: salida.modelo, herramientas: conv.llamadas,
    }, { hallazgos: hallazgos.length, recomendaciones: creadas.length, descartadas: resultado.descartadas.length, ejecucionInventarioId: a1?.id ?? null });
  } catch (e) {
    if (!(e instanceof ErrorApi)) console.error("[agentes] Agente 2:", e);
    await terminar(ej.id, inicio, ctx, "COMERCIAL", {
      estado: "FALLIDA", error: mensajeError(e), resultado: { periodo, alcance, ejecucionInventarioId: a1?.id ?? null },
    });
  }
  return servicioAgentes.obtener(ej.id);
}

// ------------------------------------------------------------
// Informe ejecutivo (docs/07-IAG seccion 7)
// ------------------------------------------------------------

export function resumenPlantilla(a1: { resumen: string | null; ordenes: number }, a2: { resumen: string | null; recomendaciones: number } | null): string {
  const partes = [
    `Inventario: ${a1.resumen ?? "sin resumen"}`,
    `Se crearon ${a1.ordenes} órdenes de compra en borrador que esperan la aprobación del gerente.`,
    a2 ? `Comercial: ${a2.resumen ?? "sin resumen"}` : "El análisis comercial no se completó.",
    a2 ? `Quedan ${a2.recomendaciones} recomendaciones pendientes de decisión.` : "",
  ];
  return partes.filter(Boolean).join(" ");
}

async function ejecutarInforme(entrada: unknown, ctx: Contexto, opciones: OpcionesEjecucion = {}) {
  const datos = esquemaEntradaInforme.parse(entrada ?? {});
  const periodo = periodoDeEntrada(datos);
  const sucursal = await sucursalDeEntrada(datos.sucursalId);
  await evitarSimultanea("INFORME_EJECUTIVO");
  const alcance = sucursal?.nombre ?? "Todas las sucursales";
  const padre = await iniciar("INFORME_EJECUTIVO", { ...periodo, sucursalId: sucursal?.id ?? null, sucursal: alcance }, ctx);
  const inicio = Date.now();

  const a1 = await ejecutarInventario({ sucursalId: sucursal?.id ?? null }, ctx, { modelo: opciones.modelo, padreId: padre.id });
  const r1 = a1.resultado as unknown as ResultadoInventario | null;
  if (a1.estado !== "COMPLETADA" || !r1) {
    await terminar(padre.id, inicio, ctx, "INFORME_EJECUTIVO", {
      estado: "FALLIDA", error: `El analista de inventario no se completó (#${a1.id}): ${a1.error ?? "sin detalle"}`,
      resultado: { inventarioId: a1.id, comercialId: null },
    });
    return servicioAgentes.obtener(padre.id);
  }

  const a2 = await ejecutarComercial({ ...periodo, sucursalId: sucursal?.id ?? null, ejecucionInventarioId: a1.id }, ctx, { modelo: opciones.modelo, padreId: padre.id });
  const r2 = a2.estado === "COMPLETADA" ? (a2.resultado as unknown as ResultadoComercial | null) : null;
  const plantilla = resumenPlantilla(
    { resumen: a1.resumen, ordenes: r1.ordenes.length },
    r2 ? { resumen: a2.resumen, recomendaciones: r2.recomendaciones.length } : null,
  );

  const resultadoBase = {
    periodo, alcance, inventarioId: a1.id, comercialId: a2.id,
    ordenes: r1.ordenes.length, alertas: r1.alertas.length,
    recomendaciones: r2?.recomendaciones.length ?? 0, descartadas: r2?.descartadas.length ?? 0,
  };
  if (!r2) {
    await terminar(padre.id, inicio, ctx, "INFORME_EJECUTIVO", {
      estado: "FALLIDA", error: `El analista comercial no se completó (#${a2.id}): ${a2.error ?? "sin detalle"}`,
      resumen: plantilla, resultado: { ...resultadoBase, resumenGenerado: "plantilla" },
    });
    return servicioAgentes.obtener(padre.id);
  }

  // Resumen consolidado con el modelo; si falla, plantilla determinista.
  let resumen = plantilla;
  let modelo: string | null = null;
  let generado: "IA" | "plantilla" = "plantilla";
  try {
    const ia = opciones.modelo ?? obtenerModelo();
    const texto = `Resultado del Agente 1 (${alcance}): ${a1.resumen}
Órdenes en borrador creadas: ${r1.ordenes.length} (${r1.ordenes.filter((o) => o.prioridad === "ALTA").length} de prioridad alta). Alertas: ${r1.alertas.map((a) => a.titulo).join("; ") || "ninguna"}.
Resultado del Agente 2 (${formatoDia(periodo.desde)} a ${formatoDia(periodo.hasta)}): ${a2.resumen}
Hallazgos: ${r2.hallazgos.map((h) => `${h.titulo} (${h.kpiRelacionado}: ${h.valor})`).join("; ")}.
Recomendaciones pendientes: ${r2.recomendaciones.length}; descartadas por reglas: ${r2.descartadas.length}.`;
    const r = await ia.generar({ sistema: INSTRUCCION_INFORME, contenidos: [{ role: "user", parts: [{ text: texto }] }], herramientas: [], nivel: "bajo", tiempoLimiteMs: TIEMPO_LIMITE_AGENTE_MS });
    if (r.texto.trim()) {
      resumen = r.texto.trim().slice(0, 2000);
      modelo = r.modelo ?? ia.nombre;
      generado = "IA";
    }
  } catch {
    // Se conserva la plantilla.
  }
  await terminar(padre.id, inicio, ctx, "INFORME_EJECUTIVO", {
    estado: "COMPLETADA", resumen, modelo, resultado: { ...resultadoBase, resumenGenerado: generado },
  }, { inventarioId: a1.id, comercialId: a2.id });
  return servicioAgentes.obtener(padre.id);
}

// ------------------------------------------------------------
// Consulta (RF-41)
// ------------------------------------------------------------

const sinFiltro = (v: unknown) => (v === "" || v === "todos" ? undefined : v);
const esquemaFiltrosEjecuciones = esquemaListado.extend({
  agente: z.preprocess(sinFiltro, z.enum(AGENTES).optional()),
  estado: z.preprocess(sinFiltro, z.enum(ESTADOS_EJECUCION).optional()),
});

function iso(d: Date | null) {
  return d ? d.toISOString() : null;
}

export const servicioAgentes = {
  ejecutarInventario,
  ejecutarComercial,
  ejecutarInforme,

  async listar(params: URLSearchParams) {
    const f = esquemaFiltrosEjecuciones.parse(Object.fromEntries(params));
    const where: Prisma.EjecucionAgenteWhereInput = { agente: f.agente, estado: f.estado };
    const [filas, total] = await Promise.all([
      prisma.ejecucionAgente.findMany({
        where, orderBy: { id: "desc" }, ...paginar(f),
        select: {
          id: true, agente: true, estado: true, resumen: true, modelo: true, duracionMs: true, error: true, fechaInicio: true, fechaFin: true,
          parametros: true, ejecucionPadreId: true, ejecucionEntradaId: true, ejecutadoPor: { select: { nombre: true } },
          _count: { select: { ordenes: true, recomendaciones: true } },
        },
      }),
      prisma.ejecucionAgente.count({ where }),
    ]);
    return pagina(filas.map(({ _count, fechaInicio, fechaFin, ...e }) => ({
      ...e, fechaInicio: iso(fechaInicio), fechaFin: iso(fechaFin), ordenes: _count.ordenes, recomendaciones: _count.recomendaciones,
    })), total, f);
  },

  async obtener(id: number) {
    const e = await prisma.ejecucionAgente.findUnique({
      where: { id },
      include: {
        ejecutadoPor: { select: { nombre: true } },
        ejecucionPadre: { select: { id: true, agente: true } },
        ejecucionEntrada: { select: { id: true, agente: true, estado: true, fechaFin: true } },
        hijas: { select: { id: true, agente: true, estado: true, resumen: true, modelo: true, duracionMs: true, error: true }, orderBy: { id: "asc" } },
        ordenes: {
          select: { id: true, estado: true, total: true, fechaEsperada: true, proveedor: { select: { nombre: true } }, sucursal: { select: { nombre: true } }, _count: { select: { detalles: true } } },
          orderBy: { id: "asc" },
        },
        recomendaciones: {
          include: { producto: { select: { sku: true, nombre: true } }, sucursal: { select: { nombre: true } }, decididaPor: { select: { nombre: true } } },
          orderBy: { id: "asc" },
        },
      },
    });
    if (!e) throw errores.noEncontrado("La ejecución");
    return {
      id: e.id, agente: e.agente, estado: e.estado, parametros: e.parametros, herramientasUsadas: e.herramientasUsadas,
      resultado: e.resultado, resumen: e.resumen, modelo: e.modelo, duracionMs: e.duracionMs, error: e.error,
      fechaInicio: iso(e.fechaInicio), fechaFin: iso(e.fechaFin), ejecutadoPor: e.ejecutadoPor.nombre,
      ejecucionPadre: e.ejecucionPadre, ejecucionEntrada: e.ejecucionEntrada ? { ...e.ejecucionEntrada, fechaFin: iso(e.ejecucionEntrada.fechaFin) } : null,
      hijas: e.hijas,
      ordenes: e.ordenes.map((o) => ({
        id: o.id, estado: o.estado, total: aNumero(o.total), fechaEsperada: o.fechaEsperada.toISOString().slice(0, 10),
        proveedor: o.proveedor.nombre, sucursal: o.sucursal.nombre, items: o._count.detalles,
      })),
      recomendaciones: e.recomendaciones.map(salidaRecomendacion),
    };
  },
};

export function salidaRecomendacion(r: {
  id: number; ejecucionId: number; tipo: string; prioridad: string; titulo: string; justificacion: string; estado: string;
  comentarioDecision: string | null; fechaDecision: Date | null; createdAt: Date;
  producto: { sku: string; nombre: string } | null; sucursal: { nombre: string } | null; decididaPor: { nombre: string } | null;
}) {
  return {
    id: r.id, ejecucionId: r.ejecucionId, tipo: r.tipo, prioridad: r.prioridad, titulo: r.titulo, justificacion: r.justificacion,
    estado: r.estado, comentarioDecision: r.comentarioDecision, fechaDecision: iso(r.fechaDecision), createdAt: iso(r.createdAt),
    producto: r.producto, sucursal: r.sucursal?.nombre ?? null, decididaPor: r.decididaPor?.nombre ?? null,
  };
}
