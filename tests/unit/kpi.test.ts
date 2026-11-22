// PRU-U06: semaforos y reglas de interpretacion de los KPI (docs/06-KPI seccion 4),
// periodo anterior, filtros del dashboard y formato de los reportes CSV.
import { describe, expect, it } from "vitest";
import {
  calcularSemaforo, calcularVariacion, formatoKpi, formatoVariacion, interpretar, valorKpi, IDS_KPI,
  MAX_HALLAZGOS, type DatosInterpretacion, type IdKpi, type ValorKpi,
} from "@/lib/kpi";
import { diasDelPeriodo, esquemaPeriodo, periodoAnterior, periodoPorDefecto, periodoUltimosDias } from "@/lib/esquemas/kpi";
import { generarCsv } from "@/server/csv";
import { reportesPermitidos } from "@/lib/permisos";

describe("Variacion frente al periodo anterior", () => {
  it("es relativa en ventas y en puntos porcentuales en margen y cumplimiento", () => {
    expect(calcularVariacion("KPI-01", 110, 100)).toBe(10);
    expect(calcularVariacion("KPI-02", 95, 100)).toBe(-5);
    expect(calcularVariacion("KPI-03", 25.5, 24)).toBe(1.5);
    expect(calcularVariacion("KPI-06", 80, 90)).toBe(-10);
  });

  it("no se calcula sin periodo comparable ni para las fotos actuales", () => {
    expect(calcularVariacion("KPI-01", 100, 0)).toBeNull();
    expect(calcularVariacion("KPI-01", 100, null)).toBeNull();
    expect(calcularVariacion("KPI-04", 5, 3)).toBeNull();
    expect(calcularVariacion("KPI-05", 4, 2)).toBeNull();
  });
});

describe("Semaforos (PRU-U06)", () => {
  it("ventas y ticket: verde >= 0 %, amarillo hasta -5 %, rojo por debajo", () => {
    expect(calcularSemaforo("KPI-01", 1, 0)).toBe("verde");
    expect(calcularSemaforo("KPI-01", 1, -5)).toBe("amarillo");
    expect(calcularSemaforo("KPI-02", 1, -5.01)).toBe("rojo");
    expect(calcularSemaforo("KPI-01", 1, null)).toBe("sin-dato");
  });

  it("clientes recurrentes y rotacion: amarillo hasta -10 %", () => {
    expect(calcularSemaforo("KPI-07", 1, -10)).toBe("amarillo");
    expect(calcularSemaforo("KPI-08", 1, -10.5)).toBe("rojo");
    expect(calcularSemaforo("KPI-08", 1, 3)).toBe("verde");
  });

  it("margen, agotamiento, baja rotacion y cumplimiento por umbrales y en sus limites", () => {
    expect([22, 21.99, 15, 14.99].map((v) => calcularSemaforo("KPI-03", v, null))).toEqual(["verde", "amarillo", "amarillo", "rojo"]);
    expect([2.99, 3, 8, 8.01].map((v) => calcularSemaforo("KPI-04", v, null))).toEqual(["verde", "amarillo", "amarillo", "rojo"]);
    expect([5, 6, 10, 11].map((v) => calcularSemaforo("KPI-05", v, null))).toEqual(["verde", "amarillo", "amarillo", "rojo"]);
    expect([90, 89.9, 75, 74.9].map((v) => calcularSemaforo("KPI-06", v, null))).toEqual(["verde", "amarillo", "amarillo", "rojo"]);
    expect(calcularSemaforo("KPI-06", null, null)).toBe("sin-dato");
  });

  it("formatea valores y variaciones segun la unidad", () => {
    expect(formatoKpi("KPI-03", 25.63)).toMatch(/^25,6\s%$/);
    expect(formatoKpi("KPI-08", 1.825)).toBe("1,83 veces");
    expect(formatoVariacion("KPI-01", -2.69)).toMatch(/^−2,7\s%$/);
    expect(formatoVariacion("KPI-03", 0.11)).toBe("+0,1 pp");
    expect(formatoVariacion("KPI-04", null)).toBe("Situación actual");
  });
});

function datos(cambios: Partial<Record<IdKpi, [number | null, number | null]>> = {}): DatosInterpretacion {
  const base: Record<IdKpi, [number | null, number | null]> = {
    "KPI-01": [1000, 1000], "KPI-02": [100, 100], "KPI-03": [25, 25], "KPI-04": [1, null],
    "KPI-05": [0, null], "KPI-06": [95, 95], "KPI-07": [10, 10], "KPI-08": [2, 2], ...cambios,
  };
  const kpis = Object.fromEntries(IDS_KPI.map((id) => [id, valorKpi(id, base[id][0], base[id][1])])) as Record<IdKpi, ValorKpi>;
  return {
    kpis,
    sucursales: [{ nombre: "Ceiba Bello", ventas: 100 }, { nombre: "Ceiba Envigado", ventas: 600 }, { nombre: "Ceiba Centro", ventas: 300 }],
    agotadosPorSucursal: [{ nombre: "Ceiba Centro", agotados: 1 }, { nombre: "Ceiba Bello", agotados: 4 }],
    proveedorMasTardio: { nombre: "Distribuidora Andina", tardias: 9, debidas: 20 },
    bajaRotacion: { productos: 0, valorInmovilizado: 0 },
    categoriaMenorMargen: { nombre: "Aseo del hogar", margen: 12.5 },
    clientes: { recurrentes: 0, identificados: 0 },
  };
}

describe("Interpretacion automatica por reglas (PRU-U06)", () => {
  it("IR-01 siempre aparece con la sucursal de mayor y menor venta", () => {
    const h = interpretar(datos({ "KPI-01": [900, 1000] }));
    expect(h.map((x) => x.regla)).toEqual(["IR-01"]);
    expect(h[0].texto).toContain("bajaron 10 %");
    expect(h[0].texto).toContain("Ceiba Envigado");
    expect(h[0].texto).toContain("Ceiba Bello");
    expect(h[0].semaforo).toBe("rojo");
  });

  it("IR-02, IR-03 e IR-05 solo aparecen con su KPI en amarillo o rojo", () => {
    const verde = interpretar(datos());
    expect(verde.map((x) => x.regla)).toEqual(["IR-01"]);
    const alerta = interpretar(datos({ "KPI-04": [9, null], "KPI-06": [60, 80], "KPI-03": [14, 20] }));
    expect(alerta.map((x) => x.regla)).toEqual(["IR-01", "IR-02", "IR-03", "IR-05"]);
    expect(alerta[1].texto).toContain("se concentran en Ceiba Bello (4)");
    expect(alerta[2].texto).toContain("Distribuidora Andina");
    expect(alerta[3].texto).toContain("Aseo del hogar");
  });

  it("IR-04 e IR-06 dependen de que haya productos de baja rotacion y clientes identificados", () => {
    const d = datos();
    d.bajaRotacion = { productos: 3, valorInmovilizado: 1_500_000 };
    d.clientes = { recurrentes: 25, identificados: 100 };
    const h = interpretar(d);
    expect(h.map((x) => x.regla)).toEqual(["IR-01", "IR-04", "IR-06"]);
    expect(h[2].texto).toMatch(/25,0\s%/);
  });

  it("muestra como maximo cinco hallazgos", () => {
    const d = datos({ "KPI-04": [9, null], "KPI-06": [60, 80], "KPI-03": [14, 20] });
    d.bajaRotacion = { productos: 3, valorInmovilizado: 1 };
    d.clientes = { recurrentes: 1, identificados: 2 };
    expect(interpretar(d)).toHaveLength(MAX_HALLAZGOS);
  });
});

describe("Periodo del dashboard", () => {
  it("por defecto son los ultimos 30 dias completos (hasta ayer) y el anterior tiene la misma duracion", () => {
    expect(periodoPorDefecto("2026-11-22")).toEqual({ desde: "2026-10-23", hasta: "2026-11-21" });
    expect(periodoUltimosDias(7, "2026-11-22")).toEqual({ desde: "2026-11-15", hasta: "2026-11-21" });
    expect(periodoAnterior({ desde: "2026-10-24", hasta: "2026-11-22" })).toEqual({ desde: "2026-09-24", hasta: "2026-10-23" });
    expect(diasDelPeriodo({ desde: "2026-11-22", hasta: "2026-11-22" })).toBe(1);
  });

  it("rechaza periodos invertidos o de mas de un anio", () => {
    expect(esquemaPeriodo.safeParse({ desde: "2026-11-22", hasta: "2026-11-01" }).success).toBe(false);
    expect(esquemaPeriodo.safeParse({ desde: "2025-01-01", hasta: "2026-11-22" }).success).toBe(false);
    expect(esquemaPeriodo.safeParse({ desde: "2026-01-01", hasta: "2026-11-22" }).success).toBe(true);
  });
});

describe("Reportes CSV (RF-30)", () => {
  it("usa punto y coma, coma decimal, BOM y escapa comillas y separadores", () => {
    const csv = generarCsv([{ titulo: "Nombre", valor: (f: { n: string; v: number }) => f.n }, { titulo: "Valor", valor: (f) => f.v }],
      [{ n: 'Queso "campesino"; 500 g', v: 12.5 }]);
    expect(csv.startsWith("﻿Nombre;Valor\r\n")).toBe(true);
    expect(csv).toContain('"Queso ""campesino""; 500 g";12,5');
  });

  it("neutraliza formulas al abrir el archivo en una hoja de calculo", () => {
    const csv = generarCsv([{ titulo: "Cliente", valor: (f: { n: string }) => f.n }], [{ n: "=HYPERLINK(\"x\")" }]);
    expect(csv).toContain("'=HYPERLINK");
  });

  it("bodega solo descarga el inventario critico", () => {
    expect(reportesPermitidos("BODEGA")).toEqual({ ventas: false, inventario: true, proveedores: false });
    expect(reportesPermitidos("GERENTE")).toEqual({ ventas: true, inventario: true, proveedores: true });
  });
});
