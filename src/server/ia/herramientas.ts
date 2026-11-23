// ============================================================
// CeibaERP - Registro de herramientas de IA (docs/07-IAG seccion 3)
// Herramientas de SOLO LECTURA sobre los mismos servicios del dashboard.
// El contexto (rol y sucursal) sale de la sesion y se aplica aqui: el modelo
// no puede ampliarlo (RN-05). Cada herramienta valida sus argumentos con Zod
// y limita el tamano de su respuesta.
// ============================================================
import { z } from "@/lib/zod";
import type { Rol } from "@/lib/navegacion";
import { prisma } from "@/server/db";
import { sucursalPermitida } from "@/server/auth/autorizacion";
import { ErrorApi } from "@/server/errores";
import { formatoDia } from "@/lib/formato";
import { esFechaValida, hoyBogota, sumarDias } from "@/lib/fechas";
import { esquemaPeriodo, periodoPorDefecto, type Periodo } from "@/lib/esquemas/kpi";
import { ETIQUETA_ESTADO_ORDEN } from "@/lib/esquemas/compras";
import { estadoInventario } from "@/lib/esquemas/inventario";
import { KPIS, IDS_KPI } from "@/lib/kpi";
import {
  clientesConMasCompras, consultarKpis, cumplimientoProveedores, margenPorCategoria, productosBajaRotacion,
  productosEnRiesgo, tendenciaSemanal, topProductos, ventasPorSucursal, type FiltrosKpi,
} from "@/server/servicios/kpi";
import type { Contexto } from "@/server/servicios/comun";
import type { FunctionDeclaration } from "./modelo";

export type ResultadoHerramienta = { filtros: Record<string, string>; datos: unknown };

export type Herramienta = {
  nombre: string;
  descripcion: string;
  argumentos: z.ZodType<Record<string, unknown>>;
  /** Roles que pueden usarla en el chatbot (docs/07-IAG seccion 3). */
  roles: readonly Rol[];
  ejecutar: (args: Record<string, unknown>, ctx: Contexto) => Promise<ResultadoHerramienta>;
};

// ------------------------------------------------------------
// Argumentos comunes
// ------------------------------------------------------------

const fechaArg = (que: string) =>
  z.string().refine(esFechaValida, { message: "Use el formato AAAA-MM-DD." }).describe(`${que} en formato AAAA-MM-DD (hora de Colombia).`);

const periodoArgs = {
  desde: fechaArg("Primer día del periodo").optional(),
  hasta: fechaArg("Último día del periodo, inclusive").optional(),
};
const sucursalArg = z.string().max(60).describe("Nombre o código de la sucursal (ej. \"Bello\"). Omitir para todas.").optional();
const categoriaArg = z.string().max(60).describe("Nombre de la categoría (ej. \"Bebidas\"). Omitir para todas.").optional();

/** Sin acentos ni mayusculas, para reconocer "envigado", "Envigado" o "SUC-ENV". */
const normalizar = (s: string) => s.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase().trim();

async function buscarPorNombre<T extends { id: number; nombre: string; codigo?: string }>(
  lista: T[], texto: string, que: string,
): Promise<T> {
  const t = normalizar(texto);
  const encontrado = lista.find((x) => normalizar(x.nombre) === t || (x.codigo && normalizar(x.codigo) === t))
    ?? lista.find((x) => normalizar(x.nombre).includes(t));
  if (!encontrado) {
    throw new ErrorApi(400, "ARGUMENTO_INVALIDO", `No existe ${que} "${texto}". Opciones: ${lista.map((x) => x.nombre).join(", ")}.`);
  }
  return encontrado;
}

/** Sucursal a consultar: bodega y cajero siempre la suya, aunque el modelo pida otra (RN-05). */
async function resolverSucursal(texto: unknown, ctx: Contexto): Promise<{ id: number | null; etiqueta: string; nota?: string }> {
  const propia = ctx.sesion.sucursalId;
  if (propia !== null) {
    const nota = typeof texto === "string" && texto && normalizar(texto) !== normalizar(ctx.sesion.sucursalNombre ?? "")
      ? `El usuario solo puede consultar su sucursal (${ctx.sesion.sucursalNombre}); se ignoró la sucursal solicitada "${texto}".`
      : undefined;
    return { id: sucursalPermitida(ctx.sesion, null), etiqueta: ctx.sesion.sucursalNombre ?? "Su sucursal", nota };
  }
  if (typeof texto !== "string" || !texto.trim()) return { id: null, etiqueta: "Todas las sucursales" };
  const sucursales = await prisma.sucursal.findMany({ where: { activa: true }, select: { id: true, nombre: true, codigo: true } });
  const s = await buscarPorNombre(sucursales, texto, "la sucursal");
  return { id: s.id, etiqueta: s.nombre };
}

async function resolverCategoria(texto: unknown): Promise<{ id: number | null; etiqueta: string }> {
  if (typeof texto !== "string" || !texto.trim()) return { id: null, etiqueta: "Todas las categorías" };
  const categorias = await prisma.categoria.findMany({ where: { activa: true }, select: { id: true, nombre: true } });
  const c = await buscarPorNombre(categorias, texto, "la categoría");
  return { id: c.id, etiqueta: c.nombre };
}

function resolverPeriodo(args: Record<string, unknown>, porDefecto: Periodo = periodoPorDefecto()): Periodo {
  const desde = (args.desde as string | undefined) ?? porDefecto.desde;
  const hasta = (args.hasta as string | undefined) ?? (args.desde ? hoyBogota() : porDefecto.hasta);
  const r = esquemaPeriodo.safeParse({ desde, hasta });
  if (!r.success) throw new ErrorApi(400, "ARGUMENTO_INVALIDO", r.error.issues[0].message);
  return r.data;
}

async function filtrosComunes(args: Record<string, unknown>, ctx: Contexto, porDefecto?: Periodo) {
  const periodo = resolverPeriodo(args, porDefecto);
  const [suc, cat] = await Promise.all([resolverSucursal(args.sucursal, ctx), resolverCategoria(args.categoria)]);
  const f: FiltrosKpi = { ...periodo, sucursalId: suc.id, categoriaId: cat.id };
  const filtros: Record<string, string> = {
    periodo: `${formatoDia(periodo.desde)} a ${formatoDia(periodo.hasta)}`,
    sucursal: suc.etiqueta,
    categoria: cat.etiqueta,
    ...(suc.nota ? { nota: suc.nota } : {}),
  };
  return { f, filtros };
}

/** Copia sin las claves indicadas (para no enviar al modelo ids internos). */
function omitir<T extends object, K extends keyof T>(o: T, ...claves: K[]): Omit<T, K> {
  const copia = { ...o };
  for (const k of claves) delete copia[k];
  return copia;
}

/** Ultimas n semanas completas, de lunes a domingo, terminando en el ultimo domingo antes de hoy. */
function semanasCompletas(n: number): Periodo {
  const ayer = sumarDias(hoyBogota(), -1);
  const diaSemana = new Date(`${ayer}T00:00:00Z`).getUTCDay(); // 0 = domingo
  const domingo = sumarDias(ayer, -diaSemana);
  return { desde: sumarDias(domingo, -(7 * n - 1)), hasta: domingo };
}

const TODOS: readonly Rol[] = ["ADMIN", "GERENTE", "BODEGA", "CAJERO"];
const BODEGA_Y_DIRECCION: readonly Rol[] = ["ADMIN", "GERENTE", "BODEGA"];
const DIRECCION: readonly Rol[] = ["ADMIN", "GERENTE"];

// ------------------------------------------------------------
// Herramientas
// ------------------------------------------------------------

export const HERRAMIENTAS: Herramienta[] = [
  {
    nombre: "buscarProducto",
    descripcion: "Busca productos activos por nombre o SKU y devuelve su precio de venta y existencias por sucursal.",
    roles: TODOS,
    argumentos: z.object({ texto: z.string().min(2).max(60).describe("Parte del nombre o del SKU (ej. \"arroz\", \"ABA-001\").") }),
    async ejecutar(args, ctx) {
      const texto = String(args.texto);
      const alcance = sucursalPermitida(ctx.sesion, null);
      const productos = await prisma.producto.findMany({
        where: { activo: true, OR: [{ nombre: { contains: texto, mode: "insensitive" } }, { sku: { contains: texto, mode: "insensitive" } }] },
        select: {
          sku: true, nombre: true, unidad: true, precio: true, categoria: { select: { nombre: true } },
          inventarios: {
            where: alcance === null ? { sucursal: { activa: true } } : { sucursalId: alcance },
            select: { stock: true, stockMinimo: true, stockMaximo: true, sucursal: { select: { nombre: true } } },
            orderBy: { sucursal: { nombre: "asc" } },
          },
        },
        orderBy: { nombre: "asc" },
        take: 10,
      });
      return {
        filtros: { busqueda: texto, sucursal: alcance === null ? "Todas las sucursales" : (ctx.sesion.sucursalNombre ?? "Su sucursal") },
        datos: productos.map((p) => ({
          sku: p.sku, producto: p.nombre, categoria: p.categoria.nombre, unidad: p.unidad, precio: p.precio.toNumber(),
          existencias: p.inventarios.map((i) => ({
            sucursal: i.sucursal.nombre, stock: i.stock, estado: estadoInventario(i.stock, i.stockMinimo, i.stockMaximo),
          })),
        })),
      };
    },
  },
  {
    nombre: "topProductos",
    descripcion: "Productos más vendidos en un periodo, por unidades o por valor vendido (gráfico G-03 del dashboard). Excluye ventas anuladas.",
    roles: TODOS,
    argumentos: z.object({
      ...periodoArgs, sucursal: sucursalArg, categoria: categoriaArg,
      criterio: z.enum(["unidades", "valor"]).describe("Ordenar por unidades vendidas o por valor en pesos.").optional(),
      limite: z.number().int().min(1).max(20).describe("Cantidad de productos (1 a 20, por defecto 10).").optional(),
    }),
    async ejecutar(args, ctx) {
      const { f, filtros } = await filtrosComunes(args, ctx);
      const criterio = (args.criterio as "unidades" | "valor" | undefined) ?? "unidades";
      const datos = await topProductos(f, criterio, (args.limite as number | undefined) ?? 10);
      return { filtros: { ...filtros, criterio }, datos: datos.map((p) => omitir(p, "productoId")) };
    },
  },
  {
    nombre: "productosEnRiesgo",
    descripcion: "Productos en riesgo de agotamiento (situación actual): agotados, bajo el stock mínimo o con cobertura menor al tiempo de entrega del proveedor. Incluye la venta diaria promedio de los últimos 28 días, los días de cobertura y si ya hay una orden de compra abierta.",
    roles: TODOS,
    argumentos: z.object({ sucursal: sucursalArg, categoria: categoriaArg }),
    async ejecutar(args, ctx) {
      const [suc, cat] = await Promise.all([resolverSucursal(args.sucursal, ctx), resolverCategoria(args.categoria)]);
      const lista = await productosEnRiesgo({ sucursalId: suc.id, categoriaId: cat.id });
      const porMotivo = Object.fromEntries(
        ["AGOTADO", "BAJO_MINIMO", "COBERTURA_MENOR_AL_TIEMPO_DE_ENTREGA"].map((m) => [m, lista.filter((x) => x.motivo === m).length]),
      );
      return {
        filtros: { situacion: `Actual (${formatoDia(hoyBogota())})`, sucursal: suc.etiqueta, categoria: cat.etiqueta, ...(suc.nota ? { nota: suc.nota } : {}) },
        datos: {
          total: lista.length, porMotivo, mostrados: Math.min(lista.length, 30),
          productos: lista.slice(0, 30).map((x) => ({
            sku: x.sku, producto: x.producto, sucursal: x.sucursal, stock: x.stock, stockMinimo: x.stockMinimo,
            ventaDiaria: x.ventaDiaria, coberturaDias: x.coberturaDias, proveedor: x.proveedor,
            tiempoEntregaDias: x.tiempoEntregaDias, motivo: x.motivo, ordenAbierta: x.enPedido,
          })),
        },
      };
    },
  },
  {
    nombre: "productosBajaRotacion",
    descripcion: "Productos de baja rotación (KPI-05): con existencias y sin ventas, o con cobertura mayor a 60 días en el periodo; incluye el valor inmovilizado al costo.",
    roles: BODEGA_Y_DIRECCION,
    argumentos: z.object({ ...periodoArgs, sucursal: sucursalArg, categoria: categoriaArg }),
    async ejecutar(args, ctx) {
      const { f, filtros } = await filtrosComunes(args, ctx);
      const lista = await productosBajaRotacion(f);
      return {
        filtros,
        datos: {
          total: lista.length,
          valorInmovilizado: lista.reduce((a, p) => a + p.valorInmovilizado, 0),
          productos: lista.slice(0, 20).map((p) => omitir(p, "productoId")),
        },
      };
    },
  },
  {
    nombre: "ordenesPendientes",
    descripcion: "Órdenes de compra pendientes: en BORRADOR (por aprobar) o APROBADA (esperando la mercancía), con proveedor, sucursal, fecha esperada, si está vencida, total y origen (manual o agente de IA).",
    roles: BODEGA_Y_DIRECCION,
    argumentos: z.object({
      proveedor: z.string().max(80).describe("Nombre del proveedor. Omitir para todos.").optional(),
      sucursal: sucursalArg,
      estado: z.enum(["BORRADOR", "APROBADA"]).describe("Omitir para ambos estados.").optional(),
    }),
    async ejecutar(args, ctx) {
      const suc = await resolverSucursal(args.sucursal, ctx);
      let proveedorId: number | undefined;
      let proveedorEtiqueta = "Todos los proveedores";
      if (typeof args.proveedor === "string" && args.proveedor.trim()) {
        const proveedores = await prisma.proveedor.findMany({ select: { id: true, nombre: true } });
        const p = await buscarPorNombre(proveedores, args.proveedor, "el proveedor");
        proveedorId = p.id;
        proveedorEtiqueta = p.nombre;
      }
      const estado = args.estado as "BORRADOR" | "APROBADA" | undefined;
      const ordenes = await prisma.ordenCompra.findMany({
        where: { estado: estado ? estado : { in: ["BORRADOR", "APROBADA"] }, sucursalId: suc.id ?? undefined, proveedorId },
        select: {
          id: true, estado: true, origen: true, total: true, fechaEsperada: true,
          proveedor: { select: { nombre: true } }, sucursal: { select: { nombre: true } }, _count: { select: { detalles: true } },
        },
        orderBy: [{ fechaEsperada: "asc" }, { id: "asc" }],
      });
      const hoy = hoyBogota();
      const filas = ordenes.map((o) => {
        const esperada = o.fechaEsperada.toISOString().slice(0, 10);
        return {
          orden: o.id, estado: ETIQUETA_ESTADO_ORDEN[o.estado], proveedor: o.proveedor.nombre, sucursal: o.sucursal.nombre,
          fechaEsperada: esperada, vencida: o.estado === "APROBADA" && esperada < hoy, items: o._count.detalles,
          total: o.total.toNumber(), origen: o.origen === "AGENTE_INVENTARIO" ? "Agente de IA" : "Manual",
        };
      });
      const porProveedor = Object.values(filas.reduce<Record<string, { proveedor: string; ordenes: number; total: number }>>((a, o) => {
        a[o.proveedor] ??= { proveedor: o.proveedor, ordenes: 0, total: 0 };
        a[o.proveedor].ordenes++;
        a[o.proveedor].total += o.total;
        return a;
      }, {}));
      return {
        filtros: { sucursal: suc.etiqueta, proveedor: proveedorEtiqueta, estado: estado ? ETIQUETA_ESTADO_ORDEN[estado] : "Borrador y aprobada", ...(suc.nota ? { nota: suc.nota } : {}) },
        datos: { total: filas.length, porProveedor, ordenes: filas.slice(0, 30) },
      };
    },
  },
  {
    nombre: "cumplimientoProveedores",
    descripcion: "Cumplimiento de entregas por proveedor (KPI-06): órdenes que debían llegar en el periodo, a tiempo, tardías, pendientes vencidas, porcentaje y retraso promedio.",
    roles: BODEGA_Y_DIRECCION,
    argumentos: z.object({ ...periodoArgs, sucursal: sucursalArg }),
    async ejecutar(args, ctx) {
      const { f, filtros } = await filtrosComunes({ ...args, categoria: undefined }, ctx);
      const lista = await cumplimientoProveedores(f);
      const debidas = lista.reduce((a, p) => a + p.debidas, 0);
      const aTiempo = lista.reduce((a, p) => a + p.aTiempo, 0);
      return {
        filtros: omitir(filtros, "categoria"),
        datos: {
          cumplimientoTotal: debidas ? Math.round((aTiempo / debidas) * 10000) / 100 : null,
          proveedores: lista.map((p) => omitir(p, "proveedorId", "nit")),
        },
      };
    },
  },
  {
    nombre: "consultarKpis",
    descripcion: "Los ocho KPI del dashboard (ventas totales, ticket promedio, margen bruto, agotamiento, baja rotación, cumplimiento de pedidos, clientes recurrentes y rotación de inventario) con su valor, el del periodo anterior, la variación y el semáforo, más la interpretación automática por reglas.",
    roles: DIRECCION,
    argumentos: z.object({ ...periodoArgs, sucursal: sucursalArg, categoria: categoriaArg }),
    async ejecutar(args, ctx) {
      const { f, filtros } = await filtrosComunes(args, ctx);
      const r = await consultarKpis(f);
      return {
        filtros: { ...filtros, periodoAnterior: `${formatoDia(r.periodoAnterior.desde)} a ${formatoDia(r.periodoAnterior.hasta)}` },
        datos: {
          kpis: IDS_KPI.map((id) => ({
            id, nombre: KPIS[id].nombre, unidad: KPIS[id].unidad, valor: r.kpis[id].valor, anterior: r.kpis[id].anterior,
            variacion: r.kpis[id].variacion, tipoVariacion: KPIS[id].comparacion, semaforo: r.kpis[id].semaforo,
          })),
          extras: r.extras,
          interpretacion: r.interpretacion.map((h) => h.texto),
        },
      };
    },
  },
  {
    nombre: "ventasPorSucursal",
    descripcion: "Ventas, número de ventas, ticket promedio y margen bruto de cada sucursal en un periodo (gráfico G-02).",
    roles: DIRECCION,
    argumentos: z.object({ ...periodoArgs, categoria: categoriaArg }),
    async ejecutar(args, ctx) {
      const { f, filtros } = await filtrosComunes({ ...args, sucursal: undefined }, ctx);
      const lista = await ventasPorSucursal(f);
      return { filtros, datos: lista.map((s) => omitir(s, "sucursalId")) };
    },
  },
  {
    nombre: "tendenciaVentas",
    descripcion: "Ventas semanales (lunes a domingo) por categoría para ver tendencias. Por defecto, las últimas 8 semanas completas.",
    roles: DIRECCION,
    argumentos: z.object({ ...periodoArgs, sucursal: sucursalArg, categoria: categoriaArg }),
    async ejecutar(args, ctx) {
      const { f, filtros } = await filtrosComunes(args, ctx, semanasCompletas(8));
      const filas = await tendenciaSemanal(f);
      // Una semana es parcial si el periodo no la cubre de lunes a domingo.
      return { filtros, datos: filas.map((x) => ({ ...x, semanaParcial: x.semana < f.desde || sumarDias(x.semana, 6) > f.hasta })) };
    },
  },
  {
    nombre: "margenPorCategoria",
    descripcion: "Margen bruto y ventas de cada categoría en un periodo, de menor a mayor margen.",
    roles: DIRECCION,
    argumentos: z.object({ ...periodoArgs, sucursal: sucursalArg }),
    async ejecutar(args, ctx) {
      const { f, filtros } = await filtrosComunes({ ...args, categoria: undefined }, ctx);
      const lista = await margenPorCategoria(f);
      return { filtros: omitir(filtros, "categoria"), datos: lista.map((c) => omitir(c, "categoriaId")) };
    },
  },
  {
    nombre: "clientesRecurrentes",
    descripcion: "Clientes identificados (ficticios) con más compras en el periodo y el número de clientes recurrentes (KPI-07). No incluye datos de contacto.",
    roles: DIRECCION,
    argumentos: z.object({
      ...periodoArgs, sucursal: sucursalArg,
      limite: z.number().int().min(1).max(20).describe("Cantidad de clientes (1 a 20, por defecto 10).").optional(),
    }),
    async ejecutar(args, ctx) {
      const { f, filtros } = await filtrosComunes({ ...args, categoria: undefined }, ctx);
      const [kpis, top] = await Promise.all([consultarKpis(f), clientesConMasCompras(f, (args.limite as number | undefined) ?? 10)]);
      return {
        filtros: omitir(filtros, "categoria"),
        datos: { clientesRecurrentes: kpis.kpis["KPI-07"].valor, clientesIdentificados: kpis.extras.clientesIdentificados, top },
      };
    },
  },
  {
    nombre: "ultimasEjecucionesAgentes",
    descripcion: "Resúmenes de las últimas ejecuciones completadas de los agentes de IA (analista de inventario, analista comercial e informe ejecutivo).",
    roles: DIRECCION,
    argumentos: z.object({
      agente: z.enum(["INVENTARIO", "COMERCIAL", "INFORME_EJECUTIVO"]).describe("Omitir para todos.").optional(),
      limite: z.number().int().min(1).max(5).describe("Cantidad (1 a 5, por defecto 3).").optional(),
    }),
    async ejecutar(args) {
      const agente = args.agente as "INVENTARIO" | "COMERCIAL" | "INFORME_EJECUTIVO" | undefined;
      const lista = await prisma.ejecucionAgente.findMany({
        where: { estado: "COMPLETADA", agente },
        select: { id: true, agente: true, resumen: true, modelo: true, fechaFin: true },
        orderBy: { fechaFin: "desc" },
        take: (args.limite as number | undefined) ?? 3,
      });
      return {
        filtros: { agente: agente ?? "Todos" },
        datos: { total: lista.length, ejecuciones: lista.map((e) => ({ ...e, fechaFin: e.fechaFin?.toISOString() ?? null })) },
      };
    },
  },
];

/** Herramientas que el chatbot ofrece al modelo para el rol de la sesion. */
export function herramientasParaRol(rol: Rol): Herramienta[] {
  return HERRAMIENTAS.filter((h) => h.roles.includes(rol));
}

/** Declaracion para Gemini a partir del esquema Zod (JSON Schema sin metadatos que el modelo no necesita). */
export function declaracion(h: Herramienta): FunctionDeclaration {
  const esquema = z.toJSONSchema(h.argumentos, { io: "input" }) as Record<string, unknown>;
  delete esquema.$schema;
  delete esquema.additionalProperties;
  return { name: h.nombre, description: h.descripcion, parametersJsonSchema: esquema };
}

export type LlamadaRegistrada = {
  herramienta: string;
  argumentos: Record<string, unknown>;
  filtros: Record<string, string> | null;
  ok: boolean;
  error?: string;
  duracionMs: number;
};

const MAX_RESPUESTA = 24_000;

/**
 * Ejecuta una llamada del modelo. Nunca lanza: los errores vuelven al modelo como
 * { error } para que los explique (docs/07-IAG regla 3).
 */
export async function ejecutarHerramienta(
  nombre: string, args: unknown, ctx: Contexto, permitidas: Herramienta[],
): Promise<{ respuesta: Record<string, unknown>; registro: LlamadaRegistrada }> {
  const inicio = Date.now();
  const argumentos = (args && typeof args === "object" ? args : {}) as Record<string, unknown>;
  const fin = (respuesta: Record<string, unknown>, filtros: Record<string, string> | null, error?: string) => ({
    respuesta,
    registro: { herramienta: nombre, argumentos, filtros, ok: !error, ...(error ? { error } : {}), duracionMs: Date.now() - inicio },
  });

  const h = permitidas.find((x) => x.nombre === nombre);
  if (!h) return fin({ error: `La herramienta "${nombre}" no está disponible para este usuario.` }, null, "no permitida");

  const r = h.argumentos.safeParse(argumentos);
  if (!r.success) {
    const error = `Argumentos inválidos: ${r.error.issues.map((i) => `${i.path.join(".") || "argumentos"}: ${i.message}`).join("; ")}`;
    return fin({ error }, null, error);
  }
  try {
    const res = await h.ejecutar(r.data, ctx);
    let texto = JSON.stringify(res.datos);
    if (texto.length > MAX_RESPUESTA) texto = `${texto.slice(0, MAX_RESPUESTA)}…(recortado)`;
    return fin({ filtros: res.filtros, datos: JSON.parse(texto.endsWith("…(recortado)") ? JSON.stringify({ recortado: texto }) : texto) }, res.filtros);
  } catch (e) {
    const error = e instanceof ErrorApi ? e.message : "Error interno al consultar los datos.";
    if (!(e instanceof ErrorApi)) console.error(`[ia] Herramienta ${nombre}:`, e);
    return fin({ error }, null, error);
  }
}
