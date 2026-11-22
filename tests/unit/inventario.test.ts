// PRU-U01 (RN-12) y validaciones de inventario (RN-11, RN-13).
import { describe, expect, it } from "vitest";
import { esquemaAjuste, esquemaUmbrales, estadoInventario } from "@/lib/esquemas/inventario";
import { accionesInventario } from "@/lib/permisos";

describe("Estado del inventario (RN-12)", () => {
  it("clasifica los cuatro estados y sus limites", () => {
    expect(estadoInventario(0, 10, 60)).toBe("AGOTADO");
    expect(estadoInventario(1, 10, 60)).toBe("BAJO_MINIMO");
    expect(estadoInventario(10, 10, 60)).toBe("BAJO_MINIMO");
    expect(estadoInventario(11, 10, 60)).toBe("NORMAL");
    expect(estadoInventario(60, 10, 60)).toBe("NORMAL");
    expect(estadoInventario(61, 10, 60)).toBe("SOBRESTOCK");
  });

  it("un minimo de 0 solo marca agotado cuando el stock es 0", () => {
    expect(estadoInventario(0, 0, 5)).toBe("AGOTADO");
    expect(estadoInventario(1, 0, 5)).toBe("NORMAL");
  });
});

describe("Umbrales (RN-13)", () => {
  it("acepta numeros de formulario y exige maximo mayor que minimo", () => {
    expect(esquemaUmbrales.parse({ stockMinimo: "5", stockMaximo: "20" })).toEqual({ stockMinimo: 5, stockMaximo: 20 });
    const r = esquemaUmbrales.safeParse({ stockMinimo: 20, stockMaximo: 20 });
    expect(r.success).toBe(false);
    expect(r.error?.issues[0].path).toEqual(["stockMaximo"]);
  });

  it("rechaza negativos, decimales y campos extra como el stock", () => {
    expect(esquemaUmbrales.safeParse({ stockMinimo: -1, stockMaximo: 5 }).success).toBe(false);
    expect(esquemaUmbrales.safeParse({ stockMinimo: 1.5, stockMaximo: 5 }).success).toBe(false);
    expect(esquemaUmbrales.safeParse({ stockMinimo: 1, stockMaximo: 5, stock: 100 }).success).toBe(false);
  });
});

describe("Ajustes (RN-11)", () => {
  it("exige motivo de al menos 5 caracteres y cantidad entera positiva", () => {
    expect(esquemaAjuste.safeParse({ tipo: "SALIDA", cantidad: "3", motivo: "Merma por daño" }).success).toBe(true);
    expect(esquemaAjuste.safeParse({ tipo: "SALIDA", cantidad: 3, motivo: "dañ" }).success).toBe(false);
    expect(esquemaAjuste.safeParse({ tipo: "SALIDA", cantidad: 0, motivo: "Merma por daño" }).success).toBe(false);
    expect(esquemaAjuste.safeParse({ tipo: "OTRO", cantidad: 1, motivo: "Merma por daño" }).success).toBe(false);
  });

  it("no permite enviar la sucursal ni el stock resultante desde el cliente", () => {
    expect(esquemaAjuste.safeParse({ tipo: "ENTRADA", cantidad: 1, motivo: "Conteo físico", sucursalId: 2 }).success).toBe(false);
  });
});

describe("Permisos de inventario (docs/03-NEG 4.1)", () => {
  it("solo bodega ajusta; admin y bodega cambian umbrales; el cajero solo consulta", () => {
    expect(accionesInventario("BODEGA")).toEqual({ umbrales: true, ajustar: true, kardex: true });
    expect(accionesInventario("ADMIN")).toEqual({ umbrales: true, ajustar: false, kardex: true });
    expect(accionesInventario("GERENTE")).toEqual({ umbrales: false, ajustar: false, kardex: true });
    expect(accionesInventario("CAJERO")).toEqual({ umbrales: false, ajustar: false, kardex: false });
  });
});
