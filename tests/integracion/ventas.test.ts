// PRU-I01 a PRU-I04 y PRU-I08 (docs/10-PRU seccion 3): ventas contra la base de datos real
// del esquema "test": transaccion, stock, kardex, auditoria, concurrencia y anulacion.
import { beforeAll, describe, expect, it } from "vitest";
import { prisma } from "@/server/db";
import { servicioVentas } from "@/server/servicios/ventas";
import { servicioProductos } from "@/server/servicios/catalogos";
import { consultarKpis } from "@/server/servicios/kpi";
import { hoyBogota } from "@/lib/fechas";
import { crearEscenario, error, limpiar, stock, type Escenario } from "./datos";

let e: Escenario;
let ventaId = 0;

beforeAll(async () => {
  await limpiar();
  e = await crearEscenario();
});

const kpi01Hoy = async () => {
  const hoy = hoyBogota();
  const r = await consultarKpis({ desde: hoy, hasta: hoy, sucursalId: e.a.id, categoriaId: null });
  return r.kpis["KPI-01"].valor;
};

describe("Ventas (RF-16 a RF-18, RN-01 a RN-06)", () => {
  it("PRU-I01: registrar una venta crea detalles, descuenta stock y deja kardex y auditoría", async () => {
    const v = await servicioVentas.registrar(
      { medioPago: "EFECTIVO", clienteId: e.k1.id, items: [{ productoId: e.p1.id, cantidad: 2 }, { productoId: e.p3.id, cantidad: 1 }] },
      e.ctx.cajeroA,
    );
    ventaId = v.id;
    expect(v.total).toBe(2 * 1500 + 800); // el servidor pone los precios
    expect(await stock(e.p1.id, e.a.id)).toBe(38);
    expect(await stock(e.p3.id, e.a.id)).toBe(99);
    const detalles = await prisma.detalleVenta.findMany({ where: { ventaId: v.id } });
    expect(detalles).toHaveLength(2);
    const kardex = await prisma.movimientoInventario.findMany({ where: { referenciaTipo: "VENTA", referenciaId: v.id } });
    expect(kardex.map((m) => m.cantidad).sort((x, y) => x - y)).toEqual([-2, -1]);
    expect(kardex.find((m) => m.productoId === e.p1.id)?.stockResultante).toBe(38);
    expect(await prisma.auditoria.count({ where: { accion: "VENTA_REGISTRADA", entidadId: v.id } })).toBe(1);
  });

  it("PRU-I02: una venta con más unidades que el stock responde 409 y no cambia nada", async () => {
    const ventasAntes = await prisma.venta.count();
    const err = await error(servicioVentas.registrar(
      { medioPago: "EFECTIVO", items: [{ productoId: e.p3.id, cantidad: 1 }, { productoId: e.p1.id, cantidad: 39 }] },
      e.ctx.cajeroA,
    ));
    expect(err.status).toBe(409);
    expect(err.codigo).toBe("STOCK_INSUFICIENTE");
    expect(await prisma.venta.count()).toBe(ventasAntes);
    expect(await stock(e.p1.id, e.a.id)).toBe(38);
    expect(await stock(e.p3.id, e.a.id)).toBe(99); // tampoco se descontó el ítem que sí tenía stock
  });

  it("PRU-I03: seis ventas simultáneas sobre las dos últimas unidades: solo dos se confirman", async () => {
    await prisma.inventario.update({ where: { productoId_sucursalId: { productoId: e.p2.id, sucursalId: e.a.id } }, data: { stock: 2 } });
    const intentos = await Promise.allSettled(Array.from({ length: 6 }, () =>
      servicioVentas.registrar({ medioPago: "TARJETA_DEBITO", items: [{ productoId: e.p2.id, cantidad: 1 }] }, e.ctx.cajeroA)));
    const confirmadas = intentos.filter((r) => r.status === "fulfilled");
    const rechazadas = intentos.filter((r) => r.status === "rejected") as PromiseRejectedResult[];
    expect(confirmadas).toHaveLength(2);
    expect(rechazadas).toHaveLength(4);
    expect(rechazadas.every((r) => (r.reason as { status?: number }).status === 409)).toBe(true);
    expect(await stock(e.p2.id, e.a.id)).toBe(0);
  });

  it("PRU-S05 (servicio): un cajero de otra sucursal no ve la venta (404)", async () => {
    const err = await error(servicioVentas.obtener(ventaId, e.ctx.cajeroB));
    expect(err.status).toBe(404);
  });

  it("PRU-I04: anular una venta restituye el stock y deja de contar en KPI-01", async () => {
    // Hoy en A: venta de PRU-I01 (3800) y las dos de PRU-I03 (2 x 3000)
    expect(await kpi01Hoy()).toBe(3800 + 6000);
    const v = await servicioVentas.anular(ventaId, { motivo: "Prueba de anulación" }, e.ctx.gerente);
    expect(v.estado).toBe("ANULADA");
    expect(await stock(e.p1.id, e.a.id)).toBe(40);
    expect(await stock(e.p3.id, e.a.id)).toBe(100);
    expect(await prisma.movimientoInventario.count({ where: { tipo: "ANULACION_VENTA", referenciaId: ventaId } })).toBe(2);
    expect(await kpi01Hoy()).toBe(6000);
    const otra = await error(servicioVentas.anular(ventaId, { motivo: "Prueba de anulación" }, e.ctx.gerente));
    expect(otra.status).toBe(409);
  });

  it("PRU-I08: un producto con ventas se desactiva en lugar de borrarse; uno sin historial se borra", async () => {
    const r = await servicioProductos.eliminar(e.p1.id, e.ctx.gerente);
    expect(r).toEqual({ resultado: "desactivado" });
    expect((await prisma.producto.findUniqueOrThrow({ where: { id: e.p1.id } })).activo).toBe(false);
    const nuevo = await prisma.producto.create({
      data: { sku: "T-099", nombre: "Sin historial", categoriaId: e.c1.id, proveedorId: e.pr1.id, unidad: "unidad", costo: 100, precio: 150 },
    });
    expect(await servicioProductos.eliminar(nuevo.id, e.ctx.gerente)).toEqual({ resultado: "eliminado" });
    expect(await prisma.producto.findUnique({ where: { id: nuevo.id } })).toBeNull();
  });
});
