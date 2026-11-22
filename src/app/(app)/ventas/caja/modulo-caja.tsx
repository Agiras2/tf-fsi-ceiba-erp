"use client";

import { useState } from "react";
import { Loader2, Minus, Plus, ShoppingCart, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { Separator } from "@/components/ui/separator";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Buscador } from "@/components/comun/buscador";
import { FilasEstado } from "@/components/comun/filas-estado";
import { Paginacion } from "@/components/comun/paginacion";
import { useListado } from "@/hooks/use-listado";
import { api, ErrorCliente } from "@/lib/api-cliente";
import { cn } from "@/lib/utils";
import { formatoCOP, formatoNumero } from "@/lib/formato";
import {
  calcularTotales, esquemaVenta, ETIQUETA_MEDIO_PAGO, MAX_ITEMS_VENTA, MEDIOS_PAGO, type MedioPago,
} from "@/lib/esquemas/ventas";
import type { FilaInventario, RespuestaInventario } from "../../inventario/tipos";
import { DetalleVenta } from "../detalle-venta";
import type { Venta } from "../tipos";
import { SelectorCliente, type ClienteCaja } from "./selector-cliente";

type Linea = {
  productoId: number;
  sku: string;
  nombre: string;
  unidad: string;
  precio: number;
  disponible: number;
  cantidad: string;
};

/** Errores de la API por linea: "items.2.cantidad" -> { 2: "..." }. */
function erroresPorLinea(detalles: { campo: string; mensaje: string }[]) {
  const r: Record<number, string> = {};
  for (const d of detalles) {
    const m = /^items\.(\d+)\./.exec(d.campo);
    if (m) r[Number(m[1])] ??= d.mensaje;
  }
  return r;
}

export function ModuloCaja({ permitirCrearCliente }: { permitirCrearCliente: boolean }) {
  const productos = useListado<FilaInventario, RespuestaInventario>("/api/inventario", {}, 8);
  const [lineas, setLineas] = useState<Linea[]>([]);
  const [cliente, setCliente] = useState<ClienteCaja | null>(null);
  const [medioPago, setMedioPago] = useState<MedioPago>("EFECTIVO");
  const [errores, setErrores] = useState<{ lineas: Record<number, string>; cliente?: string; general?: string }>({ lineas: {} });
  const [registrando, setRegistrando] = useState(false);
  const [ultimaVenta, setUltimaVenta] = useState<Venta | null>(null);

  const cantidades = lineas.map((l) => Number(l.cantidad));
  const validas = lineas.filter((_, i) => Number.isInteger(cantidades[i]) && cantidades[i] > 0);
  const estimado = calcularTotales(validas.map((l) => ({ cantidad: Number(l.cantidad), precio: l.precio })));
  const unidades = validas.reduce((a, l) => a + Number(l.cantidad), 0);

  function limpiarErrores() {
    setErrores({ lineas: {} });
  }

  function agregar(f: FilaInventario) {
    limpiarErrores();
    setLineas((ls) => {
      const i = ls.findIndex((l) => l.productoId === f.productoId);
      if (i >= 0) {
        const actual = Number(ls[i].cantidad) || 0;
        if (actual >= f.stock) {
          toast.info(`Solo hay ${formatoNumero(f.stock)} ${f.producto.unidad} de ${f.producto.nombre}.`);
          return ls;
        }
        return ls.map((l, k) => (k === i ? { ...l, cantidad: String(actual + 1), disponible: f.stock } : l));
      }
      if (ls.length >= MAX_ITEMS_VENTA) {
        toast.error(`Una venta admite máximo ${MAX_ITEMS_VENTA} productos.`);
        return ls;
      }
      return [...ls, {
        productoId: f.productoId, sku: f.producto.sku, nombre: f.producto.nombre, unidad: f.producto.unidad,
        precio: f.producto.precio, disponible: f.stock, cantidad: "1",
      }];
    });
  }

  function cambiarCantidad(i: number, valor: string) {
    setErrores((e) => ({ ...e, lineas: { ...e.lineas, [i]: "" } }));
    setLineas((ls) => ls.map((l, k) => (k === i ? { ...l, cantidad: valor } : l)));
  }

  function sumar(i: number, delta: number) {
    const l = lineas[i];
    const n = Math.max(1, (Number(l.cantidad) || 0) + delta);
    cambiarCantidad(i, String(Math.min(n, Math.max(1, l.disponible))));
  }

  function quitar(i: number) {
    limpiarErrores();
    setLineas((ls) => ls.filter((_, k) => k !== i));
  }

  function nuevaVenta() {
    setLineas([]);
    setCliente(null);
    setMedioPago("EFECTIVO");
    limpiarErrores();
  }

  async function registrar() {
    const datos = {
      clienteId: cliente?.id ?? null,
      medioPago,
      items: lineas.map((l) => ({ productoId: l.productoId, cantidad: l.cantidad })),
    };
    // Validacion previa con el mismo esquema del servidor.
    const r = esquemaVenta.safeParse(datos);
    const porLinea: Record<number, string> = {};
    if (!r.success) {
      for (const issue of r.error.issues) {
        if (issue.path[0] === "items" && typeof issue.path[1] === "number") porLinea[issue.path[1]] ??= issue.message;
      }
      const general = r.error.issues.find((x) => x.path.length <= 1)?.message;
      setErrores({ lineas: porLinea, general });
      return;
    }
    lineas.forEach((l, i) => {
      if (Number(l.cantidad) > l.disponible) porLinea[i] = `Disponible: ${formatoNumero(l.disponible)}.`;
    });
    if (Object.keys(porLinea).length) {
      setErrores({ lineas: porLinea });
      return;
    }

    setRegistrando(true);
    try {
      const venta = await api<Venta>("/api/ventas", { method: "POST", json: r.data });
      toast.success(`Venta #${venta.id} registrada por ${formatoCOP(venta.total)}.`);
      setUltimaVenta(venta);
      nuevaVenta();
      productos.recargar();
    } catch (e) {
      if (e instanceof ErrorCliente) {
        const lineasError = erroresPorLinea(e.detalles);
        setErrores({ lineas: lineasError, cliente: e.porCampo().clienteId });
        toast.error(e.message);
        if (e.codigo === "STOCK_INSUFICIENTE") {
          // Actualiza lo disponible con lo que informo el servidor.
          setLineas((ls) => ls.map((l, i) => {
            const m = /Disponible: (\d+)/.exec(lineasError[i] ?? "");
            return m ? { ...l, disponible: Number(m[1]) } : l;
          }));
          productos.recargar();
        }
      } else {
        toast.error("No fue posible registrar la venta.");
      }
    } finally {
      setRegistrando(false);
    }
  }

  return (
    <div className="grid gap-4 lg:grid-cols-5">
      {/* Productos de la sucursal */}
      <Card className="lg:col-span-3">
        <CardHeader>
          <CardTitle>Productos</CardTitle>
          <CardDescription>Existencias de su sucursal. Busque por SKU o nombre y agregue a la venta.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Buscador valor={productos.busqueda} onCambio={productos.setBusqueda} placeholder="Buscar por SKU o producto" />
          <div className="rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Producto</TableHead>
                  <TableHead className="text-right">Precio</TableHead>
                  <TableHead className="text-right">Disponible</TableHead>
                  <TableHead className="w-12"><span className="sr-only">Agregar</span></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <FilasEstado columnas={4} cargando={productos.cargando} error={productos.error} vacio={productos.datos.length === 0} filas={8} />
                {!productos.error && productos.datos.map((f) => {
                  const enVenta = lineas.find((l) => l.productoId === f.productoId);
                  const agotado = f.stock === 0;
                  return (
                    <TableRow key={f.id} className={cn(agotado && "opacity-60")}>
                      <TableCell className="whitespace-normal">
                        <div className="font-medium">{f.producto.nombre}</div>
                        <div className="font-mono text-xs text-muted-foreground">{f.producto.sku} · {f.producto.categoria.nombre}</div>
                      </TableCell>
                      <TableCell className="text-right tabular-nums">{formatoCOP(f.producto.precio)}</TableCell>
                      <TableCell className={cn("text-right tabular-nums", agotado ? "text-destructive" : f.estado === "BAJO_MINIMO" && "text-amber-700 dark:text-amber-300")}>
                        {agotado ? "Agotado" : formatoNumero(f.stock)}
                        {enVenta && <div className="text-xs text-muted-foreground">en venta: {enVenta.cantidad}</div>}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button size="icon-sm" variant="outline" onClick={() => agregar(f)} disabled={agotado}
                          aria-label={`Agregar ${f.producto.nombre}`} title="Agregar a la venta">
                          <Plus />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
          <Paginacion pagina={productos.pagina} tamano={productos.tamano} total={productos.total} onCambio={productos.setPagina} />
        </CardContent>
      </Card>

      {/* Venta en curso */}
      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><ShoppingCart className="size-4" /> Venta actual</CardTitle>
          <CardDescription>
            {lineas.length === 0 ? "Agregue productos desde la lista." : `${lineas.length} producto(s) · ${formatoNumero(unidades)} unidad(es)`}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {lineas.length > 0 && (
            <ul className="divide-y rounded-lg border">
              {lineas.map((l, i) => {
                const error = errores.lineas[i];
                const subtotal = Number.isInteger(cantidades[i]) && cantidades[i] > 0 ? cantidades[i] * l.precio : null;
                return (
                  <li key={l.productoId} className="space-y-2 p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="truncate text-sm font-medium">{l.nombre}</div>
                        <div className="text-xs text-muted-foreground">
                          {formatoCOP(l.precio)} c/u · disponible: {formatoNumero(l.disponible)}
                        </div>
                      </div>
                      <Button variant="ghost" size="icon-sm" onClick={() => quitar(i)} aria-label={`Quitar ${l.nombre}`}>
                        <Trash2 />
                      </Button>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1">
                        <Button variant="outline" size="icon-sm" onClick={() => sumar(i, -1)} aria-label="Restar una unidad"><Minus /></Button>
                        <Input
                          type="number" min="1" step="1" inputMode="numeric" value={l.cantidad}
                          onChange={(e) => cambiarCantidad(i, e.target.value)}
                          className="h-7 w-16 text-center tabular-nums"
                          aria-label={`Cantidad de ${l.nombre}`}
                          aria-invalid={!!error}
                        />
                        <Button variant="outline" size="icon-sm" onClick={() => sumar(i, 1)} aria-label="Sumar una unidad"><Plus /></Button>
                      </div>
                      <div className="text-sm font-semibold tabular-nums">{formatoCOP(subtotal)}</div>
                    </div>
                    {error && <p className="text-xs text-destructive">{error}</p>}
                  </li>
                );
              })}
            </ul>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="cliente">Cliente</Label>
            <SelectorCliente valor={cliente} onCambio={(c) => { setCliente(c); setErrores((e) => ({ ...e, cliente: undefined })); }}
              error={errores.cliente} permitirCrear={permitirCrearCliente} />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="medioPago">Medio de pago</Label>
            <NativeSelect id="medioPago" className="w-full" value={medioPago} onChange={(e) => setMedioPago(e.target.value as MedioPago)}>
              {MEDIOS_PAGO.map((m) => <NativeSelectOption key={m} value={m}>{ETIQUETA_MEDIO_PAGO[m]}</NativeSelectOption>)}
            </NativeSelect>
            <p className="text-xs text-muted-foreground">Solo se registra como dato; el sistema no procesa pagos.</p>
          </div>

          <Separator />

          <div className="flex items-baseline justify-between">
            <span className="text-sm text-muted-foreground">Total</span>
            <span className="text-2xl font-semibold tabular-nums">{formatoCOP(estimado.total)}</span>
          </div>
          <p className="text-xs text-muted-foreground">
            Precios vigentes del catálogo. El servidor recalcula el total al registrar la venta.
          </p>
          {errores.general && <p className="text-sm text-destructive">{errores.general}</p>}

          <div className="flex gap-2">
            <Button variant="outline" onClick={nuevaVenta} disabled={registrando || (lineas.length === 0 && !cliente)}>Vaciar</Button>
            <Button className="flex-1" onClick={registrar} disabled={registrando || lineas.length === 0}>
              {registrando && <Loader2 className="animate-spin" />}
              Registrar venta
            </Button>
          </div>
        </CardContent>
      </Card>

      <Dialog open={ultimaVenta !== null} onOpenChange={(v) => !v && setUltimaVenta(null)}>
        <DialogContent className="sm:max-w-3xl">
          {ultimaVenta && (
            <>
              <DialogHeader>
                <DialogTitle>Venta #{ultimaVenta.id} registrada</DialogTitle>
                <DialogDescription>El inventario se descontó y el movimiento quedó en el kardex.</DialogDescription>
              </DialogHeader>
              <DetalleVenta venta={ultimaVenta} />
              <DialogFooter>
                <Button onClick={() => setUltimaVenta(null)} autoFocus>Nueva venta</Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
