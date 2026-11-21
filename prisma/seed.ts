// ============================================================
// CeibaERP - Datos de demostracion (docs/05-DAT seccion 5)
//
// Simula 90 dias de operacion en orden cronologico, de modo que el stock,
// el kardex, las ventas y las ordenes de compra son coherentes entre si.
// Semilla aleatoria fija: siempre produce los mismos datos (con fechas
// relativas al dia de ejecucion).
//
// Uso:  npm run db:seed            (BD de demostracion, DATABASE_URL)
//       $env:SEED_DESTINO="test"   (opcional: esquema de pruebas, DATABASE_URL_TEST)
// ADVERTENCIA: borra todos los datos del esquema de destino antes de cargar.
// ============================================================
import "dotenv/config";
import bcrypt from "bcryptjs";
import { crearPrismaClient } from "../src/server/conexion";
import type { PrismaClient } from "../src/generated/prisma/client";
import {
  APELLIDOS, CATEGORIAS, NOMBRES, PRODUCTOS, PROVEEDORES, SUCURSALES, USUARIOS,
  type ProductoSeed, type SucursalSeed,
} from "./seed-datos";

// ------------------------------------------------------------
// Parametros de la simulacion
// ------------------------------------------------------------
const SEMILLA = 20261121;
const DIAS = 90;
const OFFSET_BOGOTA_HORAS = -5; // America/Bogota no tiene horario de verano
const DIAS_SIN_REPONER_RIESGO = 12;
const DIAS_SIN_REPONER_AGOTADO = 30;
const DIAS_TENDENCIA_BEBIDAS = 35;
const N_CLIENTES = 800;
const CRECIMIENTO_BEBIDAS = 0.6;
const PROB_ANULACION = 0.008;
const LOTE = 2000;

// ------------------------------------------------------------
// Utilidades: aleatorio determinista y fechas
// ------------------------------------------------------------
function mulberry32(semilla: number) {
  let a = semilla >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rnd = mulberry32(SEMILLA);
const entero = (min: number, max: number) => min + Math.floor(rnd() * (max - min + 1));
const elegir = <T>(lista: T[]) => lista[Math.floor(rnd() * lista.length)];
function elegirPonderado<T>(lista: T[], pesos: number[]): T {
  const total = pesos.reduce((a, b) => a + b, 0);
  let r = rnd() * total;
  for (let i = 0; i < lista.length; i++) {
    r -= pesos[i];
    if (r <= 0) return lista[i];
  }
  return lista[lista.length - 1];
}

/** Fecha local de Bogota (dia relativo a hoy) a las hh:mm, expresada en UTC. */
function instanteLocal(diaRelativo: number, hora: number, minuto = 0): Date {
  const ahora = new Date(Date.now() + OFFSET_BOGOTA_HORAS * 3600_000);
  const base = Date.UTC(ahora.getUTCFullYear(), ahora.getUTCMonth(), ahora.getUTCDate() + diaRelativo, hora, minuto);
  return new Date(base - OFFSET_BOGOTA_HORAS * 3600_000);
}
/** Fecha local de Bogota (dia relativo a hoy) como DATE (medianoche UTC). */
function fechaLocal(diaRelativo: number): Date {
  const ahora = new Date(Date.now() + OFFSET_BOGOTA_HORAS * 3600_000);
  return new Date(Date.UTC(ahora.getUTCFullYear(), ahora.getUTCMonth(), ahora.getUTCDate() + diaRelativo));
}
const diaSemana = (diaRelativo: number) => fechaLocal(diaRelativo).getUTCDay(); // 0 = domingo

function factorDia(diaRelativo: number): number {
  const d = diaSemana(diaRelativo);
  if (d === 6) return 1.35;
  if (d === 0) return 1.25;
  if (d === 5) return 1.1;
  return 1;
}
function factorCategoria(categoria: string, diaRelativo: number): number {
  if (categoria !== "Bebidas") return 1;
  const inicio = -DIAS_TENDENCIA_BEBIDAS;
  if (diaRelativo <= inicio) return 1;
  return 1 + CRECIMIENTO_BEBIDAS * ((diaRelativo - inicio) / DIAS_TENDENCIA_BEBIDAS);
}

// ------------------------------------------------------------
// Tipos de la simulacion en memoria
// ------------------------------------------------------------
type Movimiento = {
  productoSku: string; sucursal: string; tipo: "CARGA_INICIAL" | "VENTA" | "ANULACION_VENTA" | "RECEPCION_COMPRA" | "AJUSTE_ENTRADA" | "AJUSTE_SALIDA";
  cantidad: number; stockResultante: number; referencia?: { tipo: "VENTA" | "ORDEN_COMPRA" | "AJUSTE"; indice: number };
  motivo?: string; usuarioEmail?: string; fecha: Date;
};
type VentaSim = {
  sucursal: string; clienteIndice: number | null; fecha: Date; medioPago: "EFECTIVO" | "TARJETA_DEBITO" | "TARJETA_CREDITO" | "TRANSFERENCIA";
  items: { sku: string; cantidad: number; precio: number; costo: number }[]; anulada: boolean;
};
type OrdenSim = {
  proveedor: string; sucursal: string; estado: "BORRADOR" | "APROBADA" | "RECIBIDA" | "CANCELADA";
  creada: Date; aprobada?: Date; fechaEsperadaDia: number; recepcionDia?: number; motivoCancelacion?: string;
  items: { sku: string; cantidad: number; costo: number }[]; observaciones?: string;
};

// ------------------------------------------------------------
// Simulacion
// ------------------------------------------------------------
function simular() {
  const proveedorPorClave = new Map(PROVEEDORES.map((p) => [p.clave, p]));
  const pesoTotal = PRODUCTOS.reduce((a, p) => a + p.peso, 0);
  const clave = (sku: string, suc: string) => `${sku}|${suc}`;

  // Demanda diaria esperada (unidades) por producto y sucursal, para fijar minimo y maximo.
  const demanda = new Map<string, number>();
  for (const s of SUCURSALES) {
    const itemsProm = (s.itemsMin + s.itemsMax) / 2;
    for (const p of PRODUCTOS) {
      demanda.set(clave(p.sku, s.codigo), s.ventasBaseDia * 1.1 * itemsProm * (p.peso / pesoTotal) * 1.4);
    }
  }

  const stock = new Map<string, number>();
  const minimo = new Map<string, number>();
  const maximo = new Map<string, number>();
  const movimientos: Movimiento[] = [];
  const ventas: VentaSim[] = [];
  const ordenes: OrdenSim[] = [];
  const pedidoAbierto = new Set<string>(); // producto|sucursal con orden pendiente

  // Carga inicial
  for (const s of SUCURSALES) {
    for (const p of PRODUCTOS) {
      const k = clave(p.sku, s.codigo);
      const d = demanda.get(k)!;
      const lead = proveedorPorClave.get(p.proveedor)!.tiempoEntregaDias;
      const min = Math.max(4, Math.ceil(d * (lead + 3)));
      const max = Math.max(min + 10, Math.ceil(d * (lead + 20)));
      minimo.set(k, min);
      maximo.set(k, max);
      const inicial = p.caso === "BAJA_ROTACION" ? Math.ceil(max * 1.7) : Math.ceil(max * 0.8);
      stock.set(k, inicial);
      movimientos.push({
        productoSku: p.sku, sucursal: s.codigo, tipo: "CARGA_INICIAL", cantidad: inicial, stockResultante: inicial,
        motivo: "Inventario inicial", fecha: instanteLocal(-DIAS - 1, 6),
      });
    }
  }

  const permiteReponer = (p: ProductoSeed, suc: string, dia: number) => {
    if (p.caso === "RIESGO" && dia > -DIAS_SIN_REPONER_RIESGO) return false;
    if (p.caso === "AGOTADO" && p.sucursalAgotada === suc && dia > -DIAS_SIN_REPONER_AGOTADO) return false;
    return true;
  };

  for (let dia = -DIAS; dia <= -1; dia++) {
    // 1) Recepciones del dia (07:30)
    for (let i = 0; i < ordenes.length; i++) {
      const o = ordenes[i];
      if (o.estado !== "APROBADA" || o.recepcionDia !== dia) continue;
      o.estado = "RECIBIDA";
      const bodega = USUARIOS.find((u) => u.rol === "BODEGA" && u.sucursal === o.sucursal)!;
      for (const it of o.items) {
        const k = clave(it.sku, o.sucursal);
        const nuevo = stock.get(k)! + it.cantidad;
        stock.set(k, nuevo);
        pedidoAbierto.delete(k);
        movimientos.push({
          productoSku: it.sku, sucursal: o.sucursal, tipo: "RECEPCION_COMPRA", cantidad: it.cantidad, stockResultante: nuevo,
          referencia: { tipo: "ORDEN_COMPRA", indice: i }, usuarioEmail: bodega.email, fecha: instanteLocal(dia, 7, 30),
        });
      }
    }

    // 2) Ventas del dia
    for (const s of SUCURSALES) {
      const nVentas = Math.max(1, Math.round(s.ventasBaseDia * factorDia(dia) * (0.85 + rnd() * 0.3)));
      // Minutos unicos: la anulacion (30 s despues) siempre ocurre antes de la siguiente venta.
      const unicos = new Set<number>();
      while (unicos.size < nVentas) unicos.add(entero(7 * 60, 21 * 60 - 1));
      const minutos = [...unicos].sort((a, b) => a - b);
      const pesos = PRODUCTOS.map((p) => p.peso * factorCategoria(p.categoria, dia));
      for (const m of minutos) {
        const nItems = entero(s.itemsMin, s.itemsMax);
        const items: VentaSim["items"] = [];
        for (let j = 0; j < nItems; j++) {
          const prod = elegirPonderado(PRODUCTOS, pesos);
          if (items.some((it) => it.sku === prod.sku)) continue;
          const k = clave(prod.sku, s.codigo);
          let cant = 1 + (rnd() < 0.3 ? 1 : 0) + (rnd() < 0.1 ? 1 : 0);
          cant = Math.min(cant, stock.get(k)!);
          if (cant <= 0) continue; // venta perdida por agotamiento
          items.push({ sku: prod.sku, cantidad: cant, precio: prod.precio, costo: prod.costo });
        }
        if (items.length === 0) continue;
        const fecha = instanteLocal(dia, Math.floor(m / 60), m % 60);
        const indice = ventas.length;
        const identificado = rnd() < s.probClienteIdentificado;
        const venta: VentaSim = {
          sucursal: s.codigo,
          clienteIndice: identificado ? Math.floor(N_CLIENTES * Math.pow(rnd(), 2.2)) : null,
          fecha,
          medioPago: elegirPonderado(["EFECTIVO", "TARJETA_DEBITO", "TARJETA_CREDITO", "TRANSFERENCIA"] as const, [0.4, 0.3, 0.15, 0.15]),
          items,
          anulada: rnd() < PROB_ANULACION,
        };
        ventas.push(venta);
        const cajero = USUARIOS.find((u) => u.rol === "CAJERO" && u.sucursal === s.codigo)!;
        for (const it of items) {
          const k = clave(it.sku, s.codigo);
          const nuevo = stock.get(k)! - it.cantidad;
          stock.set(k, nuevo);
          movimientos.push({
            productoSku: it.sku, sucursal: s.codigo, tipo: "VENTA", cantidad: -it.cantidad, stockResultante: nuevo,
            referencia: { tipo: "VENTA", indice }, usuarioEmail: cajero.email, fecha,
          });
        }
        if (venta.anulada) {
          const fAnul = new Date(fecha.getTime() + 30_000);
          for (const it of items) {
            const k = clave(it.sku, s.codigo);
            const nuevo = stock.get(k)! + it.cantidad;
            stock.set(k, nuevo);
            movimientos.push({
              productoSku: it.sku, sucursal: s.codigo, tipo: "ANULACION_VENTA", cantidad: it.cantidad, stockResultante: nuevo,
              referencia: { tipo: "VENTA", indice }, usuarioEmail: "gerente@ceiba.test", fecha: fAnul,
              motivo: "Error en el registro de la venta",
            });
          }
        }
      }
    }

    // 3) Reposicion automatica (18:00): productos en o bajo el minimo, agrupados por proveedor
    for (const s of SUCURSALES) {
      const porProveedor = new Map<string, OrdenSim["items"]>();
      for (const p of PRODUCTOS) {
        const k = clave(p.sku, s.codigo);
        if (pedidoAbierto.has(k) || !permiteReponer(p, s.codigo, dia)) continue;
        if (stock.get(k)! > minimo.get(k)!) continue;
        const cant = Math.floor((maximo.get(k)! - stock.get(k)!) / 5) * 5;
        if (cant <= 0) continue;
        const lista = porProveedor.get(p.proveedor) ?? [];
        lista.push({ sku: p.sku, cantidad: cant, costo: p.costo });
        porProveedor.set(p.proveedor, lista);
        pedidoAbierto.add(k);
      }
      for (const [prov, items] of porProveedor) {
        const datos = proveedorPorClave.get(prov)!;
        const tarde = rnd() < datos.probEntregaTardia ? entero(1, 4) : 0;
        ordenes.push({
          proveedor: prov, sucursal: s.codigo, estado: "APROBADA",
          creada: instanteLocal(dia, 18), aprobada: instanteLocal(dia, 19),
          fechaEsperadaDia: dia + datos.tiempoEntregaDias, recepcionDia: dia + datos.tiempoEntregaDias + tarde,
          items,
        });
      }
    }
  }

  // 4) Ajuste final de los productos en riesgo: cobertura menor al tiempo de entrega
  const ventaDiaria28 = (sku: string, suc: string) => {
    const desde = instanteLocal(-28, 0).getTime();
    let unidades = 0;
    for (const v of ventas) {
      if (v.anulada || v.sucursal !== suc || v.fecha.getTime() < desde) continue;
      for (const it of v.items) if (it.sku === sku) unidades += it.cantidad;
    }
    return unidades / 28;
  };
  for (const p of PRODUCTOS.filter((x) => x.caso === "RIESGO")) {
    const lead = proveedorPorClave.get(p.proveedor)!.tiempoEntregaDias;
    for (const s of SUCURSALES) {
      const k = clave(p.sku, s.codigo);
      const v = ventaDiaria28(p.sku, s.codigo);
      const objetivo = Math.max(1, Math.floor(v * lead * 0.5));
      const actual = stock.get(k)!;
      if (actual === objetivo) continue;
      const bodega = USUARIOS.find((u) => u.rol === "BODEGA" && u.sucursal === s.codigo)!;
      const diferencia = objetivo - actual;
      stock.set(k, objetivo);
      movimientos.push({
        productoSku: p.sku, sucursal: s.codigo, tipo: diferencia > 0 ? "AJUSTE_ENTRADA" : "AJUSTE_SALIDA",
        cantidad: diferencia, stockResultante: objetivo, referencia: { tipo: "AJUSTE", indice: 0 },
        motivo: diferencia > 0 ? "Conteo fisico: unidades sin registrar" : "Conteo fisico: merma por producto averiado",
        usuarioEmail: bodega.email, fecha: instanteLocal(-1, 21, 30),
      });
    }
  }

  // 5) Ordenes manuales: dos en borrador y dos canceladas
  const prodNormal = PRODUCTOS.filter((x) => x.caso === "NORMAL");
  const crearManual = (suc: string, prov: string, dia: number, estado: OrdenSim["estado"], motivo?: string) => {
    const items = prodNormal.filter((x) => x.proveedor === prov).slice(0, 3).map((x) => ({ sku: x.sku, cantidad: 20, costo: x.costo }));
    const datos = proveedorPorClave.get(prov)!;
    ordenes.push({
      proveedor: prov, sucursal: suc, estado, creada: instanteLocal(dia, 10), fechaEsperadaDia: dia + datos.tiempoEntregaDias,
      items, motivoCancelacion: motivo, observaciones: estado === "BORRADOR" ? "Pedido de temporada pendiente de revision" : undefined,
    });
  };
  crearManual("SUC-LAU", "P6", -1, "BORRADOR");
  crearManual("SUC-CEN", "P8", -1, "BORRADOR");
  crearManual("SUC-ENV", "P4", -40, "CANCELADA", "Proveedor sin disponibilidad de producto");
  crearManual("SUC-BEL", "P7", -20, "CANCELADA", "Pedido duplicado");

  return { stock, minimo, maximo, movimientos, ventas, ordenes };
}

// ------------------------------------------------------------
// Persistencia
// ------------------------------------------------------------
async function reservarIds(prisma: PrismaClient, esquema: string, tabla: string, n: number): Promise<number[]> {
  if (n === 0) return [];
  const filas = await prisma.$queryRawUnsafe<{ id: number }[]>(
    `SELECT nextval(pg_get_serial_sequence($1, 'id'))::int AS id FROM generate_series(1, $2::int)`,
    `"${esquema}"."${tabla}"`, n,
  );
  return filas.map((f) => f.id);
}

async function enLotes<T>(filas: T[], fn: (lote: T[]) => Promise<unknown>) {
  for (let i = 0; i < filas.length; i += LOTE) await fn(filas.slice(i, i + LOTE));
}

async function borrarTodo(prisma: PrismaClient) {
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

function validarContrasena(): string {
  const pwd = process.env.SEED_DEMO_PASSWORD ?? "";
  if (pwd.length < 10 || !/[A-Za-z]/.test(pwd) || !/[0-9]/.test(pwd)) {
    throw new Error("SEED_DEMO_PASSWORD debe tener al menos 10 caracteres, con letras y numeros.");
  }
  return pwd;
}

async function main() {
  const destinoPruebas = process.env.SEED_DESTINO === "test";
  const variable = destinoPruebas ? "DATABASE_URL_TEST" : "DATABASE_URL";
  const url = process.env[variable];
  if (!url) throw new Error(`La variable ${variable} no esta definida.`);
  const contrasena = validarContrasena();
  const { prisma, conf } = crearPrismaClient(url);
  const t0 = Date.now();
  console.log(`Seed CeibaERP -> esquema "${conf.schema}" (tls: ${conf.modoSsl})`);

  try {
    console.log("1/6 Simulando 90 dias de operacion...");
    const sim = simular();

    console.log("2/6 Borrando datos existentes...");
    await borrarTodo(prisma);

    console.log("3/6 Catalogos, usuarios y clientes...");
    const sucursales = await prisma.sucursal.createManyAndReturn({
      data: SUCURSALES.map((s: SucursalSeed) => ({ codigo: s.codigo, nombre: s.nombre, ciudad: s.ciudad, direccion: s.direccion })),
    });
    const sucId = new Map(sucursales.map((s) => [s.codigo, s.id]));

    const hash = await bcrypt.hash(contrasena, 12);
    const usuarios = await prisma.usuario.createManyAndReturn({
      data: USUARIOS.map((u) => ({
        nombre: u.nombre, email: u.email, passwordHash: hash, rol: u.rol, sucursalId: u.sucursal ? sucId.get(u.sucursal)! : null,
      })),
    });
    const usrId = new Map(usuarios.map((u) => [u.email, u.id]));
    const gerenteId = usrId.get("gerente@ceiba.test")!;

    const categorias = await prisma.categoria.createManyAndReturn({ data: CATEGORIAS });
    const catId = new Map(categorias.map((c) => [c.nombre, c.id]));

    const proveedores = await prisma.proveedor.createManyAndReturn({
      data: PROVEEDORES.map((p) => ({
        nit: p.nit, nombre: p.nombre, contacto: p.contacto, telefono: p.telefono, email: p.email, tiempoEntregaDias: p.tiempoEntregaDias,
      })),
    });
    const provId = new Map(PROVEEDORES.map((p) => [p.clave, proveedores.find((x) => x.nit === p.nit)!.id]));

    const productos = await prisma.producto.createManyAndReturn({
      data: PRODUCTOS.map((p) => ({
        sku: p.sku, nombre: p.nombre, categoriaId: catId.get(p.categoria)!, proveedorId: provId.get(p.proveedor)!,
        unidad: p.unidad, costo: p.costo, precio: p.precio,
      })),
    });
    const prodId = new Map(productos.map((p) => [p.sku, p.id]));

    const clientesData = Array.from({ length: N_CLIENTES }, (_, i) => {
      const nombre = `${elegir(NOMBRES)} ${elegir(APELLIDOS)} ${elegir(APELLIDOS)}`;
      const usuarioCorreo = nombre.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().split(" ").slice(0, 2).join(".");
      return {
        documento: String(1000000000 + i * 7919 + 13),
        nombre,
        email: `${usuarioCorreo}${i}@correo.test`,
        telefono: `300${String(1000000 + i * 37).padStart(7, "0")}`,
      };
    });
    const clientes = await prisma.cliente.createManyAndReturn({ data: clientesData });
    const cliId = new Map(clientes.map((c) => [c.documento, c.id]));
    const clienteIdPorIndice = (i: number) => cliId.get(clientesData[i].documento)!;

    console.log("4/6 Inventario...");
    await prisma.inventario.createMany({
      data: SUCURSALES.flatMap((s) =>
        PRODUCTOS.map((p) => {
          const k = `${p.sku}|${s.codigo}`;
          return {
            productoId: prodId.get(p.sku)!, sucursalId: sucId.get(s.codigo)!,
            stock: sim.stock.get(k)!, stockMinimo: sim.minimo.get(k)!, stockMaximo: sim.maximo.get(k)!,
          };
        }),
      ),
    });

    console.log(`5/6 Ventas (${sim.ventas.length}) y ordenes de compra (${sim.ordenes.length})...`);
    const idsVenta = await reservarIds(prisma, conf.schema, "venta", sim.ventas.length);
    const idsOrden = await reservarIds(prisma, conf.schema, "orden_compra", sim.ordenes.length);

    const ventasData = sim.ventas.map((v, i) => {
      const total = v.items.reduce((a, it) => a + it.cantidad * it.precio, 0);
      const costoTotal = v.items.reduce((a, it) => a + it.cantidad * it.costo, 0);
      const cajeroEmail = USUARIOS.find((u) => u.rol === "CAJERO" && u.sucursal === v.sucursal)!.email;
      return {
        id: idsVenta[i], sucursalId: sucId.get(v.sucursal)!, cajeroId: usrId.get(cajeroEmail)!,
        clienteId: v.clienteIndice === null ? null : clienteIdPorIndice(v.clienteIndice),
        fecha: v.fecha, medioPago: v.medioPago, estado: v.anulada ? ("ANULADA" as const) : ("REGISTRADA" as const),
        total, costoTotal,
        anuladaPorId: v.anulada ? gerenteId : null,
        fechaAnulacion: v.anulada ? new Date(v.fecha.getTime() + 30_000) : null,
        motivoAnulacion: v.anulada ? "Error en el registro de la venta" : null,
      };
    });
    await enLotes(ventasData, (l) => prisma.venta.createMany({ data: l }));

    const detallesData = sim.ventas.flatMap((v, i) =>
      v.items.map((it) => ({
        ventaId: idsVenta[i], productoId: prodId.get(it.sku)!, cantidad: it.cantidad,
        precioUnitario: it.precio, costoUnitario: it.costo, subtotal: it.cantidad * it.precio,
      })),
    );
    await enLotes(detallesData, (l) => prisma.detalleVenta.createMany({ data: l }));

    const ordenesData = sim.ordenes.map((o, i) => {
      const bodegaEmail = USUARIOS.find((u) => u.rol === "BODEGA" && u.sucursal === o.sucursal)!.email;
      const total = o.items.reduce((a, it) => a + it.cantidad * it.costo, 0);
      const aprobadaOrRecibida = o.estado === "APROBADA" || o.estado === "RECIBIDA";
      return {
        id: idsOrden[i], proveedorId: provId.get(o.proveedor)!, sucursalId: sucId.get(o.sucursal)!, estado: o.estado,
        origen: "MANUAL" as const, creadaPorId: usrId.get(bodegaEmail)!,
        aprobadaPorId: aprobadaOrRecibida ? gerenteId : null, fechaAprobacion: aprobadaOrRecibida ? o.aprobada ?? null : null,
        recibidaPorId: o.estado === "RECIBIDA" ? usrId.get(bodegaEmail)! : null,
        fechaEsperada: fechaLocal(o.fechaEsperadaDia),
        fechaRecepcion: o.estado === "RECIBIDA" ? fechaLocal(o.recepcionDia!) : null,
        motivoCancelacion: o.motivoCancelacion ?? null, total, observaciones: o.observaciones ?? null, createdAt: o.creada,
      };
    });
    await enLotes(ordenesData, (l) => prisma.ordenCompra.createMany({ data: l }));
    await enLotes(
      sim.ordenes.flatMap((o, i) =>
        o.items.map((it) => ({
          ordenCompraId: idsOrden[i], productoId: prodId.get(it.sku)!, cantidad: it.cantidad,
          costoUnitario: it.costo, subtotal: it.cantidad * it.costo,
        })),
      ),
      (l) => prisma.detalleOrdenCompra.createMany({ data: l }),
    );

    console.log(`6/6 Kardex (${sim.movimientos.length} movimientos)...`);
    const movData = sim.movimientos.map((m) => ({
      productoId: prodId.get(m.productoSku)!, sucursalId: sucId.get(m.sucursal)!, tipo: m.tipo, cantidad: m.cantidad,
      stockResultante: m.stockResultante,
      referenciaTipo: m.referencia?.tipo ?? null,
      referenciaId: m.referencia?.tipo === "VENTA" ? idsVenta[m.referencia.indice]
        : m.referencia?.tipo === "ORDEN_COMPRA" ? idsOrden[m.referencia.indice] : null,
      motivo: m.motivo ?? null, usuarioId: m.usuarioEmail ? usrId.get(m.usuarioEmail)! : null, fecha: m.fecha,
    }));
    await enLotes(movData, (l) => prisma.movimientoInventario.createMany({ data: l }));

    await prisma.auditoria.create({
      data: {
        accion: "SEED_EJECUTADO", entidad: "sistema",
        detalle: { ventas: sim.ventas.length, ordenes: sim.ordenes.length, movimientos: sim.movimientos.length, semilla: SEMILLA },
      },
    });

    resumen(sim);
    console.log(`\nSeed completado en ${((Date.now() - t0) / 1000).toFixed(1)} s.`);
  } finally {
    await prisma.$disconnect();
  }
}

function resumen(sim: ReturnType<typeof simular>) {
  const fmt = (n: number) => n.toLocaleString("es-CO");
  const estados = sim.ordenes.reduce<Record<string, number>>((a, o) => ((a[o.estado] = (a[o.estado] ?? 0) + 1), a), {});
  const hoy = 0;
  const vencidas = sim.ordenes.filter((o) => o.estado === "APROBADA" && o.fechaEsperadaDia < hoy).length;
  const ventasPorSuc = SUCURSALES.map((s) => ({
    s: s.nombre,
    total: sim.ventas.filter((v) => v.sucursal === s.codigo && !v.anulada).reduce((a, v) => a + v.items.reduce((b, it) => b + it.cantidad * it.precio, 0), 0),
  }));
  const agotados = [...sim.stock.entries()].filter(([, v]) => v === 0).map(([k]) => k.replace("|", " @ "));
  const sobrestock = [...sim.stock.entries()].filter(([k, v]) => v > sim.maximo.get(k)!).length;

  console.log("\n================ RESUMEN ================");
  console.log(`Ventas: ${fmt(sim.ventas.length)} (anuladas: ${sim.ventas.filter((v) => v.anulada).length})`);
  console.log(`Ordenes de compra: ${JSON.stringify(estados)} | aprobadas vencidas sin recibir: ${vencidas}`);
  console.log("Ventas por sucursal (COP):");
  for (const v of ventasPorSuc) console.log(`  ${v.s.padEnd(16)} ${fmt(v.total)}`);
  console.log(`Combinaciones agotadas (stock 0): ${agotados.length} -> ${agotados.join(", ")}`);
  console.log(`Combinaciones en sobrestock: ${sobrestock}`);
  console.log(`Productos sembrados en riesgo: ${PRODUCTOS.filter((p) => p.caso === "RIESGO").map((p) => p.nombre).join(", ")}`);
  console.log(`Productos de baja rotacion: ${PRODUCTOS.filter((p) => p.caso === "BAJA_ROTACION").length}`);
  console.log("=========================================");
}

main().catch((e) => {
  console.error(`\nERROR en el seed: ${(e as Error).message}`);
  process.exit(1);
});
