// PRU-I09 y PRU-I10 (docs/10-PRU seccion 3): agentes contra la base de datos con un modelo
// simulado (sin Gemini). Demanda de los ultimos 28 dias:
//   A, T-002: 14 unidades (0,5 por dia), stock 0 → agotado, prioridad ALTA,
//             objetivo min(20, max(3, techo(0,5 x 10))) = 5 → cantidad 5.
//   A, T-004: sin ventas, stock 1 (minimo 2) → prioridad BAJA, objetivo 3 → cantidad 2.
//   B, T-001: 56 unidades (2 por dia), stock 10 → cobertura 5 dias (< 3 + 7) → MEDIA,
//             objetivo min(50, max(3, 20)) = 20 → cantidad 10.
// El modelo simulado excluye T-004 en A, sube T-001 en B a ALTA, intenta bajar T-002 en A,
// inventa un candidato y propone una cantidad propia (que debe ignorarse).
import { beforeAll, describe, expect, it } from "vitest";
import { prisma } from "@/server/db";
import { servicioAgentes } from "@/server/servicios/agentes";
import { servicioRecomendaciones } from "@/server/servicios/recomendaciones";
import { hoyBogota, sumarDias } from "@/lib/fechas";
import { crearEscenario, error, limpiar, mediodia, ModeloCaido, ModeloSimulado, ventaHistorica, type Escenario } from "./datos";

let e: Escenario;
const hoy = hoyBogota();
type Decision = { candidatoId: string; incluir: boolean; prioridad: string; prioridadBase: string; cantidad: number };
const id = (p: { id: number }, s: { id: number }) => `P${p.id}-S${s.id}`;

beforeAll(async () => {
  await limpiar();
  e = await crearEscenario();
  await prisma.inventario.update({ where: { productoId_sucursalId: { productoId: e.p4.id, sucursalId: e.a.id } }, data: { stock: 1 } });
  const linea = (p: { id: number }, cantidad: number, precio: number, costo: number) => ({ productoId: p.id, cantidad, precio, costo });
  for (let d = 2; d <= 8; d++) {
    const fecha = mediodia(sumarDias(hoy, -d));
    await ventaHistorica({ sucursalId: e.a.id, cajeroId: e.cajeroA.id, fecha, items: [linea(e.p2, 2, 3000, 2000)] }); // 14 en total
    await ventaHistorica({ sucursalId: e.b.id, cajeroId: e.cajeroB.id, fecha, items: [linea(e.p1, 8, 1500, 1000)] }); // 56 en total
  }
});

const salidaInventario = () => ({
  resumen: "Hay un producto agotado en Prueba Norte y cobertura baja en Prueba Sur.",
  criterios: ["Agotados primero", "Proveedor con retrasos sube de prioridad"],
  items: [
    { candidatoId: id(e.p4, e.a), incluir: false, prioridad: "BAJA", justificacion: "Rotación nula; se revisará más adelante.", cantidad: 999 },
    { candidatoId: id(e.p1, e.b), incluir: true, prioridad: "ALTA", justificacion: "El proveedor entrega tarde.", cantidad: 999 },
    { candidatoId: id(e.p2, e.a), incluir: true, prioridad: "BAJA", justificacion: "Intento de bajar la prioridad." },
    { candidatoId: "P999999-S1", incluir: true, prioridad: "ALTA", justificacion: "Candidato inventado." },
  ],
  alertas: [{ titulo: "Contactar al Proveedor Prueba Uno", justificacion: "Varias órdenes próximas.", proveedor: "Proveedor Prueba Uno" }],
});

const modeloInventario = () => new ModeloSimulado({
  herramientas: () => [{ name: "calcularPropuestaReposicion", args: {} }, { name: "cumplimientoProveedores", args: {} }],
  json: salidaInventario,
});

const modeloInforme = () => new ModeloSimulado({
  herramientas: (disponibles) => disponibles.includes("calcularPropuestaReposicion")
    ? [{ name: "calcularPropuestaReposicion", args: {} }]
    : [{ name: "consultarKpis", args: {} }, { name: "obtenerResultadoAgenteInventario", args: {} }],
  json: (texto) => texto.includes("Candidatos calculados")
    ? salidaInventario()
    : {
        resumen: "Prueba Sur concentra la demanda de T-001.",
        hallazgos: [
          { titulo: "Ventas del periodo", detalle: "Total vendido.", kpiRelacionado: "KPI-01", valor: "$1" },
          { titulo: "Ventas por sucursal", detalle: "Prueba Sur vende más.", kpiRelacionado: "G-02", valor: "$1" },
        ],
        recomendaciones: [
          { tipo: "PROMOCION", prioridad: "ALTA", sku: "T-002", sucursal: "Prueba Norte", titulo: "Promocionar T-002", justificacion: "Alta demanda." },
          { tipo: "LIQUIDACION", prioridad: "MEDIA", sku: "T-003", titulo: "Liquidar T-003", justificacion: "Baja rotación." },
          { tipo: "REVISION_SUCURSAL", prioridad: "MEDIA", sucursal: "Prueba Sur", titulo: "Revisar Prueba Sur", justificacion: "Demanda alta." },
          { tipo: "PROMOCION", prioridad: "BAJA", sku: "NO-EXISTE", titulo: "Producto inventado", justificacion: "x" },
        ],
      },
  texto: "Resumen consolidado del modelo simulado.",
});

describe("Agentes con modelo simulado (docs/07-IAG secciones 5 a 7)", () => {
  it("si la IA falla, la ejecución queda FALLIDA con los candidatos y sin órdenes", async () => {
    const r = await servicioAgentes.ejecutarInventario({}, e.ctx.gerente, { modelo: new ModeloCaido() });
    expect(r.estado).toBe("FALLIDA");
    expect(r.error).toMatch(/saturado/);
    const res = r.resultado as { sinAnalisisIA: boolean; decisiones: Decision[] };
    expect(res.sinAnalisisIA).toBe(true);
    expect(res.decisiones.map((d) => d.candidatoId).sort()).toEqual([id(e.p1, e.b), id(e.p2, e.a), id(e.p4, e.a)].sort());
    expect(await prisma.ordenCompra.count()).toBe(0);
  });

  it("PRU-I09: las órdenes BORRADOR usan las cantidades del código y se ignoran candidatos inexistentes", async () => {
    const r = await servicioAgentes.ejecutarInventario({}, e.ctx.gerente, { modelo: modeloInventario() });
    expect(r.estado).toBe("COMPLETADA");
    const res = r.resultado as { decisiones: Decision[]; ignorados: string[] };
    const d = Object.fromEntries(res.decisiones.map((x) => [x.candidatoId, x]));
    expect(d[id(e.p2, e.a)]).toMatchObject({ incluir: true, prioridad: "ALTA", cantidad: 5 }); // no baja
    expect(d[id(e.p1, e.b)]).toMatchObject({ incluir: true, prioridadBase: "MEDIA", prioridad: "ALTA", cantidad: 10 });
    expect(d[id(e.p4, e.a)]).toMatchObject({ incluir: false, cantidad: 2 });
    expect(res.ignorados).toEqual(["P999999-S1"]);

    const ordenes = await prisma.ordenCompra.findMany({ where: { ejecucionAgenteId: r.id }, include: { detalles: true } });
    expect(ordenes).toHaveLength(2); // (proveedor 1, A) y (proveedor 1, B); T-004 excluido
    expect(ordenes.every((o) => o.estado === "BORRADOR" && o.origen === "AGENTE_INVENTARIO")).toBe(true);
    const lineas = ordenes.flatMap((o) => o.detalles.map((x) => `${x.productoId}-${o.sucursalId}:${x.cantidad}`)).sort();
    expect(lineas).toEqual([`${e.p1.id}-${e.b.id}:10`, `${e.p2.id}-${e.a.id}:5`].sort());
    expect(await prisma.recomendacion.count({ where: { ejecucionId: r.id, tipo: "OTRA" } })).toBe(1); // la alerta
  });

  it("lo que ya está en tránsito no se vuelve a proponer", async () => {
    const r = await servicioAgentes.ejecutarInventario({}, e.ctx.gerente, { modelo: modeloInventario() });
    expect(r.estado).toBe("COMPLETADA");
    const res = r.resultado as { decisiones: Decision[] };
    // Solo queda T-004 en A (excluido antes y sin orden): sigue siendo candidato.
    expect(res.decisiones.map((x) => x.candidatoId)).toEqual([id(e.p4, e.a)]);
  });

  it("PRU-I10: el informe ejecutivo liga el Agente 2 al Agente 1 y aplica la regla de coherencia", async () => {
    // Se anulan las ordenes anteriores para que el Agente 1 vuelva a tener candidatos.
    await prisma.detalleOrdenCompra.deleteMany();
    await prisma.ordenCompra.deleteMany();
    const r = await servicioAgentes.ejecutarInforme({ desde: sumarDias(hoy, -10), hasta: sumarDias(hoy, -1) }, e.ctx.gerente, { modelo: modeloInforme() });
    expect(r.estado).toBe("COMPLETADA");
    expect(r.resumen).toBe("Resumen consolidado del modelo simulado.");
    const [a1, a2] = r.hijas;
    expect(a1.agente).toBe("INVENTARIO");
    expect(a2.agente).toBe("COMERCIAL");
    const comercial = await servicioAgentes.obtener(a2.id);
    expect(comercial.ejecucionEntrada?.id).toBe(a1.id);
    expect(comercial.ejecucionPadre?.id).toBe(r.id);
    const res = comercial.resultado as { descartadas: { sku: string | null; motivo: string }[]; hallazgos: { kpiRelacionado: string; valorSistema: string | null }[] };
    expect(res.descartadas.map((x) => x.sku).sort()).toEqual(["NO-EXISTE", "T-002"]);
    expect(res.descartadas.find((x) => x.sku === "T-002")?.motivo).toMatch(/coherencia/);
    expect(res.hallazgos.find((h) => h.kpiRelacionado === "KPI-01")?.valorSistema).toBeTruthy();
    const tipos = comercial.recomendaciones.map((x) => x.tipo).sort();
    expect(tipos).toEqual(["LIQUIDACION", "REVISION_SUCURSAL"]);
    expect(comercial.recomendaciones.every((x) => x.estado === "PENDIENTE")).toBe(true);
  });

  it("RF-40: el gerente decide una sola vez; descartar exige comentario", async () => {
    const pendientes = await servicioRecomendaciones.listar(new URLSearchParams({ estado: "PENDIENTE" }));
    const [primera, segunda] = pendientes.datos;
    const aceptada = await servicioRecomendaciones.aceptar(primera.id, { comentario: "Se hará esta semana" }, e.ctx.gerente);
    expect(aceptada).toMatchObject({ estado: "ACEPTADA", decididaPor: "Gerente Prueba" });
    expect((await error(servicioRecomendaciones.descartar(primera.id, { comentario: "Cambio de opinión" }, e.ctx.gerente))).status).toBe(409);
    await expect(servicioRecomendaciones.descartar(segunda.id, {}, e.ctx.gerente)).rejects.toThrow();
    expect(await prisma.auditoria.count({ where: { accion: "RECOMENDACION_ACEPTADA", entidadId: primera.id } })).toBe(1);
  });
});
