"use client";

import { useEffect, useMemo, useState } from "react";
import { Download, FileSpreadsheet, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { api, ErrorCliente } from "@/lib/api-cliente";
import { descargarArchivo } from "@/lib/descargar";
import { formatoNumero } from "@/lib/formato";
import type { Pagina } from "@/lib/esquemas/comunes";
import { periodoPorDefecto } from "@/lib/esquemas/kpi";
import { InsigniaInventario } from "../inventario/insignia-inventario";
import type { Opcion, RespuestaAlertas } from "../dashboard/tipos";

type Permitidos = { ventas: boolean; inventario: boolean; proveedores: boolean };
type Reporte = "ventas" | "inventario" | "proveedores";

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

const REPORTES: { id: Reporte; titulo: string; descripcion: string; ruta: string; filtros: string }[] = [
  {
    id: "ventas", titulo: "Ventas detalladas", ruta: "/api/reportes/ventas.csv",
    descripcion: "Una línea por producto vendido: fecha, venta, sucursal, cajero, cliente, medio de pago, cantidades, precio, costo y subtotal. Solo ventas registradas (la suma coincide con KPI-01).",
    filtros: "Periodo, sucursal y categoría",
  },
  {
    id: "inventario", titulo: "Inventario agotado y bajo mínimo", ruta: "/api/reportes/inventario-bajo-minimo.csv",
    descripcion: "Situación actual: stock, mínimo, máximo, faltante hasta el máximo, proveedor con su tiempo de entrega y si ya hay una orden abierta.",
    filtros: "Sucursal y categoría (no depende del periodo)",
  },
  {
    id: "proveedores", titulo: "Cumplimiento de proveedores", ruta: "/api/reportes/cumplimiento-proveedores.csv",
    descripcion: "Por proveedor: órdenes que debían llegar en el periodo, a tiempo, tardías, pendientes vencidas, % de cumplimiento (KPI-06) y retraso promedio.",
    filtros: "Periodo y sucursal",
  },
];

export function ModuloReportes({ permitidos, verSucursales, verCategorias }: { permitidos: Permitidos; verSucursales: boolean; verCategorias: boolean }) {
  const [filtros, setFiltros] = useState(() => ({ ...periodoPorDefecto(), sucursalId: "todos", categoriaId: "todos" }));
  const [descargando, setDescargando] = useState<Reporte | null>(null);
  const [alertas, setAlertas] = useState<{ clave: string; datos: RespuestaAlertas | null; error: string | null }>({ clave: "", datos: null, error: null });
  const sucursales = useOpciones("/api/sucursales", verSucursales);
  const categorias = useOpciones("/api/categorias", verCategorias);
  const cambiar = (campo: keyof typeof filtros, valor: string) => setFiltros((f) => ({ ...f, [campo]: valor }));
  const fechasValidas = !!filtros.desde && !!filtros.hasta && filtros.desde <= filtros.hasta;

  const claveAlertas = useMemo(
    () => new URLSearchParams({ sucursalId: filtros.sucursalId, categoriaId: filtros.categoriaId }).toString(),
    [filtros.sucursalId, filtros.categoriaId],
  );
  useEffect(() => {
    if (!permitidos.inventario) return;
    let cancelado = false;
    api<RespuestaAlertas>(`/api/dashboard/alertas?${claveAlertas}`)
      .then((r) => !cancelado && setAlertas({ clave: claveAlertas, datos: r, error: null }))
      .catch((e: unknown) => !cancelado && setAlertas({ clave: claveAlertas, datos: null, error: e instanceof ErrorCliente ? e.message : "No fue posible cargar las alertas." }));
    return () => {
      cancelado = true;
    };
  }, [claveAlertas, permitidos.inventario]);

  async function descargar(r: (typeof REPORTES)[number]) {
    const p: Record<string, string> = r.id === "inventario"
      ? { sucursalId: filtros.sucursalId, categoriaId: filtros.categoriaId }
      : r.id === "proveedores"
        ? { desde: filtros.desde, hasta: filtros.hasta, sucursalId: filtros.sucursalId }
        : filtros;
    setDescargando(r.id);
    try {
      const nombre = await descargarArchivo(`${r.ruta}?${new URLSearchParams(p)}`);
      toast.success(`Se descargó ${nombre}.`);
    } catch (e) {
      toast.error(e instanceof ErrorCliente ? e.message : "No fue posible descargar el reporte.");
    } finally {
      setDescargando(null);
    }
  }

  const visibles = REPORTES.filter((r) => permitidos[r.id]);
  const usaPeriodo = permitidos.ventas || permitidos.proveedores;

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="flex flex-col gap-3 lg:flex-row lg:flex-wrap lg:items-end">
          {usaPeriodo && (
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
          )}
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
          {usaPeriodo && !fechasValidas && <p className="text-sm text-destructive">La fecha inicial debe ser anterior o igual a la final.</p>}
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-3">
        {visibles.map((r) => (
          <Card key={r.id} className="flex flex-col">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base"><FileSpreadsheet className="size-4" /> {r.titulo}</CardTitle>
              <CardDescription>{r.descripcion}</CardDescription>
            </CardHeader>
            <CardContent className="flex-1 text-xs text-muted-foreground">Filtros que aplica: {r.filtros}.</CardContent>
            <CardFooter>
              <Button onClick={() => descargar(r)} disabled={descargando !== null || (r.id !== "inventario" && !fechasValidas)}>
                {descargando === r.id ? <Loader2 className="animate-spin" /> : <Download />} Descargar CSV
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>

      {permitidos.inventario && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Vista previa: inventario agotado y bajo mínimo</CardTitle>
            <CardDescription>
              {alertas.datos && alertas.clave === claveAlertas
                ? `${formatoNumero(alertas.datos.resumen.agotados)} agotado(s) y ${formatoNumero(alertas.datos.resumen.bajoMinimo)} bajo el mínimo. Es el mismo contenido del CSV.`
                : "Cargando…"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {alertas.error && <p className="text-sm text-destructive">{alertas.error}</p>}
            {!alertas.datos && !alertas.error && <Skeleton className="h-40 w-full" />}
            {alertas.datos && (
              <div className="max-h-[28rem] overflow-auto rounded-lg border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Producto</TableHead><TableHead>Sucursal</TableHead><TableHead className="text-right">Stock</TableHead>
                      <TableHead className="text-right">Mín. / Máx.</TableHead><TableHead>Estado</TableHead><TableHead>Proveedor</TableHead>
                      <TableHead className="text-right">Faltante</TableHead><TableHead>Orden abierta</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {alertas.datos.datos.length === 0 && (
                      <TableRow><TableCell colSpan={8} className="py-6 text-center text-muted-foreground">No hay productos agotados ni bajo el mínimo.</TableCell></TableRow>
                    )}
                    {alertas.datos.datos.map((a) => (
                      <TableRow key={a.inventarioId}>
                        <TableCell><div className="font-medium">{a.producto}</div><div className="font-mono text-xs text-muted-foreground">{a.sku}</div></TableCell>
                        <TableCell>{a.sucursal}</TableCell>
                        <TableCell className="text-right font-semibold tabular-nums">{a.stock}</TableCell>
                        <TableCell className="text-right tabular-nums text-muted-foreground">{a.stockMinimo} / {a.stockMaximo}</TableCell>
                        <TableCell><InsigniaInventario estado={a.estado} /></TableCell>
                        <TableCell className="text-muted-foreground">{a.proveedor} <span className="text-xs">({a.tiempoEntregaDias} d)</span></TableCell>
                        <TableCell className="text-right tabular-nums">{a.stockMaximo - a.stock}</TableCell>
                        <TableCell>{a.enPedido ? "Sí" : <span className="text-muted-foreground">No</span>}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
