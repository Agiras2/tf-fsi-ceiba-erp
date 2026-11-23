// PRU-I07 (docs/10-PRU seccion 3): los ocho KPI sobre un conjunto de datos controlado,
// comparados con valores calculados a mano a partir de las fichas de docs/06-KPI.
//
// Periodo: 01/10/2026 a 10/10/2026 (10 dias). Sucursal A:
//   V1 02/10 cliente 1: T-001 x4 (6000, costo 4000) + T-003 x2 (1600, costo 1000)
//   V2 05/10 cliente 1: T-002 x3 (9000, costo 6000)
//   V3 07/10 cliente 2: T-001 x2 (3000, costo 2000)
//   V4 08/10 sin cliente: T-003 x10 (8000, costo 5000)
//   V5 09/10 ANULADA: T-001 x5 (no cuenta)
//   V6 15/10 fuera del periodo: T-001 x3 (no cuenta)
// Sucursal B: VB 03/10 cliente 2: T-001 x1 (1500, costo 1000)
// Ordenes de A con fecha esperada en el periodo: una a tiempo, una tardia, una aprobada vencida
// y un borrador (no cuenta).
import { beforeAll, describe, expect, it } from "vitest";
import { prisma } from "@/server/db";
import { consultarKpis, type FiltrosKpi } from "@/server/servicios/kpi";
import { aFechaDb } from "@/lib/fechas";
import { crearEscenario, limpiar, mediodia, ventaHistorica, type Escenario } from "./datos";

let e: Escenario;
const periodo = { desde: "2026-10-01", hasta: "2026-10-10" };

beforeAll(async () => {
  await limpiar();
  e = await crearEscenario();
  const linea = (p: { id: number }, cantidad: number, precio: number, costo: number) => ({ productoId: p.id, cantidad, precio, costo });
  const a = { sucursalId: e.a.id, cajeroId: e.cajeroA.id };
  await ventaHistorica({ ...a, clienteId: e.k1.id, fecha: mediodia("2026-10-02"), items: [linea(e.p1, 4, 1500, 1000), linea(e.p3, 2, 800, 500)] });
  await ventaHistorica({ ...a, clienteId: e.k1.id, fecha: mediodia("2026-10-05"), items: [linea(e.p2, 3, 3000, 2000)] });
  await ventaHistorica({ ...a, clienteId: e.k2.id, fecha: mediodia("2026-10-07"), items: [linea(e.p1, 2, 1500, 1000)] });
  await ventaHistorica({ ...a, fecha: mediodia("2026-10-08"), items: [linea(e.p3, 10, 800, 500)] });
  await ventaHistorica({ ...a, fecha: mediodia("2026-10-09"), anuladaPorId: e.gerente.id, items: [linea(e.p1, 5, 1500, 1000)] });
  await ventaHistorica({ ...a, fecha: mediodia("2026-10-15"), items: [linea(e.p1, 3, 1500, 1000)] });
  await ventaHistorica({ sucursalId: e.b.id, cajeroId: e.cajeroB.id, clienteId: e.k2.id, fecha: mediodia("2026-10-03"), items: [linea(e.p1, 1, 1500, 1000)] });

  const orden = (estado: "BORRADOR" | "APROBADA" | "RECIBIDA", esperada: string, recepcion?: string) =>
    prisma.ordenCompra.create({
      data: {
        proveedorId: e.pr1.id, sucursalId: e.a.id, estado, fechaEsperada: aFechaDb(esperada),
        fechaRecepcion: recepcion ? aFechaDb(recepcion) : null, fechaAprobacion: estado === "BORRADOR" ? null : mediodia("2026-09-28"),
      },
    });
  await orden("RECIBIDA", "2026-10-04", "2026-10-03"); // a tiempo
  await orden("RECIBIDA", "2026-10-05", "2026-10-08"); // tardia
  await orden("APROBADA", "2026-10-06"); // vencida sin recibir: incumplida
  await orden("BORRADOR", "2026-10-06"); // no cuenta
});

const filtros = (cambios: Partial<FiltrosKpi> = {}): FiltrosKpi => ({ ...periodo, sucursalId: e.a.id, categoriaId: null, ...cambios });
const valores = async (f: FiltrosKpi) => {
  const r = await consultarKpis(f);
  return Object.fromEntries(Object.entries(r.kpis).map(([k, v]) => [k, v.valor]));
};

describe("PRU-I07: KPI-01 a KPI-08 con datos controlados (docs/06-KPI)", () => {
  it("sucursal A: coinciden con el cálculo a mano", async () => {
    const v = await valores(filtros());
    expect(v["KPI-01"]).toBe(27600); // 7600 + 9000 + 3000 + 8000
    expect(v["KPI-02"]).toBe(6900); // 27600 / 4 ventas
    expect(v["KPI-03"]).toBe(34.78); // (27600 - 18000) / 27600
    expect(v["KPI-04"]).toBe(25); // 1 de 4 inventarios en 0 (T-002)
    expect(v["KPI-05"]).toBe(3); // T-001 (66,7 dias), T-003 (83,3 dias) y T-004 (sin ventas); T-002 sin stock
    expect(v["KPI-06"]).toBe(33.33); // 1 a tiempo de 3 debidas
    expect(v["KPI-07"]).toBe(1); // solo el cliente 1 compro dos veces en A
    // Rotacion: costo vendido 18000 / inventario promedio ((231000 + 213000) / 2), al costo actual
    expect(v["KPI-08"]).toBeCloseTo(18000 / 222000, 2);
  });

  it("todas las sucursales: entra la venta de B y el cliente 2 pasa a ser recurrente", async () => {
    const v = await valores(filtros({ sucursalId: null }));
    expect(v["KPI-01"]).toBe(29100);
    expect(v["KPI-02"]).toBe(5820); // 29100 / 5
    expect(v["KPI-04"]).toBe(20); // 1 de 5 inventarios
    expect(v["KPI-07"]).toBe(2);
  });

  it("filtro por categoría 1 en A: solo T-001 y T-002", async () => {
    const v = await valores(filtros({ categoriaId: e.c1.id }));
    expect(v["KPI-01"]).toBe(18000); // 6000 + 9000 + 3000
    expect(v["KPI-03"]).toBe(33.33); // (18000 - 12000) / 18000
  });
});
