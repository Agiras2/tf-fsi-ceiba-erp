"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Bot, Download, Loader2, RotateCcw, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { InsigniaSemaforo } from "@/components/comun/semaforo";
import { api, ErrorCliente } from "@/lib/api-cliente";
import { descargarArchivo } from "@/lib/descargar";
import { formatoCOP, formatoDia, formatoNumero, formatoPct } from "@/lib/formato";
import { hoyBogota } from "@/lib/fechas";
import type { Pagina } from "@/lib/esquemas/comunes";
import { periodoPorDefecto, periodoUltimosDias } from "@/lib/esquemas/kpi";
import { IDS_KPI, KPIS, type IdKpi } from "@/lib/kpi";
import { InsigniaInventario } from "../inventario/insignia-inventario";
import { TarjetaKpi } from "./tarjeta-kpi";
import { GraficoInventario, GraficoSucursales, GraficoTopProductos, GraficoVentasDiarias } from "./graficos";
import type { Filtros, Opcion, RespuestaAlertas, RespuestaGraficos, RespuestaKpis } from "./tipos";

function useOpciones(url: string, habilitado: boolean) {
  const [opciones, setOpciones] = useState<Opcion[]>([]);
  useEffect(() => {
    if (!habilitado) return;
    let cancelado = false;
    api<Pagina<Opcion>>(`${url}?activo=true&tamano=100`)
      .then((r) => !cancelado && setOpciones(r.datos))
      .catch(() => !cancelado && toast.error("No fue posible cargar las opciones de los filtros."));
    return () => {
      cancelado = true;
    };
  }, [url, habilitado]);
  return opciones;
}

type Datos = { clave: string; kpis: RespuestaKpis | null; graficos: RespuestaGraficos | null; alertas: RespuestaAlertas | null; error: string | null };

/** Uso de los datos del dashboard por el chatbot y los agentes (docs/06-KPI seccion 5, RF-29). */
const USO_IA = [
  { dato: "KPI-01 a KPI-08", herramienta: "consultarKpis", quien: "Chatbot y Agente 2 (comercial)" },
  { dato: "G-02 ventas por sucursal", herramienta: "ventasPorSucursal", quien: "Chatbot y Agente 2" },
  { dato: "G-03 top de productos", herramienta: "topProductos", quien: "Chatbot y Agente 2" },
  { dato: "G-04 y alertas de inventario", herramienta: "productosEnRiesgo", quien: "Chatbot y Agente 1 (inventario)" },
  { dato: "KPI-05 baja rotación", herramienta: "productosBajaRotacion", quien: "Chatbot y Agente 2" },
  { dato: "KPI-06 cumplimiento", herramienta: "cumplimientoProveedores, ordenesPendientes", quien: "Chatbot y Agente 1" },
];

export function ModuloDashboard({ verSucursales, verCategorias }: { verSucursales: boolean; verCategorias: boolean }) {
  const [filtros, setFiltros] = useState<Filtros>(() => ({ ...periodoPorDefecto(), sucursalId: "todos", categoriaId: "todos" }));
  const [datos, setDatos] = useState<Datos>({ clave: "", kpis: null, graficos: null, alertas: null, error: null });
  const [descargando, setDescargando] = useState(false);
  const sucursales = useOpciones("/api/sucursales", verSucursales);
  const categorias = useOpciones("/api/categorias", verCategorias);

  const consulta = useMemo(() => new URLSearchParams(filtros).toString(), [filtros]);
  const consultaAlertas = useMemo(
    () => new URLSearchParams({ sucursalId: filtros.sucursalId, categoriaId: filtros.categoriaId }).toString(),
    [filtros.sucursalId, filtros.categoriaId],
  );
  const fechasValidas = !!filtros.desde && !!filtros.hasta && filtros.desde <= filtros.hasta;

  useEffect(() => {
    if (!fechasValidas) return;
    let cancelado = false;
    Promise.all([
      api<RespuestaKpis>(`/api/dashboard/kpis?${consulta}`),
      api<RespuestaGraficos>(`/api/dashboard/graficos?${consulta}`),
      api<RespuestaAlertas>(`/api/dashboard/alertas?${consultaAlertas}`),
    ])
      .then(([kpis, graficos, alertas]) => !cancelado && setDatos({ clave: consulta, kpis, graficos, alertas, error: null }))
      .catch((e: unknown) => !cancelado && setDatos((d) => ({
        ...d, clave: consulta, error: e instanceof ErrorCliente ? e.message : "No fue posible cargar el dashboard.",
      })));
    return () => {
      cancelado = true;
    };
  }, [consulta, consultaAlertas, fechasValidas]);

  const cargando = fechasValidas && datos.clave !== consulta;
  const { kpis, graficos, alertas } = datos;
  const cambiar = (campo: keyof Filtros, valor: string) => setFiltros((f) => ({ ...f, [campo]: valor }));
  const rango = (dias: number) => setFiltros((f) => ({ ...f, ...periodoUltimosDias(dias) }));
  const conCategoria = filtros.categoriaId !== "todos";

  function detalle(id: IdKpi): string | undefined {
    if (!kpis) return undefined;
    const e = kpis.extras;
    switch (id) {
      case "KPI-02": return `${formatoNumero(e.numVentas)} ventas registradas`;
      case "KPI-04": return `${formatoNumero(e.agotados)} de ${formatoNumero(e.inventarios)} combinaciones producto–sucursal`;
      case "KPI-05": return `${formatoCOP(e.valorInmovilizado)} inmovilizados al costo`;
      case "KPI-07": return e.clientesIdentificados > 0
        ? `${formatoPct((kpis.kpis["KPI-07"].valor ?? 0) / e.clientesIdentificados * 100)} de ${formatoNumero(e.clientesIdentificados)} clientes identificados`
        : undefined;
      default: return undefined;
    }
  }

  async function exportarVentas() {
    setDescargando(true);
    try {
      const nombre = await descargarArchivo(`/api/reportes/ventas.csv?${consulta}`);
      toast.success(`Se descargó ${nombre}.`);
    } catch (e) {
      toast.error(e instanceof ErrorCliente ? e.message : "No fue posible descargar el reporte.");
    } finally {
      setDescargando(false);
    }
  }

  return (
    <div className="space-y-4">
      {/* Filtros (RF-26): una sola fila sobre todos los indicadores */}
      <Card>
        <CardContent className="flex flex-col gap-3 lg:flex-row lg:flex-wrap lg:items-end">
          <div className="flex items-end gap-2">
            <div className="space-y-1">
              <Label htmlFor="desde" className="text-xs">Desde</Label>
              <Input id="desde" type="date" value={filtros.desde} max={filtros.hasta} onChange={(e) => cambiar("desde", e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="hasta" className="text-xs">Hasta</Label>
              <Input id="hasta" type="date" value={filtros.hasta} min={filtros.desde} onChange={(e) => cambiar("hasta", e.target.value)} />
            </div>
          </div>
          <div className="flex gap-1" role="group" aria-label="Periodos rápidos">
            {[7, 30, 90].map((d) => (
              <Button key={d} type="button" variant="outline" size="sm" onClick={() => rango(d)} title={`Últimos ${d} días completos, hasta ayer`}>{d} días</Button>
            ))}
          </div>
          {verSucursales && (
            <NativeSelect value={filtros.sucursalId} onChange={(e) => cambiar("sucursalId", e.target.value)} aria-label="Filtrar por sucursal">
              <NativeSelectOption value="todos">Todas las sucursales</NativeSelectOption>
              {sucursales.map((s) => <NativeSelectOption key={s.id} value={s.id}>{s.nombre}</NativeSelectOption>)}
            </NativeSelect>
          )}
          {verCategorias && (
            <NativeSelect value={filtros.categoriaId} onChange={(e) => cambiar("categoriaId", e.target.value)} aria-label="Filtrar por categoría">
              <NativeSelectOption value="todos">Todas las categorías</NativeSelectOption>
              {categorias.map((c) => <NativeSelectOption key={c.id} value={c.id}>{c.nombre}</NativeSelectOption>)}
            </NativeSelect>
          )}
          <Button type="button" variant="ghost" size="sm" onClick={() => setFiltros({ ...periodoPorDefecto(), sucursalId: "todos", categoriaId: "todos" })}>
            <RotateCcw /> Restablecer
          </Button>
          <Button type="button" variant="outline" size="sm" className="lg:ml-auto" onClick={exportarVentas} disabled={descargando || !fechasValidas}>
            {descargando ? <Loader2 className="animate-spin" /> : <Download />} Ventas en CSV
          </Button>
          <div className="w-full text-xs text-muted-foreground">
            {!fechasValidas ? (
              <span className="text-destructive">La fecha inicial debe ser anterior o igual a la final.</span>
            ) : kpis ? (
              <>Periodo {formatoDia(kpis.filtros.desde)} – {formatoDia(kpis.filtros.hasta)}, comparado con {formatoDia(kpis.periodoAnterior.desde)} – {formatoDia(kpis.periodoAnterior.hasta)}. Las ventas anuladas no se cuentan.
                {kpis.filtros.hasta >= hoyBogota() && " El periodo incluye hoy, que aún está en curso: la comparación puede verse afectada."}</>
            ) : "Cargando…"}
            {cargando && kpis && <Loader2 className="ml-2 inline size-3 animate-spin" aria-label="Actualizando" />}
          </div>
        </CardContent>
      </Card>

      {datos.error && <p className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">{datos.error}</p>}

      {/* Tarjetas de los ocho KPI (RF-24) */}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4" aria-busy={cargando}>
        {kpis
          ? IDS_KPI.map((id) => (
              <TarjetaKpi key={id} kpi={kpis.kpis[id]} detalle={detalle(id)} sinFiltroCategoria={conCategoria && KPIS[id].sinCategoria} />
            ))
          : IDS_KPI.map((id) => <Skeleton key={id} className="h-44 rounded-xl" />)}
      </div>

      {/* Interpretacion automatica (RF-27) */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base"><Sparkles className="size-4" /> Interpretación automática basada en reglas</CardTitle>
          <CardDescription>Texto generado con reglas explícitas (IR-01 a IR-06 de 06-KPI §4), no con inteligencia artificial.</CardDescription>
        </CardHeader>
        <CardContent>
          {kpis ? (
            <ul className="space-y-2">
              {kpis.interpretacion.map((h) => (
                <li key={h.regla} className="flex gap-3 text-sm">
                  <InsigniaSemaforo valor={h.semaforo} className="w-20 shrink-0" />
                  <span>{h.texto} <span className="text-xs text-muted-foreground">({h.regla})</span></span>
                </li>
              ))}
            </ul>
          ) : <Skeleton className="h-24 w-full" />}
        </CardContent>
      </Card>

      {/* Graficos (RF-25) */}
      {graficos ? (
        <>
          <GraficoVentasDiarias datos={graficos.ventasDiarias} />
          <div className="grid gap-4 xl:grid-cols-2">
            <GraficoSucursales datos={graficos.ventasPorSucursal} />
            <GraficoInventario datos={graficos.inventarioPorSucursal} />
          </div>
          <GraficoTopProductos datos={graficos.topProductos} />
        </>
      ) : <Skeleton className="h-80 w-full rounded-xl" />}

      {/* Alertas de inventario (RF-28) */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Alertas de inventario</CardTitle>
          <CardDescription>
            {alertas
              ? `${formatoNumero(alertas.resumen.agotados)} agotado(s) y ${formatoNumero(alertas.resumen.bajoMinimo)} bajo el mínimo (situación actual). Se muestran los 10 más urgentes.`
              : "Cargando…"}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {alertas && (
            <div className="rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Producto</TableHead><TableHead>Sucursal</TableHead><TableHead className="text-right">Stock / mín.</TableHead>
                    <TableHead>Estado</TableHead><TableHead>Proveedor</TableHead><TableHead>Orden abierta</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {alertas.datos.length === 0 && (
                    <TableRow><TableCell colSpan={6} className="py-6 text-center text-muted-foreground">No hay productos agotados ni bajo el mínimo.</TableCell></TableRow>
                  )}
                  {alertas.datos.slice(0, 10).map((a) => (
                    <TableRow key={a.inventarioId}>
                      <TableCell><div className="font-medium">{a.producto}</div><div className="font-mono text-xs text-muted-foreground">{a.sku}</div></TableCell>
                      <TableCell>{a.sucursal}</TableCell>
                      <TableCell className="text-right tabular-nums">{a.stock} / {a.stockMinimo}</TableCell>
                      <TableCell><InsigniaInventario estado={a.estado} /></TableCell>
                      <TableCell className="text-muted-foreground">{a.proveedor} <span className="text-xs">({a.tiempoEntregaDias} d)</span></TableCell>
                      <TableCell>{a.enPedido ? "Sí" : <span className="text-muted-foreground">No</span>}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline" size="sm"><Link href="/inventario">Ver el inventario completo</Link></Button>
            <Button asChild variant="outline" size="sm"><Link href="/reportes">Ir a reportes</Link></Button>
          </div>
        </CardContent>
      </Card>

      {/* Uso de los datos por el chatbot y los agentes (RF-29) */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base"><Bot className="size-4" /> Cómo usan estos datos el chatbot y los agentes</CardTitle>
          <CardDescription>
            Las herramientas de IA consultan el mismo servicio de indicadores que este dashboard. Por eso las cifras que mencionan
            el chatbot y los agentes se pueden contrastar con estas tarjetas y gráficos. La IA no calcula cifras: las interpreta.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg border">
            <Table>
              <TableHeader><TableRow><TableHead>Dato del dashboard</TableHead><TableHead>Herramienta que lo consulta</TableHead><TableHead>Quién la usa</TableHead></TableRow></TableHeader>
              <TableBody>
                {USO_IA.map((u) => (
                  <TableRow key={u.dato}>
                    <TableCell>{u.dato}</TableCell>
                    <TableCell className="font-mono text-xs">{u.herramienta}</TableCell>
                    <TableCell>{u.quien}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
