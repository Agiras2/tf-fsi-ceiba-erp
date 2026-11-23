// PRU-I05 y PRU-I06 (docs/10-PRU seccion 3): ciclo de la orden de compra contra la base de
// datos, efecto en el stock y en KPI-06, transicion invalida y aprobaciones simultaneas.
import { beforeAll, describe, expect, it } from "vitest";
import { prisma } from "@/server/db";
import { servicioCompras } from "@/server/servicios/compras";
import { consultarKpis, cumplimientoProveedores } from "@/server/servicios/kpi";
import { aFechaDb, hoyBogota, sumarDias } from "@/lib/fechas";
import { crearEscenario, error, limpiar, stock, type Escenario } from "./datos";

let e: Escenario;
const hoy = hoyBogota();

beforeAll(async () => {
  await limpiar();
  e = await crearEscenario();
});

async function ordenAprobada(fechaEsperada: string, cantidad = 5) {
  const o = await servicioCompras.crear(
    { proveedorId: e.pr1.id, fechaEsperada, items: [{ productoId: e.p1.id, cantidad }] }, e.ctx.bodegaA);
  await servicioCompras.aprobar(o.id, {}, e.ctx.gerente);
  return o.id;
}

/** Simula el paso del tiempo: la orden debia llegar en otra fecha. */
const cambiarFechaEsperada = (id: number, fecha: string) =>
  prisma.ordenCompra.update({ where: { id }, data: { fechaEsperada: aFechaDb(fecha) } });

describe("Órdenes de compra (RF-19 a RF-22, RN-07, RN-08)", () => {
  it("PRU-I05: BORRADOR → APROBADA → RECIBIDA suma el stock y deja kardex", async () => {
    const o = await servicioCompras.crear(
      { proveedorId: e.pr1.id, fechaEsperada: sumarDias(hoy, 3), items: [{ productoId: e.p1.id, cantidad: 10 }] }, e.ctx.bodegaA);
    expect(o.estado).toBe("BORRADOR");
    expect(o.total).toBe(10 * 1000); // costo del producto, calculado por el servidor
    expect((await servicioCompras.aprobar(o.id, {}, e.ctx.gerente)).estado).toBe("APROBADA");
    const r = await servicioCompras.recibir(o.id, {}, e.ctx.bodegaA);
    expect(r.estado).toBe("RECIBIDA");
    expect(await stock(e.p1.id, e.a.id)).toBe(50);
    const kardex = await prisma.movimientoInventario.findFirst({ where: { tipo: "RECEPCION_COMPRA", referenciaId: o.id } });
    expect(kardex?.cantidad).toBe(10);
    expect(kardex?.stockResultante).toBe(50);
  });

  it("PRU-I05: KPI-06 distingue entregas a tiempo, tardías y vencidas sin recibir", async () => {
    const aTiempo = await ordenAprobada(hoy);
    const tarde = await ordenAprobada(hoy);
    const vencida = await ordenAprobada(hoy);
    await cambiarFechaEsperada(tarde, sumarDias(hoy, -2));
    await cambiarFechaEsperada(vencida, sumarDias(hoy, -1));
    await servicioCompras.recibir(aTiempo, {}, e.ctx.bodegaA); // llega el mismo dia esperado
    await servicioCompras.recibir(tarde, {}, e.ctx.bodegaA); // llega dos dias tarde
    const f = { desde: sumarDias(hoy, -5), hasta: hoy, sucursalId: e.a.id, categoriaId: null };
    const [p] = await cumplimientoProveedores(f);
    expect(p).toMatchObject({ debidas: 3, aTiempo: 1, tardias: 1, pendientesVencidas: 1 });
    // La orden de la prueba anterior (esperada en 3 dias) aun no cuenta.
    expect((await consultarKpis(f)).kpis["KPI-06"].valor).toBe(33.33);
  });

  it("PRU-I06: recibir una orden en BORRADOR responde 409 y no cambia el stock", async () => {
    const o = await servicioCompras.crear(
      { proveedorId: e.pr1.id, fechaEsperada: sumarDias(hoy, 3), items: [{ productoId: e.p1.id, cantidad: 7 }] }, e.ctx.bodegaA);
    const antes = await stock(e.p1.id, e.a.id);
    const err = await error(servicioCompras.recibir(o.id, {}, e.ctx.bodegaA));
    expect(err.status).toBe(409);
    expect(await stock(e.p1.id, e.a.id)).toBe(antes);
    expect((await prisma.ordenCompra.findUniqueOrThrow({ where: { id: o.id } })).estado).toBe("BORRADOR");
  });

  it("RN-07: tres aprobaciones simultáneas de la misma orden: solo una se aplica", async () => {
    const o = await servicioCompras.crear(
      { proveedorId: e.pr1.id, fechaEsperada: sumarDias(hoy, 3), items: [{ productoId: e.p1.id, cantidad: 4 }] }, e.ctx.bodegaA);
    const r = await Promise.allSettled([1, 2, 3].map(() => servicioCompras.aprobar(o.id, {}, e.ctx.gerente)));
    expect(r.filter((x) => x.status === "fulfilled")).toHaveLength(1);
    expect((r.filter((x) => x.status === "rejected") as PromiseRejectedResult[]).every((x) => (x.reason as { status?: number }).status === 409)).toBe(true);
    expect(await prisma.auditoria.count({ where: { accion: "OC_APROBADA", entidadId: o.id } })).toBe(1);
  });
});
