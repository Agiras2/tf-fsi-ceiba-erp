// ============================================================
// Datos controlados para las pruebas de integracion (esquema "test").
// Cada archivo de pruebas borra el esquema y crea este escenario pequeno,
// con valores elegidos para poder calcular a mano los resultados esperados.
// ============================================================
import type { Rol } from "@/generated/prisma/client";
import { prisma } from "@/server/db";
import type { Contexto } from "@/server/servicios/comun";
import { ErrorApi } from "@/server/errores";
import type { ModeloIA, RespuestaModelo, SolicitudModelo } from "@/server/ia/modelo";

/** Borra todos los datos del esquema de pruebas (mismo orden que el seed). */
export async function limpiar() {
  await prisma.auditoria.deleteMany();
  await prisma.mensajeChat.deleteMany();
  await prisma.conversacion.deleteMany();
  await prisma.recomendacion.deleteMany();
  await prisma.detalleOrdenCompra.deleteMany();
  await prisma.ordenCompra.deleteMany();
  await prisma.ejecucionAgente.updateMany({ data: { ejecucionPadreId: null, ejecucionEntradaId: null } });
  await prisma.ejecucionAgente.deleteMany();
  await prisma.movimientoInventario.deleteMany();
  await prisma.detalleVenta.deleteMany();
  await prisma.venta.deleteMany();
  await prisma.inventario.deleteMany();
  await prisma.cliente.deleteMany();
  await prisma.producto.deleteMany();
  await prisma.proveedor.deleteMany();
  await prisma.categoria.deleteMany();
  await prisma.usuario.deleteMany();
  await prisma.sucursal.deleteMany();
}

function contexto(u: { id: number; nombre: string; rol: Rol; sucursalId: number | null }, sucursalNombre: string | null): Contexto {
  return { sesion: { usuarioId: u.id, nombre: u.nombre, rol: u.rol, sucursalId: u.sucursalId, sucursalNombre }, ip: "127.0.0.1" };
}

/**
 * Escenario base:
 * - Sucursales A (Prueba Norte) y B (Prueba Sur).
 * - Proveedor 1 (entrega en 3 dias): T-001 (costo 1000, precio 1500) y T-002 (2000 / 3000), categoria 1.
 * - Proveedor 2 (entrega en 5 dias): T-003 (500 / 800) y T-004 (4000 / 5000), categoria 2.
 * - Inventario en A: T-001 40, T-002 0, T-003 100, T-004 30. En B: T-001 10.
 */
export async function crearEscenario() {
  const [a, b] = await Promise.all([
    prisma.sucursal.create({ data: { codigo: "TA", nombre: "Prueba Norte", ciudad: "Medellín", direccion: "Calle 1" } }),
    prisma.sucursal.create({ data: { codigo: "TB", nombre: "Prueba Sur", ciudad: "Medellín", direccion: "Calle 2" } }),
  ]);
  const usuario = (email: string, nombre: string, rol: Rol, sucursalId: number | null) =>
    prisma.usuario.create({ data: { email, nombre, rol, sucursalId, passwordHash: "sin-uso-en-pruebas" } });
  const [gerente, cajeroA, cajeroB, bodegaA] = await Promise.all([
    usuario("gerente@prueba.test", "Gerente Prueba", "GERENTE", null),
    usuario("cajero.a@prueba.test", "Cajero A", "CAJERO", a.id),
    usuario("cajero.b@prueba.test", "Cajero B", "CAJERO", b.id),
    usuario("bodega.a@prueba.test", "Bodega A", "BODEGA", a.id),
  ]);
  const [c1, c2] = await Promise.all([
    prisma.categoria.create({ data: { nombre: "Categoría prueba 1" } }),
    prisma.categoria.create({ data: { nombre: "Categoría prueba 2" } }),
  ]);
  const [pr1, pr2] = await Promise.all([
    prisma.proveedor.create({ data: { nit: "900000001-1", nombre: "Proveedor Prueba Uno", tiempoEntregaDias: 3 } }),
    prisma.proveedor.create({ data: { nit: "900000002-2", nombre: "Proveedor Prueba Dos", tiempoEntregaDias: 5 } }),
  ]);
  const producto = (sku: string, nombre: string, categoriaId: number, proveedorId: number, costo: number, precio: number) =>
    prisma.producto.create({ data: { sku, nombre, categoriaId, proveedorId, unidad: "unidad", costo, precio } });
  const [p1, p2, p3, p4] = await Promise.all([
    producto("T-001", "Producto uno", c1.id, pr1.id, 1000, 1500),
    producto("T-002", "Producto dos", c1.id, pr1.id, 2000, 3000),
    producto("T-003", "Producto tres", c2.id, pr2.id, 500, 800),
    producto("T-004", "Producto cuatro", c2.id, pr2.id, 4000, 5000),
  ]);
  await prisma.inventario.createMany({
    data: [
      { productoId: p1.id, sucursalId: a.id, stock: 40, stockMinimo: 5, stockMaximo: 100 },
      { productoId: p2.id, sucursalId: a.id, stock: 0, stockMinimo: 2, stockMaximo: 20 },
      { productoId: p3.id, sucursalId: a.id, stock: 100, stockMinimo: 10, stockMaximo: 200 },
      { productoId: p4.id, sucursalId: a.id, stock: 30, stockMinimo: 2, stockMaximo: 50 },
      { productoId: p1.id, sucursalId: b.id, stock: 10, stockMinimo: 2, stockMaximo: 50 },
    ],
  });
  const [k1, k2] = await Promise.all([
    prisma.cliente.create({ data: { documento: "1000000001", nombre: "Cliente Uno" } }),
    prisma.cliente.create({ data: { documento: "1000000002", nombre: "Cliente Dos" } }),
  ]);
  return {
    a, b, c1, c2, pr1, pr2, p1, p2, p3, p4, k1, k2, gerente, cajeroA, cajeroB, bodegaA,
    ctx: {
      gerente: contexto(gerente, null),
      cajeroA: contexto(cajeroA, a.nombre),
      cajeroB: contexto(cajeroB, b.nombre),
      bodegaA: contexto(bodegaA, a.nombre),
    },
  };
}
export type Escenario = Awaited<ReturnType<typeof crearEscenario>>;

/** Stock actual de un producto en una sucursal. */
export async function stock(productoId: number, sucursalId: number) {
  const i = await prisma.inventario.findUniqueOrThrow({ where: { productoId_sucursalId: { productoId, sucursalId } } });
  return i.stock;
}

/**
 * Venta con fecha elegida, insertada directamente (sin tocar el stock), con sus movimientos
 * de kardex. Sirve para construir historiales controlados (KPI y demanda de los agentes).
 */
export async function ventaHistorica(d: {
  sucursalId: number; cajeroId: number; clienteId?: number | null; fecha: Date; anuladaPorId?: number;
  items: { productoId: number; cantidad: number; precio: number; costo: number }[];
}) {
  const total = d.items.reduce((s, i) => s + i.cantidad * i.precio, 0);
  const costo = d.items.reduce((s, i) => s + i.cantidad * i.costo, 0);
  const anulada = d.anuladaPorId !== undefined;
  const v = await prisma.venta.create({
    data: {
      sucursalId: d.sucursalId, cajeroId: d.cajeroId, clienteId: d.clienteId ?? null, fecha: d.fecha, medioPago: "EFECTIVO",
      total, costoTotal: costo,
      ...(anulada ? { estado: "ANULADA" as const, anuladaPorId: d.anuladaPorId, fechaAnulacion: d.fecha, motivoAnulacion: "Anulación de prueba" } : {}),
      detalles: {
        create: d.items.map((i) => ({
          productoId: i.productoId, cantidad: i.cantidad, precioUnitario: i.precio, costoUnitario: i.costo, subtotal: i.cantidad * i.precio,
        })),
      },
    },
  });
  await prisma.movimientoInventario.createMany({
    data: d.items.flatMap((i) => [
      { productoId: i.productoId, sucursalId: d.sucursalId, tipo: "VENTA" as const, cantidad: -i.cantidad, stockResultante: 0, referenciaTipo: "VENTA", referenciaId: v.id, fecha: d.fecha },
      ...(anulada
        ? [{ productoId: i.productoId, sucursalId: d.sucursalId, tipo: "ANULACION_VENTA" as const, cantidad: i.cantidad, stockResultante: 0, referenciaTipo: "VENTA", referenciaId: v.id, fecha: d.fecha }]
        : []),
    ]),
  });
  return v;
}

/** Mediodia (hora de Colombia) de una fecha "YYYY-MM-DD": evita ambiguedades de zona horaria. */
export function mediodia(fecha: string): Date {
  return new Date(`${fecha}T17:00:00Z`);
}

/** Captura el error de una promesa para comprobar su estado HTTP y su codigo. */
export async function error(promesa: Promise<unknown>): Promise<ErrorApi> {
  try {
    await promesa;
  } catch (e) {
    if (e instanceof ErrorApi) return e;
    throw e;
  }
  throw new Error("Se esperaba un error y la operación terminó bien.");
}

/**
 * Modelo de IA simulado: responde con un guion fijo segun lo que pide el servidor.
 * - Con herramientas disponibles y sin resultados previos: llama a las herramientas indicadas.
 * - Con resultados de herramientas: devuelve un analisis en texto.
 * - Con esquema de respuesta: devuelve el JSON que entrega la funcion "json".
 * - Sin herramientas ni esquema: devuelve un texto (resumen del informe o chatbot).
 */
export class ModeloSimulado implements ModeloIA {
  readonly nombre = "modelo-simulado";
  llamadas: string[] = [];
  constructor(private readonly guion: {
    herramientas?: (disponibles: string[]) => { name: string; args: Record<string, unknown> }[];
    json?: (texto: string) => unknown;
    texto?: string;
  }) {}

  async generar(s: SolicitudModelo): Promise<RespuestaModelo> {
    const respuesta = (texto: string, llamadas: { name: string; args: Record<string, unknown> }[] = []): RespuestaModelo => ({
      contenido: { role: "model", parts: llamadas.length ? llamadas.map((c, i) => ({ functionCall: { id: `l${i}`, ...c } })) : [{ text: texto }] },
      llamadas: llamadas.map((c, i) => ({ id: `l${i}`, ...c })),
      texto,
      modelo: this.nombre,
    });
    if (s.esquemaRespuesta) {
      this.llamadas.push("json");
      const texto = String(s.contenidos[s.contenidos.length - 1]?.parts?.[0]?.text ?? "");
      return respuesta(JSON.stringify(this.guion.json?.(texto) ?? {}));
    }
    const conResultados = s.contenidos.some((c) => c.parts?.some((p) => p.functionResponse));
    if (s.herramientas.length && !conResultados && this.guion.herramientas) {
      const disponibles = s.herramientas.map((h) => h.name ?? "");
      const llamadas = this.guion.herramientas(disponibles).filter((l) => disponibles.includes(l.name));
      if (llamadas.length) {
        this.llamadas.push("herramientas");
        return respuesta("", llamadas);
      }
    }
    this.llamadas.push("texto");
    return respuesta(this.guion.texto ?? "Análisis del modelo simulado.");
  }
}

/** Modelo que siempre falla como Gemini saturado. */
export class ModeloCaido implements ModeloIA {
  readonly nombre = "modelo-caido";
  async generar(): Promise<RespuestaModelo> {
    throw new ErrorApi(503, "IA_NO_DISPONIBLE", "El servicio de inteligencia artificial está saturado (simulado).");
  }
}
