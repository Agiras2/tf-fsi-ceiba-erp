"use client";

import { useEffect, useState, type FormEvent } from "react";
import { Loader2, Wand2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { Campo } from "@/components/comun/campo";
import { api, ErrorCliente } from "@/lib/api-cliente";
import { cn } from "@/lib/utils";
import { formatoCOP, formatoNumero } from "@/lib/formato";
import { hoyBogota, sumarDias } from "@/lib/fechas";
import type { Pagina } from "@/lib/esquemas/comunes";
import { calcularTotales } from "@/lib/esquemas/ventas";
import { esquemaOrdenCompra, esquemaOrdenCompraEdicion } from "@/lib/esquemas/compras";
import { InsigniaInventario } from "../inventario/insignia-inventario";
import type { FilaInventario } from "../inventario/tipos";
import type { Orden, Proveedor } from "./tipos";

type Props = {
  abierto: boolean;
  /** null = orden nueva (bodega, sucursal de la sesion). */
  orden: Orden | null;
  onCerrar: () => void;
  onGuardado: (orden: Orden) => void;
};

export function FormularioOrden({ abierto, orden, onCerrar, onGuardado }: Props) {
  return (
    <Dialog open={abierto} onOpenChange={(v) => !v && onCerrar()}>
      <DialogContent className="sm:max-w-4xl">
        {abierto && <Contenido key={orden?.id ?? "nueva"} orden={orden} onCerrar={onCerrar} onGuardado={onGuardado} />}
      </DialogContent>
    </Dialog>
  );
}

type Filas = { clave: string; datos: FilaInventario[]; error: string | null };

function Contenido({ orden, onCerrar, onGuardado }: Omit<Props, "abierto">) {
  const editando = orden !== null;
  const [proveedores, setProveedores] = useState<Proveedor[]>([]);
  const [proveedorId, setProveedorId] = useState(orden ? String(orden.proveedor.id) : "");
  const [fechaEsperada, setFechaEsperada] = useState(orden?.fechaEsperada ?? "");
  const [observaciones, setObservaciones] = useState(orden?.observaciones ?? "");
  const [cantidades, setCantidades] = useState<Record<number, string>>(() =>
    Object.fromEntries((orden?.detalles ?? []).map((d) => [d.productoId, String(d.cantidad)])),
  );
  const [filas, setFilas] = useState<Filas>({ clave: "", datos: [], error: null });
  const [errores, setErrores] = useState<Record<string, string>>({});
  const [guardando, setGuardando] = useState(false);

  // Proveedores activos (solo al crear: en la edicion el proveedor no cambia).
  useEffect(() => {
    if (editando) return;
    let cancelado = false;
    api<Pagina<Proveedor>>("/api/proveedores?activo=true&tamano=100")
      .then((r) => !cancelado && setProveedores(r.datos))
      .catch(() => !cancelado && toast.error("No fue posible cargar los proveedores."));
    return () => {
      cancelado = true;
    };
  }, [editando]);

  // Productos del proveedor con las existencias de la sucursal de la orden.
  const consulta = proveedorId
    ? `/api/inventario?${new URLSearchParams({
        proveedorId, tamano: "100", ...(orden ? { sucursalId: String(orden.sucursal.id) } : {}),
      })}`
    : "";
  useEffect(() => {
    if (!consulta) return;
    let cancelado = false;
    api<Pagina<FilaInventario>>(consulta)
      .then((r) => !cancelado && setFilas({ clave: consulta, datos: r.datos, error: null }))
      .catch((e: unknown) => !cancelado && setFilas({
        clave: consulta, datos: [], error: e instanceof ErrorCliente ? e.message : "No fue posible cargar los productos.",
      }));
    return () => {
      cancelado = true;
    };
  }, [consulta]);
  const cargando = !!consulta && filas.clave !== consulta;
  const productos = filas.clave === consulta ? filas.datos : [];

  function elegirProveedor(valor: string) {
    setProveedorId(valor);
    setCantidades({});
    setErrores({});
    const p = proveedores.find((x) => String(x.id) === valor);
    if (p) setFechaEsperada(sumarDias(hoyBogota(), p.tiempoEntregaDias));
  }

  function cambiarCantidad(productoId: number, valor: string) {
    setCantidades((c) => ({ ...c, [productoId]: valor }));
    setErrores((e) => ({ ...e, [`p${productoId}`]: "", items: "" }));
  }

  /** Ayuda manual: lleva al maximo los productos agotados o bajo minimo. */
  function completarFaltantes() {
    const faltantes = productos.filter((f) => f.estado === "AGOTADO" || f.estado === "BAJO_MINIMO");
    if (faltantes.length === 0) {
      toast.info("Ningún producto de este proveedor está agotado o bajo el mínimo.");
      return;
    }
    setCantidades((c) => ({ ...c, ...Object.fromEntries(faltantes.map((f) => [f.productoId, String(f.stockMaximo - f.stock)])) }));
    toast.success(`Se sugirieron cantidades para ${faltantes.length} producto(s) hasta su stock máximo.`);
  }

  const items = productos
    .filter((f) => (cantidades[f.productoId] ?? "").trim() !== "")
    .map((f) => ({ productoId: f.productoId, cantidad: cantidades[f.productoId], costo: f.producto.costo }));
  const totales = calcularTotales(
    items.filter((i) => Number.isInteger(Number(i.cantidad)) && Number(i.cantidad) > 0).map((i) => ({ cantidad: Number(i.cantidad), precio: i.costo })),
  );
  const retirados = orden ? orden.detalles.filter((d) => !cargando && !productos.some((f) => f.productoId === d.productoId)) : [];

  async function guardar(e: FormEvent) {
    e.preventDefault();
    const enviados = items.map(({ productoId, cantidad }) => ({ productoId, cantidad }));
    const datos = editando
      ? { fechaEsperada, observaciones, items: enviados }
      : { proveedorId, fechaEsperada, observaciones, items: enviados };
    const r = (editando ? esquemaOrdenCompraEdicion : esquemaOrdenCompra).safeParse(datos);
    if (!r.success) {
      setErrores(mapearErrores(r.error.issues.map((i) => ({ campo: i.path.join("."), mensaje: i.message })), enviados));
      return;
    }
    if (fechaEsperada < hoyBogota()) {
      setErrores({ fechaEsperada: "La fecha esperada no puede ser anterior a hoy." });
      return;
    }
    setErrores({});
    setGuardando(true);
    try {
      const guardada = editando
        ? await api<Orden>(`/api/ordenes-compra/${orden.id}`, { method: "PATCH", json: r.data })
        : await api<Orden>("/api/ordenes-compra", { method: "POST", json: r.data });
      toast.success(editando ? `Orden #${guardada.id} actualizada.` : `Orden #${guardada.id} creada en borrador.`);
      onGuardado(guardada);
    } catch (err) {
      if (err instanceof ErrorCliente) {
        setErrores(mapearErrores(err.detalles, enviados));
        toast.error(err.message);
      } else toast.error("No fue posible guardar la orden.");
    } finally {
      setGuardando(false);
    }
  }

  const proveedor = editando ? orden.proveedor : proveedores.find((p) => String(p.id) === proveedorId);

  return (
    <form onSubmit={guardar} noValidate className="min-w-0 space-y-4">
      <DialogHeader>
        <DialogTitle>{editando ? `Editar borrador #${orden.id}` : "Nueva orden de compra"}</DialogTitle>
        <DialogDescription>
          {editando
            ? `${orden.proveedor.nombre} · ${orden.sucursal.nombre}. Solo los borradores se pueden editar.`
            : "Se crea en borrador para su sucursal; el gerente la aprueba. El costo unitario se toma del catálogo."}
        </DialogDescription>
      </DialogHeader>

      <div className="grid gap-4 sm:grid-cols-3">
        <Campo id="proveedorId" etiqueta="Proveedor" error={errores.proveedorId}
          ayuda={proveedor ? `Entrega en ${proveedor.tiempoEntregaDias} día(s)` : undefined}>
          {editando ? (
            <Input id="proveedorId" value={orden.proveedor.nombre} disabled />
          ) : (
            <NativeSelect id="proveedorId" className="w-full" value={proveedorId} onChange={(e) => elegirProveedor(e.target.value)}
              aria-invalid={!!errores.proveedorId}>
              <NativeSelectOption value="">Seleccione…</NativeSelectOption>
              {proveedores.map((p) => <NativeSelectOption key={p.id} value={p.id}>{p.nombre}</NativeSelectOption>)}
            </NativeSelect>
          )}
        </Campo>
        <Campo id="fechaEsperada" etiqueta="Fecha esperada de entrega" error={errores.fechaEsperada}>
          <Input id="fechaEsperada" type="date" min={hoyBogota()} value={fechaEsperada}
            onChange={(e) => setFechaEsperada(e.target.value)} aria-invalid={!!errores.fechaEsperada} />
        </Campo>
        <Campo id="observaciones" etiqueta="Observaciones (opcional)" error={errores.observaciones}>
          <Textarea id="observaciones" rows={1} value={observaciones} onChange={(e) => setObservaciones(e.target.value)} className="min-h-9" />
        </Campo>
      </div>

      {proveedorId && (
        <div className="space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm text-muted-foreground">
              Escriba la cantidad solo en los productos que va a pedir. Existencias de {editando ? orden.sucursal.nombre : "su sucursal"}.
            </p>
            <Button type="button" variant="outline" size="sm" onClick={completarFaltantes} disabled={cargando || productos.length === 0}>
              <Wand2 /> Completar faltantes hasta el máximo
            </Button>
          </div>
          <div className="max-h-[45vh] overflow-auto rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Producto</TableHead>
                  <TableHead className="text-right">Stock</TableHead>
                  <TableHead className="text-right">Mín / Máx</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Costo</TableHead>
                  <TableHead className="w-28">Cantidad</TableHead>
                  <TableHead className="text-right">Subtotal</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {cargando && (
                  <TableRow><TableCell colSpan={7} className="py-6 text-center text-muted-foreground">Cargando productos…</TableCell></TableRow>
                )}
                {filas.error && filas.clave === consulta && (
                  <TableRow><TableCell colSpan={7} className="py-6 text-center text-destructive">{filas.error}</TableCell></TableRow>
                )}
                {!cargando && !filas.error && productos.length === 0 && (
                  <TableRow><TableCell colSpan={7} className="py-6 text-center text-muted-foreground">Este proveedor no tiene productos activos.</TableCell></TableRow>
                )}
                {productos.map((f) => {
                  const valor = cantidades[f.productoId] ?? "";
                  const n = Number(valor);
                  const error = errores[`p${f.productoId}`];
                  return (
                    <TableRow key={f.productoId} className={cn(valor && "bg-muted/40")}>
                      <TableCell className="whitespace-normal">
                        <div className="font-medium">{f.producto.nombre}</div>
                        <div className="font-mono text-xs text-muted-foreground">{f.producto.sku}</div>
                      </TableCell>
                      <TableCell className="text-right font-medium tabular-nums">{formatoNumero(f.stock)}</TableCell>
                      <TableCell className="text-right text-muted-foreground tabular-nums">{f.stockMinimo} / {f.stockMaximo}</TableCell>
                      <TableCell><InsigniaInventario estado={f.estado} /></TableCell>
                      <TableCell className="text-right tabular-nums">{formatoCOP(f.producto.costo)}</TableCell>
                      <TableCell>
                        <Input type="number" min="1" step="1" inputMode="numeric" value={valor} placeholder="0"
                          onChange={(e) => cambiarCantidad(f.productoId, e.target.value)}
                          className="h-8 tabular-nums" aria-label={`Cantidad de ${f.producto.nombre}`} aria-invalid={!!error} />
                        {error && <p className="mt-1 text-xs whitespace-normal text-destructive">{error}</p>}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {Number.isInteger(n) && n > 0 ? formatoCOP(n * f.producto.costo) : "—"}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
          <div className="flex items-baseline justify-end gap-3 text-sm">
            <span className="text-muted-foreground">{items.length} producto(s) en la orden · Total estimado</span>
            <span className="text-lg font-semibold tabular-nums">{formatoCOP(totales.total)}</span>
          </div>
          {errores.items && <p className="text-sm text-destructive">{errores.items}</p>}
          {retirados.length > 0 && (
            <p className="text-sm text-amber-700 dark:text-amber-300">
              {retirados.map((d) => d.producto.nombre).join(", ")} ya no está(n) activo(s) y se retirará(n) de la orden al guardar.
            </p>
          )}
        </div>
      )}

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onCerrar} disabled={guardando}>Cancelar</Button>
        <Button type="submit" disabled={guardando || !proveedorId}>
          {guardando && <Loader2 className="animate-spin" />}
          {editando ? "Guardar cambios" : "Crear borrador"}
        </Button>
      </DialogFooter>
    </form>
  );
}

/** Traduce "items.3.cantidad" al producto de esa posicion para mostrar el error en su fila. */
function mapearErrores(detalles: { campo: string; mensaje: string }[], enviados: { productoId: number }[]) {
  const r: Record<string, string> = {};
  for (const d of detalles) {
    const m = /^items\.(\d+)\./.exec(d.campo);
    const clave = m ? `p${enviados[Number(m[1])]?.productoId}` : d.campo.split(".")[0] || "items";
    r[clave] ??= d.mensaje;
  }
  return r;
}
