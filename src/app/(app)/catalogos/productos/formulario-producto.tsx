"use client";

import { useState, type FormEvent } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import { Campo } from "@/components/comun/campo";
import { api, ErrorCliente } from "@/lib/api-cliente";
import { esquemaProducto, UNIDADES } from "@/lib/esquemas/catalogos";
import type { Opcion, Producto } from "./tipos";

type Valores = {
  sku: string; nombre: string; descripcion: string; categoriaId: string; proveedorId: string;
  unidad: string; costo: string; precio: string;
};

const VACIO: Valores = { sku: "", nombre: "", descripcion: "", categoriaId: "", proveedorId: "", unidad: "unidad", costo: "", precio: "" };

function valoresDe(p: Producto | null): Valores {
  if (!p) return VACIO;
  return {
    sku: p.sku, nombre: p.nombre, descripcion: p.descripcion ?? "", categoriaId: String(p.categoriaId),
    proveedorId: String(p.proveedorId), unidad: p.unidad, costo: String(p.costo), precio: String(p.precio),
  };
}

export function FormularioProducto({
  abierto, producto, categorias, proveedores, onCerrar, onGuardado,
}: {
  abierto: boolean;
  producto: Producto | null;
  categorias: Opcion[];
  proveedores: Opcion[];
  onCerrar: () => void;
  onGuardado: () => void;
}) {
  return (
    <Dialog open={abierto} onOpenChange={(v) => !v && onCerrar()}>
      <DialogContent className="sm:max-w-lg">
        {/* key: reinicia el formulario cada vez que se abre con otro producto */}
        <Contenido
          key={producto?.id ?? "nuevo"}
          producto={producto}
          categorias={categorias}
          proveedores={proveedores}
          onCerrar={onCerrar}
          onGuardado={onGuardado}
        />
      </DialogContent>
    </Dialog>
  );
}

function Contenido({
  producto, categorias, proveedores, onCerrar, onGuardado,
}: {
  producto: Producto | null;
  categorias: Opcion[];
  proveedores: Opcion[];
  onCerrar: () => void;
  onGuardado: () => void;
}) {
  const [valores, setValores] = useState<Valores>(() => valoresDe(producto));
  const [errores, setErrores] = useState<Record<string, string>>({});
  const [guardando, setGuardando] = useState(false);
  const editando = producto !== null;

  const cambiar = (campo: keyof Valores) => (e: { target: { value: string } }) =>
    setValores((v) => ({ ...v, [campo]: e.target.value }));

  async function guardar(e: FormEvent) {
    e.preventDefault();
    // Validacion en el cliente con el mismo esquema que usa el servidor.
    const r = esquemaProducto.safeParse(valores);
    if (!r.success) {
      const porCampo: Record<string, string> = {};
      for (const i of r.error.issues) porCampo[String(i.path[0])] ??= i.message;
      setErrores(porCampo);
      return;
    }
    setErrores({});
    setGuardando(true);
    try {
      if (editando) await api(`/api/productos/${producto.id}`, { method: "PATCH", json: r.data });
      else await api("/api/productos", { method: "POST", json: r.data });
      toast.success(editando ? "Producto actualizado." : "Producto creado.");
      onGuardado();
      onCerrar();
    } catch (err) {
      if (err instanceof ErrorCliente) {
        setErrores(err.porCampo());
        toast.error(err.message);
      } else {
        toast.error("No fue posible guardar el producto.");
      }
    } finally {
      setGuardando(false);
    }
  }

  const invalido = (campo: string) => ({ "aria-invalid": !!errores[campo], "aria-describedby": errores[campo] ? `${campo}-error` : undefined });

  return (
    <form onSubmit={guardar} noValidate className="space-y-4">
      <DialogHeader>
        <DialogTitle>{editando ? "Editar producto" : "Nuevo producto"}</DialogTitle>
        <DialogDescription>
          {editando ? "Modifique los datos y guarde los cambios." : "Al crearlo, se genera su inventario en cada sucursal con stock 0."}
        </DialogDescription>
      </DialogHeader>

      <div className="grid gap-4 sm:grid-cols-2">
        <Campo id="sku" etiqueta="SKU" error={errores.sku}>
          <Input id="sku" value={valores.sku} onChange={cambiar("sku")} placeholder="ABA-012" {...invalido("sku")} />
        </Campo>
        <Campo id="unidad" etiqueta="Unidad" error={errores.unidad}>
          <NativeSelect id="unidad" value={valores.unidad} onChange={cambiar("unidad")} className="w-full" {...invalido("unidad")}>
            {UNIDADES.map((u) => (
              <NativeSelectOption key={u} value={u}>{u}</NativeSelectOption>
            ))}
          </NativeSelect>
        </Campo>
        <Campo id="nombre" etiqueta="Nombre" error={errores.nombre} className="space-y-1.5 sm:col-span-2">
          <Input id="nombre" value={valores.nombre} onChange={cambiar("nombre")} {...invalido("nombre")} />
        </Campo>
        <Campo id="categoriaId" etiqueta="Categoría" error={errores.categoriaId}>
          <NativeSelect id="categoriaId" value={valores.categoriaId} onChange={cambiar("categoriaId")} className="w-full" {...invalido("categoriaId")}>
            <NativeSelectOption value="">Seleccione…</NativeSelectOption>
            {categorias.map((c) => (
              <NativeSelectOption key={c.id} value={c.id}>{c.nombre}</NativeSelectOption>
            ))}
          </NativeSelect>
        </Campo>
        <Campo id="proveedorId" etiqueta="Proveedor principal" error={errores.proveedorId}>
          <NativeSelect id="proveedorId" value={valores.proveedorId} onChange={cambiar("proveedorId")} className="w-full" {...invalido("proveedorId")}>
            <NativeSelectOption value="">Seleccione…</NativeSelectOption>
            {proveedores.map((p) => (
              <NativeSelectOption key={p.id} value={p.id}>{p.nombre}</NativeSelectOption>
            ))}
          </NativeSelect>
        </Campo>
        <Campo id="costo" etiqueta="Costo (COP)" error={errores.costo}>
          <Input id="costo" type="number" min="0" step="0.01" inputMode="decimal" value={valores.costo} onChange={cambiar("costo")} {...invalido("costo")} />
        </Campo>
        <Campo id="precio" etiqueta="Precio de venta (COP)" error={errores.precio} ayuda="Debe ser mayor o igual al costo.">
          <Input id="precio" type="number" min="0" step="0.01" inputMode="decimal" value={valores.precio} onChange={cambiar("precio")} {...invalido("precio")} />
        </Campo>
        <Campo id="descripcion" etiqueta="Descripción (opcional)" error={errores.descripcion} className="space-y-1.5 sm:col-span-2">
          <Textarea id="descripcion" rows={2} value={valores.descripcion} onChange={cambiar("descripcion")} {...invalido("descripcion")} />
        </Campo>
      </div>

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onCerrar} disabled={guardando}>
          Cancelar
        </Button>
        <Button type="submit" disabled={guardando}>
          {guardando && <Loader2 className="animate-spin" />}
          {editando ? "Guardar cambios" : "Crear producto"}
        </Button>
      </DialogFooter>
    </form>
  );
}
