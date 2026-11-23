// Agentes de IA (docs/10-PRU PRU-U07): calculo de reposicion en codigo, aplicacion de las
// decisiones del modelo, agrupacion en ordenes, regla de coherencia entre agentes y
// validacion de las salidas con Zod.
import { describe, expect, it } from "vitest";
import {
  agruparOrdenes, aplicarCoherencia, aplicarDecisiones, calcularCandidatos, evaluarReposicion, extraerJson,
  MOTIVO_COHERENCIA, observacionesOrden, type FilaReposicion,
} from "@/lib/agentes";
import {
  esquemaDescartarRecomendacion, esquemaEntradaComercial, esquemaEntradaInventario, esquemaSalidaComercial, esquemaSalidaInventario,
} from "@/lib/esquemas/agentes";
import { herramientasParaRol } from "@/server/ia/herramientas";
import { candidatoParaModelo, herramientasAgenteComercial, herramientasAgenteInventario } from "@/server/ia/herramientas-agentes";
import { esquemaParaModelo, resumenPlantilla } from "@/server/servicios/agentes";

const fila = (cambios: Partial<FilaReposicion> = {}): FilaReposicion => ({
  productoId: 1, sku: "ABA-001", producto: "Arroz", categoria: "Abarrotes", sucursalId: 10, sucursal: "Ceiba Centro",
  proveedorId: 5, proveedor: "Distribuidora", tiempoEntregaDias: 4, costo: 3000,
  stock: 10, stockMinimo: 12, stockMaximo: 60, ventaDiaria: 2, enTransito: 0, ...cambios,
});

describe("Cálculo de reposición (docs/07-IAG 5.2)", () => {
  it("aplica la fórmula del stock objetivo y la cantidad sugerida", () => {
    // v = 2, L = 4, S = 7: objetivo = min(60, max(13, ceil(2 * 11))) = 22; cantidad = 22 - 10 - 0 = 12
    const c = evaluarReposicion(fila())!;
    expect(c.stockObjetivo).toBe(22);
    expect(c.cantidadSugerida).toBe(12);
    expect(c.coberturaDias).toBe(5);
    expect(c.motivo).toBe("BAJO_MINIMO");
    expect(c.prioridadBase).toBe("MEDIA"); // cobertura 5 >= L (4) pero < L + S (11)
    expect(c.candidatoId).toBe("P1-S10");
  });

  it("prioridad ALTA si está agotado o la cobertura es menor que el tiempo de entrega", () => {
    expect(evaluarReposicion(fila({ stock: 0 }))!.prioridadBase).toBe("ALTA");
    expect(evaluarReposicion(fila({ stock: 6 }))!.prioridadBase).toBe("ALTA"); // cobertura 3 < 4
    expect(evaluarReposicion(fila({ stock: 0 }))!.motivo).toBe("AGOTADO");
  });

  it("prioridad BAJA si está bajo el mínimo pero sin ventas (cobertura infinita)", () => {
    const c = evaluarReposicion(fila({ ventaDiaria: 0, stock: 5, stockMinimo: 8 }))!;
    expect(c.coberturaDias).toBeNull();
    expect(c.prioridadBase).toBe("BAJA");
    expect(c.stockObjetivo).toBe(9); // minimo + 1
    expect(c.cantidadSugerida).toBe(4);
  });

  it("descuenta lo que está en tránsito y no propone si ya está cubierto", () => {
    expect(evaluarReposicion(fila({ enTransito: 5 }))!.cantidadSugerida).toBe(7);
    expect(evaluarReposicion(fila({ enTransito: 12 }))).toBeNull();
  });

  it("no es candidato con stock suficiente y el objetivo no supera el máximo", () => {
    expect(evaluarReposicion(fila({ stock: 40 }))).toBeNull();
    expect(evaluarReposicion(fila({ ventaDiaria: 20, stock: 0, stockMaximo: 50 }))!.stockObjetivo).toBe(50);
  });

  it("el redondeo binario no infla la cantidad", () => {
    // 0.3 * 10 = 3.0000000000000004 en binario: debe dar 3, no 4
    const c = evaluarReposicion(fila({ ventaDiaria: 0.3, tiempoEntregaDias: 3, stock: 0, stockMinimo: 1 }))!;
    expect(c.stockObjetivo).toBe(3);
  });

  it("ordena por prioridad y luego por menor cobertura", () => {
    const lista = calcularCandidatos([
      fila({ productoId: 1, stock: 10 }), // MEDIA, cobertura 5
      fila({ productoId: 2, stock: 0 }), // ALTA, cobertura 0
      fila({ productoId: 3, stock: 6 }), // ALTA, cobertura 3
    ]);
    expect(lista.map((c) => c.productoId)).toEqual([2, 3, 1]);
  });
});

describe("Decisiones del modelo sobre los candidatos (docs/07-IAG 5.4)", () => {
  const candidatos = calcularCandidatos([
    fila({ productoId: 1, stock: 10 }), // MEDIA
    fila({ productoId: 2, stock: 0 }), // ALTA
    fila({ productoId: 3, stock: 9, proveedorId: 6, proveedor: "Lácteos" }), // MEDIA
  ]);

  it("ignora candidatos inexistentes, permite excluir y solo deja subir la prioridad", () => {
    const { decisiones, ignorados } = aplicarDecisiones(candidatos, [
      { candidatoId: "P1-S10", incluir: true, prioridad: "ALTA", justificacion: "Proveedor impuntual." },
      { candidatoId: "P2-S10", incluir: true, prioridad: "BAJA", justificacion: "Intento de bajar." },
      { candidatoId: "P3-S10", incluir: false, prioridad: "MEDIA", justificacion: "Orden aprobada en camino." },
      { candidatoId: "P99-S10", incluir: true, prioridad: "ALTA", justificacion: "Inventado." },
    ]);
    const porId = Object.fromEntries(decisiones.map((d) => [d.candidatoId, d]));
    expect(ignorados).toEqual(["P99-S10"]);
    expect(decisiones).toHaveLength(3);
    expect(porId["P1-S10"].prioridad).toBe("ALTA");
    expect(porId["P1-S10"].ajustadaPorIA).toBe(true);
    expect(porId["P2-S10"].prioridad).toBe("ALTA");
    expect(porId["P2-S10"].ajustadaPorIA).toBe(false);
    expect(porId["P3-S10"].incluir).toBe(false);
    // Las cantidades nunca cambian
    expect(decisiones.map((d) => d.cantidadSugerida)).toEqual(candidatos.map((c) => c.cantidadSugerida));
  });

  it("un candidato que el modelo no menciona se incluye con su prioridad base", () => {
    const { decisiones } = aplicarDecisiones(candidatos, []);
    expect(decisiones.every((d) => d.incluir && d.prioridad === d.prioridadBase && !d.ajustadaPorIA)).toBe(true);
    expect(decisiones[0].justificacion).toMatch(/stock 0/);
  });

  it("agrupa una orden por proveedor y sucursal, sin los excluidos", () => {
    const { decisiones } = aplicarDecisiones(candidatos, [{ candidatoId: "P3-S10", incluir: false, prioridad: "MEDIA", justificacion: "x" }]);
    const grupos = agruparOrdenes(decisiones);
    expect(grupos).toHaveLength(1);
    expect(grupos[0].items.map((i) => i.productoId).sort()).toEqual([1, 2]);
    expect(grupos[0].prioridad).toBe("ALTA");
    const obs = observacionesOrden(grupos[0], 42);
    expect(obs).toMatch(/ejecución #42/);
    expect(obs.length).toBeLessThanOrEqual(500);
  });
});

describe("Regla de coherencia entre agentes (docs/07-IAG 6.4)", () => {
  const rec = (tipo: "PROMOCION" | "LIQUIDACION" | "REVISION_SUCURSAL", productoId: number | null, sucursalId: number | null) => ({
    tipo, prioridad: "MEDIA" as const, productoId, sucursalId, titulo: "t", justificacion: "j",
  });
  const enRiesgo = [{ productoId: 1, sucursalId: 10 }];

  it("descarta la promoción o liquidación de un producto en riesgo", () => {
    const { validas, descartadas } = aplicarCoherencia([
      rec("PROMOCION", 1, null), rec("LIQUIDACION", 1, 10), rec("PROMOCION", 2, null), rec("REVISION_SUCURSAL", null, 10),
    ], enRiesgo);
    expect(descartadas).toHaveLength(2);
    expect(descartadas[0].motivo).toBe(MOTIVO_COHERENCIA);
    expect(validas.map((v) => v.tipo)).toEqual(["PROMOCION", "REVISION_SUCURSAL"]);
  });

  it("con sucursal indicada compara el par producto-sucursal", () => {
    expect(aplicarCoherencia([rec("PROMOCION", 1, 11)], enRiesgo).validas).toHaveLength(1);
  });
});

describe("Salidas del modelo validadas con Zod", () => {
  const inventario = {
    resumen: "Resumen", criterios: ["Agotados primero"],
    items: [{ candidatoId: "P1-S10", incluir: false, prioridad: "ALTA", justificacion: "x" }],
    alertas: [{ titulo: "Proveedor impuntual", justificacion: "Retrasos." }],
  };

  it("acepta una salida válida y recorta textos largos en lugar de fallar", () => {
    const r = esquemaSalidaInventario.parse({ ...inventario, resumen: "a".repeat(2000) });
    expect(r.resumen.length).toBe(1500);
    expect(r.resumen.endsWith("…")).toBe(true);
  });

  it("recorta las listas largas y los textos opcionales en lugar de rechazar la salida (DEF-07)", () => {
    const hallazgo = { titulo: "t", detalle: "d", kpiRelacionado: "KPI-01", valor: "1" };
    const rec = { tipo: "OTRA", prioridad: "BAJA", sku: "  ", sucursal: "x".repeat(100), titulo: "t", justificacion: "j" };
    const r = esquemaSalidaComercial.parse({ resumen: "r", hallazgos: Array(11).fill(hallazgo), recomendaciones: Array(10).fill(rec) });
    expect(r.hallazgos).toHaveLength(8);
    expect(r.recomendaciones).toHaveLength(8);
    expect(r.recomendaciones[0].sku).toBeUndefined();
    expect(r.recomendaciones[0].sucursal).toHaveLength(60);
    const inv = esquemaSalidaInventario.parse({ ...inventario, criterios: Array(12).fill("c"), alertas: Array(9).fill(inventario.alertas[0]) });
    expect(inv.criterios).toHaveLength(8);
    expect(inv.alertas).toHaveLength(6);
  });

  it("rechaza prioridades o referencias del dashboard que no existen", () => {
    expect(esquemaSalidaInventario.safeParse({ ...inventario, items: [{ ...inventario.items[0], prioridad: "URGENTE" }] }).success).toBe(false);
    const comercial = {
      resumen: "r", hallazgos: [{ titulo: "t", detalle: "d", kpiRelacionado: "KPI-09", valor: "1" }], recomendaciones: [],
    };
    expect(esquemaSalidaComercial.safeParse(comercial).success).toBe(false);
    expect(esquemaSalidaComercial.safeParse({ ...comercial, hallazgos: [{ ...comercial.hallazgos[0], kpiRelacionado: "G-02" }] }).success).toBe(true);
  });

  it("el esquema enviado al modelo no lleva límites de longitud ni de cantidad", () => {
    const texto = JSON.stringify([esquemaParaModelo(esquemaSalidaInventario), esquemaParaModelo(esquemaSalidaComercial)]);
    for (const clave of ["maxItems", "minItems", "maxLength", "minLength", "additionalProperties", "$schema"]) {
      expect(texto).not.toContain(`"${clave}"`);
    }
    expect(texto).toContain('"enum"');
  });

  it("extrae el JSON aunque venga entre bloques de código", () => {
    expect(extraerJson("```json\n{\"a\":1}\n```")).toEqual({ a: 1 });
    expect(() => extraerJson("no es json")).toThrow();
  });
});

describe("Entradas de la API y herramientas de los agentes", () => {
  it("valida las entradas de forma estricta", () => {
    expect(esquemaEntradaInventario.safeParse({ sucursalId: 3 }).success).toBe(true);
    expect(esquemaEntradaInventario.safeParse({ sucursalId: 3, rol: "ADMIN" }).success).toBe(false);
    expect(esquemaEntradaComercial.safeParse({ desde: "2026-11-10", hasta: "2026-11-01" }).success).toBe(false);
    expect(esquemaDescartarRecomendacion.safeParse({ comentario: "no" }).success).toBe(false);
  });

  it("las herramientas de los agentes no se ofrecen en el chatbot y no envían ids internos", () => {
    const [candidato] = calcularCandidatos([fila({ stock: 0 })]);
    const a1 = herramientasAgenteInventario([candidato], "Ceiba Centro", 7).map((h) => h.nombre);
    const a2 = herramientasAgenteComercial(1).map((h) => h.nombre);
    expect(a1).toContain("calcularPropuestaReposicion");
    expect(a2).toContain("obtenerResultadoAgenteInventario");
    for (const rol of ["ADMIN", "GERENTE", "BODEGA", "CAJERO"] as const) {
      const chat = herramientasParaRol(rol).map((h) => h.nombre);
      expect(chat).not.toContain("calcularPropuestaReposicion");
      expect(chat).not.toContain("obtenerResultadoAgenteInventario");
    }
    const vista = candidatoParaModelo(candidato);
    expect(vista).not.toHaveProperty("productoId");
    expect(vista).not.toHaveProperty("proveedorId");
    expect(vista.cantidadSugerida).toBe(candidato.cantidadSugerida);
  });

  it("la herramienta de propuesta devuelve exactamente los candidatos del código", async () => {
    const candidatos = calcularCandidatos([fila({ stock: 0 }), fila({ productoId: 2, sucursalId: 11, sucursal: "Ceiba Bello", stock: 0 })]);
    const [propuesta] = herramientasAgenteInventario(candidatos, "Todas las sucursales", 7);
    const ctx = { sesion: { usuarioId: 1, nombre: "G", rol: "GERENTE", sucursalId: null, sucursalNombre: null }, ip: null } as never;
    const todos = await propuesta.ejecutar({}, ctx);
    const bello = await propuesta.ejecutar({ sucursal: "bello" }, ctx);
    expect((todos.datos as { total: number }).total).toBe(2);
    expect((bello.datos as { candidatos: { candidatoId: string }[] }).candidatos.map((c) => c.candidatoId)).toEqual(["P2-S11"]);
  });

  it("el informe ejecutivo tiene una plantilla determinista si la IA no responde", () => {
    const t = resumenPlantilla({ resumen: "Hay agotados.", ordenes: 3 }, { resumen: "Bello vende menos.", recomendaciones: 2 });
    expect(t).toMatch(/3 órdenes de compra en borrador/);
    expect(t).toMatch(/2 recomendaciones pendientes/);
    expect(resumenPlantilla({ resumen: null, ordenes: 0 }, null)).toMatch(/no se completó/);
  });
});
