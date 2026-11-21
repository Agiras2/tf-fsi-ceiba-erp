"use client";

import { useState, type FormEvent } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Campo } from "@/components/comun/campo";
import { api, ErrorCliente } from "@/lib/api-cliente";
import { esquemaProveedor, esquemaProveedorEdicion } from "@/lib/esquemas/catalogos";
import type { Proveedor } from "./tipos";

type Valores = {
  nit: string;
  nombre: string;
  contacto: string;
  telefono: string;
  email: string;
  tiempoEntregaDias: string;
};

const VACIO: Valores = { nit: "", nombre: "", contacto: "", telefono: "", email: "", tiempoEntregaDias: "" };

function valoresDe(proveedor: Proveedor | null): Valores {
  if (!proveedor) return VACIO;
  return {
    nit: proveedor.nit,
    nombre: proveedor.nombre,
    contacto: proveedor.contacto ?? "",
    telefono: proveedor.telefono ?? "",
    email: proveedor.email ?? "",
    tiempoEntregaDias: String(proveedor.tiempoEntregaDias),
  };
}

export function FormularioProveedor({
  abierto, proveedor, onCerrar, onGuardado,
}: {
  abierto: boolean;
  proveedor: Proveedor | null;
  onCerrar: () => void;
  onGuardado: () => void;
}) {
  return (
    <Dialog open={abierto} onOpenChange={(v) => !v && onCerrar()}>
      <DialogContent className="sm:max-w-lg">
        <Contenido
          key={proveedor?.id ?? "nuevo"}
          proveedor={proveedor}
          onCerrar={onCerrar}
          onGuardado={onGuardado}
        />
      </DialogContent>
    </Dialog>
  );
}

function Contenido({
  proveedor, onCerrar, onGuardado,
}: {
  proveedor: Proveedor | null;
  onCerrar: () => void;
  onGuardado: () => void;
}) {
  const [valores, setValores] = useState<Valores>(() => valoresDe(proveedor));
  const [errores, setErrores] = useState<Record<string, string>>({});
  const [guardando, setGuardando] = useState(false);
  const editando = proveedor !== null;

  const cambiar = (campo: keyof Valores) => (e: { target: { value: string } }) =>
    setValores((v) => ({ ...v, [campo]: e.target.value }));

  async function guardar(e: FormEvent) {
    e.preventDefault();
    const esquema = editando ? esquemaProveedorEdicion : esquemaProveedor;
    const r = esquema.safeParse(valores);
    if (!r.success) {
      const porCampo: Record<string, string> = {};
      for (const i of r.error.issues) porCampo[String(i.path[0])] ??= i.message;
      setErrores(porCampo);
      return;
    }
    setErrores({});
    setGuardando(true);
    try {
      if (editando) await api(`/api/proveedores/${proveedor.id}`, { method: "PATCH", json: r.data });
      else await api("/api/proveedores", { method: "POST", json: r.data });
      toast.success(editando ? "Proveedor actualizado." : "Proveedor creado.");
      onGuardado();
      onCerrar();
    } catch (err) {
      if (err instanceof ErrorCliente) {
        setErrores(err.porCampo());
        toast.error(err.message);
      } else {
        toast.error("No fue posible guardar el proveedor.");
      }
    } finally {
      setGuardando(false);
    }
  }

  const invalido = (campo: string) => ({
    "aria-invalid": !!errores[campo],
    "aria-describedby": errores[campo] ? `${campo}-error` : undefined,
  });

  return (
    <form onSubmit={guardar} noValidate className="space-y-4">
      <DialogHeader>
        <DialogTitle>{editando ? "Editar proveedor" : "Nuevo proveedor"}</DialogTitle>
        <DialogDescription>
          {editando ? "Modifique los datos y guarde los cambios." : "Complete los datos del proveedor."}
        </DialogDescription>
      </DialogHeader>
      <div className="grid gap-4 sm:grid-cols-2">
        <Campo id="nit" etiqueta="NIT" error={errores.nit}>
          <Input id="nit" value={valores.nit} onChange={cambiar("nit")} {...invalido("nit")} />
        </Campo>
        <Campo id="tiempoEntregaDias" etiqueta="Tiempo de entrega (días)" error={errores.tiempoEntregaDias}>
          <Input id="tiempoEntregaDias" type="number" min="1" max="60" value={valores.tiempoEntregaDias} onChange={cambiar("tiempoEntregaDias")} {...invalido("tiempoEntregaDias")} />
        </Campo>
        <Campo id="nombre" etiqueta="Nombre" error={errores.nombre} className="space-y-1.5 sm:col-span-2">
          <Input id="nombre" value={valores.nombre} onChange={cambiar("nombre")} {...invalido("nombre")} />
        </Campo>
        <Campo id="contacto" etiqueta="Contacto (opcional)" error={errores.contacto}>
          <Input id="contacto" value={valores.contacto} onChange={cambiar("contacto")} {...invalido("contacto")} />
        </Campo>
        <Campo id="telefono" etiqueta="Teléfono (opcional)" error={errores.telefono}>
          <Input id="telefono" value={valores.telefono} onChange={cambiar("telefono")} {...invalido("telefono")} />
        </Campo>
        <Campo id="email" etiqueta="Correo (opcional)" error={errores.email} className="space-y-1.5 sm:col-span-2">
          <Input id="email" type="email" value={valores.email} onChange={cambiar("email")} {...invalido("email")} />
        </Campo>
      </div>
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onCerrar} disabled={guardando}>Cancelar</Button>
        <Button type="submit" disabled={guardando}>
          {guardando && <Loader2 className="animate-spin" />}
          {editando ? "Guardar cambios" : "Crear proveedor"}
        </Button>
      </DialogFooter>
    </form>
  );
}
