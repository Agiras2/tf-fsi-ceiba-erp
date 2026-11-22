// PRU-U03 (RN-07), PRU-U04 (RN-03, RN-05), calculos de totales, fechas de Bogota
// y permisos de ventas y compras (PRU-U08).
import { describe, expect, it } from "vitest";
import {
  calcularTotales, esquemaAnulacion, esquemaFiltrosVentas, esquemaVenta,
} from "@/lib/esquemas/ventas";
import {
  entregaATiempo, esquemaCancelacionOrden, esquemaOrdenCompra, esquemaOrdenCompraEdicion, esquemaSinDatos,
  ESTADOS_ORDEN, estadosOrigen, transicionValida, type EstadoOrden,
} from "@/lib/esquemas/compras";
import { esFechaValida, hoyBogota, inicioDiaBogota, rangoBogota, sumarDias } from "@/lib/fechas";
import { accionesCompras, accionesVentas } from "@/lib/permisos";

const ventaValida = { medioPago: "EFECTIVO", items: [{ productoId: 1, cantidad: 2 }] };

describe("Esquema de venta (PRU-U04, RN-03, RN-05)", () => {
  it("acepta una venta con cliente opcional y cantidades de formulario", () => {
    expect(esquemaVenta.safeParse(ventaValida).success).toBe(true);
    const r = esquemaVenta.parse({ clienteId: "7", medioPago: "TARJETA_DEBITO", items: [{ productoId: "3", cantidad: "4" }] });
    expect(r).toEqual({ clienteId: 7, medioPago: "TARJETA_DEBITO", items: [{ productoId: 3, cantidad: 4 }] });
  });

  it("rechaza precios, totales y la sucursal enviados por el cliente", () => {
    expect(esquemaVenta.safeParse({ ...ventaValida, total: 1 }).success).toBe(false);
    expect(esquemaVenta.safeParse({ ...ventaValida, sucursalId: 2 }).success).toBe(false);
    expect(esquemaVenta.safeParse({ medioPago: "EFECTIVO", items: [{ productoId: 1, cantidad: 1, precioUnitario: 10 }] }).success).toBe(false);
    expect(esquemaVenta.safeParse({ medioPago: "EFECTIVO", items: [{ productoId: 1, cantidad: 1, subtotal: 10 }] }).success).toBe(false);
  });

  it("rechaza cantidades cero, negativas o decimales y una venta sin productos", () => {
    for (const cantidad of [0, -1, 1.5]) {
      expect(esquemaVenta.safeParse({ medioPago: "EFECTIVO", items: [{ productoId: 1, cantidad }] }).success).toBe(false);
    }
    expect(esquemaVenta.safeParse({ medioPago: "EFECTIVO", items: [] }).success).toBe(false);
    expect(esquemaVenta.safeParse({ medioPago: "CHEQUE", items: [{ productoId: 1, cantidad: 1 }] }).success).toBe(false);
  });

  it("rechaza un producto repetido e indica la linea", () => {
    const r = esquemaVenta.safeParse({ medioPago: "EFECTIVO", items: [{ productoId: 1, cantidad: 1 }, { productoId: 1, cantidad: 2 }] });
    expect(r.success).toBe(false);
    expect(r.error?.issues[0].path).toEqual(["items", 1, "productoId"]);
  });

  it("la anulacion exige motivo de al menos 5 caracteres", () => {
    expect(esquemaAnulacion.safeParse({ motivo: "Error de digitación" }).success).toBe(true);
    expect(esquemaAnulacion.safeParse({ motivo: "mal" }).success).toBe(false);
    expect(esquemaAnulacion.safeParse({}).success).toBe(false);
  });

  it("los filtros validan fechas reales y su orden", () => {
    expect(esquemaFiltrosVentas.safeParse({ desde: "2026-11-01", hasta: "2026-11-22" }).success).toBe(true);
    expect(esquemaFiltrosVentas.safeParse({ desde: "2026-11-22", hasta: "2026-11-01" }).success).toBe(false);
    expect(esquemaFiltrosVentas.safeParse({ desde: "2026-02-30" }).success).toBe(false);
    expect(esquemaFiltrosVentas.safeParse({ desde: "1' OR '1'='1" }).success).toBe(false);
  });
});

describe("Calculo de totales en el servidor (RN-03)", () => {
  it("suma en centavos sin errores de coma flotante", () => {
    const r = calcularTotales([{ cantidad: 3, precio: 0.1 }, { cantidad: 1, precio: 0.2 }]);
    expect(r.subtotales).toEqual([0.3, 0.2]);
    expect(r.total).toBe(0.5);
  });

  it("calcula una venta tipica en pesos", () => {
    const r = calcularTotales([{ cantidad: 2, precio: 4900 }, { cantidad: 1, precio: 12500 }]);
    expect(r).toEqual({ subtotales: [9800, 12500], total: 22300 });
  });
});

describe("Transiciones de la orden de compra (PRU-U03, RN-07)", () => {
  const validas: [EstadoOrden, EstadoOrden][] = [
    ["BORRADOR", "APROBADA"], ["BORRADOR", "CANCELADA"], ["APROBADA", "RECIBIDA"], ["APROBADA", "CANCELADA"],
  ];

  it("permite exactamente las cuatro transiciones de RN-07", () => {
    for (const desde of ESTADOS_ORDEN) {
      for (const hacia of ESTADOS_ORDEN) {
        const esperada = validas.some(([d, h]) => d === desde && h === hacia);
        expect(transicionValida(desde, hacia), `${desde} -> ${hacia}`).toBe(esperada);
      }
    }
  });

  it("no se puede recibir un borrador ni reabrir una orden cerrada", () => {
    expect(transicionValida("BORRADOR", "RECIBIDA")).toBe(false);
    expect(transicionValida("RECIBIDA", "CANCELADA")).toBe(false);
    expect(transicionValida("CANCELADA", "BORRADOR")).toBe(false);
    expect(estadosOrigen("CANCELADA")).toEqual(["BORRADOR", "APROBADA"]);
    expect(estadosOrigen("RECIBIDA")).toEqual(["APROBADA"]);
  });

  it("la entrega es a tiempo si se recibe en la fecha esperada o antes (RN-08)", () => {
    expect(entregaATiempo("2026-11-20", "2026-11-19")).toBe(true);
    expect(entregaATiempo("2026-11-20", "2026-11-20")).toBe(true);
    expect(entregaATiempo("2026-11-20", "2026-11-21")).toBe(false);
  });
});

describe("Esquemas de la orden de compra (RF-19 a RF-21)", () => {
  const orden = { proveedorId: 1, fechaEsperada: "2026-12-01", items: [{ productoId: 5, cantidad: 24 }] };

  it("acepta un borrador y rechaza costos, sucursal, estado u origen enviados por el cliente", () => {
    expect(esquemaOrdenCompra.safeParse(orden).success).toBe(true);
    expect(esquemaOrdenCompra.safeParse({ ...orden, sucursalId: 2 }).success).toBe(false);
    expect(esquemaOrdenCompra.safeParse({ ...orden, estado: "APROBADA" }).success).toBe(false);
    expect(esquemaOrdenCompra.safeParse({ ...orden, origen: "AGENTE_INVENTARIO" }).success).toBe(false);
    expect(esquemaOrdenCompra.safeParse({ ...orden, items: [{ productoId: 5, cantidad: 2, costoUnitario: 1 }] }).success).toBe(false);
  });

  it("rechaza productos repetidos, cantidades no positivas y fechas imposibles", () => {
    expect(esquemaOrdenCompra.safeParse({ ...orden, items: [{ productoId: 5, cantidad: 1 }, { productoId: 5, cantidad: 1 }] }).success).toBe(false);
    expect(esquemaOrdenCompra.safeParse({ ...orden, items: [{ productoId: 5, cantidad: 0 }] }).success).toBe(false);
    expect(esquemaOrdenCompra.safeParse({ ...orden, fechaEsperada: "2026-13-01" }).success).toBe(false);
  });

  it("la edicion no permite cambiar el proveedor y exige al menos un cambio", () => {
    expect(esquemaOrdenCompraEdicion.safeParse({ fechaEsperada: "2026-12-05" }).success).toBe(true);
    expect(esquemaOrdenCompraEdicion.safeParse({ proveedorId: 2 }).success).toBe(false);
    expect(esquemaOrdenCompraEdicion.safeParse({}).success).toBe(false);
  });

  it("cancelar exige motivo; aprobar y recibir no aceptan datos", () => {
    expect(esquemaCancelacionOrden.safeParse({ motivo: "Proveedor sin existencias" }).success).toBe(true);
    expect(esquemaCancelacionOrden.safeParse({ motivo: "" }).success).toBe(false);
    expect(esquemaSinDatos.safeParse({}).success).toBe(true);
    expect(esquemaSinDatos.safeParse({ fechaRecepcion: "2026-01-01" }).success).toBe(false);
  });
});

describe("Fechas en hora de Bogota", () => {
  it("las 11 p. m. del 21 en Bogota siguen siendo el dia 21", () => {
    expect(hoyBogota(new Date("2026-11-22T04:00:00Z"))).toBe("2026-11-21");
    expect(hoyBogota(new Date("2026-11-22T05:00:00Z"))).toBe("2026-11-22");
  });

  it("el rango de un dia va de medianoche a medianoche de Bogota", () => {
    expect(inicioDiaBogota("2026-11-22").toISOString()).toBe("2026-11-22T05:00:00.000Z");
    const r = rangoBogota("2026-11-01", "2026-11-30");
    expect(r.gte?.toISOString()).toBe("2026-11-01T05:00:00.000Z");
    expect(r.lt?.toISOString()).toBe("2026-12-01T05:00:00.000Z");
    expect(sumarDias("2026-12-31", 1)).toBe("2027-01-01");
    expect(esFechaValida("2028-02-29")).toBe(true);
    expect(esFechaValida("2027-02-29")).toBe(false);
  });
});

describe("Permisos de ventas y compras (PRU-U08, docs/03-NEG 4.1)", () => {
  it("solo el cajero registra y solo el gerente anula; el cajero no ve costos", () => {
    expect(accionesVentas("CAJERO")).toEqual({ registrar: true, anular: false, verCostos: false });
    expect(accionesVentas("GERENTE")).toEqual({ registrar: false, anular: true, verCostos: true });
    expect(accionesVentas("ADMIN")).toEqual({ registrar: false, anular: false, verCostos: true });
  });

  it("bodega crea y recibe; el gerente aprueba y cancela; el administrador solo consulta", () => {
    expect(accionesCompras("BODEGA")).toEqual({ crear: true, editar: true, aprobar: false, cancelar: false, recibir: true });
    expect(accionesCompras("GERENTE")).toEqual({ crear: false, editar: true, aprobar: true, cancelar: true, recibir: false });
    expect(accionesCompras("ADMIN")).toEqual({ crear: false, editar: false, aprobar: false, cancelar: false, recibir: false });
    expect(accionesCompras("CAJERO")).toEqual({ crear: false, editar: false, aprobar: false, cancelar: false, recibir: false });
  });
});
