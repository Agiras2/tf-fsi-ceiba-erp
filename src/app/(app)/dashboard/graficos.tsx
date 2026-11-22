"use client";
// ============================================================
// Graficos del dashboard (docs/06-KPI seccion 3): G-01 a G-04.
// Un eje por grafico, marcas delgadas, leyenda cuando hay mas de una serie
// y la tabla de datos disponible debajo de cada grafico.
// ============================================================
import {
  Bar, BarChart, CartesianGrid, LabelList, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatoCOP, formatoCOPCorto, formatoDia, formatoNumero, formatoPct } from "@/lib/formato";
import type { RespuestaGraficos } from "./tipos";

const EJE = { fontSize: 12, fill: "var(--muted-foreground)" };
const fechaCorta = new Intl.DateTimeFormat("es-CO", { day: "numeric", month: "short", timeZone: "UTC" });
const diaCorto = (d: string) => fechaCorta.format(new Date(`${d}T00:00:00Z`));

/** El texto de la leyenda va en tinta; el color solo lo lleva la marca. */
const textoLeyenda = (valor: string) => <span style={{ color: "var(--foreground)" }}>{valor}</span>;

/** Etiqueta sobre la barra sin salto de linea (las de Recharts se ajustan al ancho de la barra). */
function etiquetaSuperior(formato: (v: number) => string) {
  return function Etiqueta(props: { x?: number | string; y?: number | string; width?: number | string; value?: unknown }) {
    const x = Number(props.x ?? 0) + Number(props.width ?? 0) / 2;
    const y = Number(props.y ?? 0) - 6;
    return typeof props.value === "number"
      ? <text x={x} y={y} textAnchor="middle" fontSize={11} fill="var(--foreground)">{formato(props.value)}</text>
      : null;
  };
}

function Marco({ id, titulo, pregunta, children, tabla }: {
  id: string; titulo: string; pregunta: string; children: React.ReactNode; tabla: React.ReactNode;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{titulo}</CardTitle>
        <CardDescription>{id} · {pregunta}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        {children}
        <details className="text-sm">
          <summary className="cursor-pointer text-xs text-muted-foreground hover:text-foreground">Ver los datos en una tabla</summary>
          <div className="mt-2 max-h-64 overflow-auto rounded-lg border">{tabla}</div>
        </details>
      </CardContent>
    </Card>
  );
}

function CajaTooltip({ titulo, filas }: { titulo: string; filas: { color?: string; nombre: string; valor: string; punteada?: boolean }[] }) {
  return (
    <div className="rounded-lg border bg-popover px-3 py-2 text-xs shadow-md">
      <div className="mb-1 font-medium">{titulo}</div>
      {filas.map((f) => (
        <div key={f.nombre} className="flex items-center gap-2">
          {f.color && <span className="inline-block h-0.5 w-3" style={{ background: f.color, borderTop: f.punteada ? `2px dashed ${f.color}` : undefined }} />}
          <span className="text-muted-foreground">{f.nombre}</span>
          <span className="ml-auto pl-3 font-medium tabular-nums">{f.valor}</span>
        </div>
      ))}
    </div>
  );
}

/** G-01: ventas diarias del periodo y del anterior. */
export function GraficoVentasDiarias({ datos }: { datos: RespuestaGraficos["ventasDiarias"] }) {
  return (
    <Marco id="G-01" titulo="Ventas diarias" pregunta="¿Cómo evolucionan las ventas y hay estacionalidad semanal?"
      tabla={
        <Table>
          <TableHeader><TableRow><TableHead>Día</TableHead><TableHead className="text-right">Ventas</TableHead><TableHead>Día anterior</TableHead><TableHead className="text-right">Ventas</TableHead></TableRow></TableHeader>
          <TableBody>{datos.map((d) => (
            <TableRow key={d.dia}><TableCell>{formatoDia(d.dia)}</TableCell><TableCell className="text-right tabular-nums">{formatoCOP(d.ventas)}</TableCell>
              <TableCell>{formatoDia(d.diaAnterior)}</TableCell><TableCell className="text-right tabular-nums">{formatoCOP(d.ventasAnterior)}</TableCell></TableRow>
          ))}</TableBody>
        </Table>
      }>
      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={datos} margin={{ top: 8, right: 12, bottom: 0, left: 8 }}>
            <CartesianGrid stroke="var(--chart-grid)" vertical={false} />
            <XAxis dataKey="dia" tickFormatter={diaCorto} tick={EJE} tickLine={false} axisLine={false} minTickGap={24} />
            <YAxis tickFormatter={(v: number) => formatoCOPCorto(v)} tick={EJE} tickLine={false} axisLine={false} width={64} />
            <Tooltip cursor={{ stroke: "var(--muted-foreground)", strokeDasharray: "3 3" }}
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null;
                const d = payload[0].payload as RespuestaGraficos["ventasDiarias"][number];
                return <CajaTooltip titulo={formatoDia(d.dia)} filas={[
                  { color: "var(--chart-1)", nombre: "Periodo actual", valor: formatoCOP(d.ventas) },
                  { color: "var(--chart-comparacion)", nombre: `Anterior (${diaCorto(d.diaAnterior)})`, valor: formatoCOP(d.ventasAnterior), punteada: true },
                ]} />;
              }} />
            <Legend verticalAlign="top" align="right" height={28} iconType="plainline" wrapperStyle={{ fontSize: 12 }} formatter={textoLeyenda} />
            <Line type="monotone" dataKey="ventasAnterior" name="Periodo anterior" stroke="var(--chart-comparacion)" strokeWidth={2} strokeDasharray="5 4" dot={false} activeDot={{ r: 4 }} />
            <Line type="monotone" dataKey="ventas" name="Periodo actual" stroke="var(--chart-1)" strokeWidth={2} dot={false} activeDot={{ r: 5, stroke: "var(--card)", strokeWidth: 2 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </Marco>
  );
}

/** G-02: ventas y margen por sucursal, en dos graficos de un solo eje. */
export function GraficoSucursales({ datos }: { datos: RespuestaGraficos["ventasPorSucursal"] }) {
  const filas = datos.map((s) => ({ ...s, nombre: s.sucursal.replace(/^Ceiba /, "") }));
  return (
    <Marco id="G-02" titulo="Ventas y margen por sucursal" pregunta="¿Qué sucursal vende menos o es menos rentable?"
      tabla={
        <Table>
          <TableHeader><TableRow><TableHead>Sucursal</TableHead><TableHead className="text-right">Ventas</TableHead><TableHead className="text-right">N.º ventas</TableHead><TableHead className="text-right">Ticket</TableHead><TableHead className="text-right">Margen</TableHead></TableRow></TableHeader>
          <TableBody>{datos.map((s) => (
            <TableRow key={s.sucursalId}><TableCell>{s.sucursal}</TableCell><TableCell className="text-right tabular-nums">{formatoCOP(s.ventas)}</TableCell>
              <TableCell className="text-right tabular-nums">{formatoNumero(s.numVentas)}</TableCell><TableCell className="text-right tabular-nums">{formatoCOP(s.ticket)}</TableCell>
              <TableCell className="text-right tabular-nums">{formatoPct(s.margen)}</TableCell></TableRow>
          ))}</TableBody>
        </Table>
      }>
      <div className="grid gap-4 sm:grid-cols-2">
        {([
          { clave: "ventas", titulo: "Ventas", color: "var(--chart-1)", fmt: (v: number) => formatoCOPCorto(v), fmtTip: (v: number) => formatoCOP(v) },
          { clave: "margen", titulo: "Margen bruto", color: "var(--chart-3)", fmt: (v: number) => formatoPct(v), fmtTip: (v: number) => formatoPct(v) },
        ] as const).map((g) => (
          <div key={g.clave}>
            <div className="mb-1 text-xs font-medium text-muted-foreground">{g.titulo}</div>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={filas} margin={{ top: 20, right: 4, bottom: 0, left: 4 }} barCategoryGap="30%">
                  <CartesianGrid stroke="var(--chart-grid)" vertical={false} />
                  <XAxis dataKey="nombre" tick={EJE} tickLine={false} axisLine={false} interval={0} />
                  <YAxis hide domain={[0, "auto"]} />
                  <Tooltip cursor={{ fill: "var(--muted)" }}
                    content={({ active, payload }) => {
                      if (!active || !payload?.length) return null;
                      const s = payload[0].payload as (typeof filas)[number];
                      return <CajaTooltip titulo={s.sucursal} filas={[
                        { nombre: "Ventas", valor: formatoCOP(s.ventas) },
                        { nombre: "Margen bruto", valor: formatoPct(s.margen) },
                        { nombre: "Ticket promedio", valor: formatoCOP(s.ticket) },
                      ]} />;
                    }} />
                  <Bar dataKey={g.clave} name={g.titulo} fill={g.color} radius={[4, 4, 0, 0]} maxBarSize={48}>
                    <LabelList dataKey={g.clave} content={etiquetaSuperior(g.fmt)} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        ))}
      </div>
    </Marco>
  );
}

/** G-03: los diez productos mas vendidos por unidades. */
export function GraficoTopProductos({ datos }: { datos: RespuestaGraficos["topProductos"] }) {
  return (
    <Marco id="G-03" titulo="Top 10 productos por unidades" pregunta="¿Cuáles son los productos de mayor demanda?"
      tabla={
        <Table>
          <TableHeader><TableRow><TableHead>Producto</TableHead><TableHead>Categoría</TableHead><TableHead className="text-right">Unidades</TableHead><TableHead className="text-right">Valor</TableHead></TableRow></TableHeader>
          <TableBody>{datos.map((p) => (
            <TableRow key={p.productoId}><TableCell>{p.nombre}</TableCell><TableCell>{p.categoria}</TableCell>
              <TableCell className="text-right tabular-nums">{formatoNumero(p.unidades)}</TableCell><TableCell className="text-right tabular-nums">{formatoCOP(p.valor)}</TableCell></TableRow>
          ))}</TableBody>
        </Table>
      }>
      {datos.length === 0 ? <p className="py-10 text-center text-sm text-muted-foreground">No hay ventas con estos filtros.</p> : (
        <div style={{ height: Math.max(160, datos.length * 30 + 20) }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={datos} layout="vertical" margin={{ top: 0, right: 48, bottom: 0, left: 0 }} barCategoryGap="25%">
              <CartesianGrid stroke="var(--chart-grid)" horizontal={false} />
              <XAxis type="number" hide domain={[0, "auto"]} />
              <YAxis type="category" dataKey="nombre" width={170} tick={EJE} tickLine={false} axisLine={false} />
              <Tooltip cursor={{ fill: "var(--muted)" }}
                content={({ active, payload }) => {
                  if (!active || !payload?.length) return null;
                  const p = payload[0].payload as RespuestaGraficos["topProductos"][number];
                  return <CajaTooltip titulo={`${p.nombre} · ${p.sku}`} filas={[
                    { nombre: "Unidades", valor: formatoNumero(p.unidades) }, { nombre: "Valor vendido", valor: formatoCOP(p.valor) },
                    { nombre: "Categoría", valor: p.categoria },
                  ]} />;
                }} />
              <Bar dataKey="unidades" name="Unidades" fill="var(--chart-1)" radius={[0, 4, 4, 0]} maxBarSize={22}>
                <LabelList dataKey="unidades" position="right" formatter={(v) => (typeof v === "number" ? formatoNumero(v) : "")} style={{ fontSize: 11, fill: "var(--foreground)" }} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </Marco>
  );
}

const ESTADOS = [
  { clave: "agotado", nombre: "Agotado", color: "var(--estado-agotado)" },
  { clave: "bajoMinimo", nombre: "Bajo mínimo", color: "var(--estado-bajo-minimo)" },
  { clave: "normal", nombre: "Normal", color: "var(--estado-normal)" },
  { clave: "sobrestock", nombre: "Sobrestock", color: "var(--estado-sobrestock)" },
] as const;

/** G-04: estado actual del inventario por sucursal (barras apiladas). */
export function GraficoInventario({ datos }: { datos: RespuestaGraficos["inventarioPorSucursal"] }) {
  const filas = datos.map((s) => ({ ...s, nombre: s.sucursal.replace(/^Ceiba /, "") }));
  return (
    <Marco id="G-04" titulo="Estado del inventario por sucursal" pregunta="¿Dónde está el riesgo de agotamiento o de exceso? (situación actual)"
      tabla={
        <Table>
          <TableHeader><TableRow><TableHead>Sucursal</TableHead>{ESTADOS.map((e) => <TableHead key={e.clave} className="text-right">{e.nombre}</TableHead>)}</TableRow></TableHeader>
          <TableBody>{datos.map((s) => (
            <TableRow key={s.sucursalId}><TableCell>{s.sucursal}</TableCell>{ESTADOS.map((e) => <TableCell key={e.clave} className="text-right tabular-nums">{s[e.clave]}</TableCell>)}</TableRow>
          ))}</TableBody>
        </Table>
      }>
      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={filas} margin={{ top: 8, right: 8, bottom: 0, left: 0 }} barCategoryGap="30%">
            <CartesianGrid stroke="var(--chart-grid)" vertical={false} />
            <XAxis dataKey="nombre" tick={EJE} tickLine={false} axisLine={false} interval={0} />
            <YAxis tick={EJE} tickLine={false} axisLine={false} width={32} allowDecimals={false} />
            <Tooltip cursor={{ fill: "var(--muted)" }}
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null;
                const s = payload[0].payload as (typeof filas)[number];
                return <CajaTooltip titulo={s.sucursal} filas={[...ESTADOS].reverse().map((e) => ({ color: e.color, nombre: e.nombre, valor: formatoNumero(s[e.clave]) }))} />;
              }} />
            <Legend verticalAlign="top" align="right" height={28} iconType="square" wrapperStyle={{ fontSize: 12 }} formatter={textoLeyenda} />
            {ESTADOS.map((e, i) => (
              <Bar key={e.clave} dataKey={e.clave} name={e.nombre} stackId="estado" fill={e.color} stroke="var(--card)" strokeWidth={2}
                radius={i === ESTADOS.length - 1 ? [4, 4, 0, 0] : 0} maxBarSize={56} />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>
    </Marco>
  );
}
