"use client";

import { useState, type FormEvent } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Campo } from "@/components/comun/campo";
import { api, ErrorCliente } from "@/lib/api-cliente";
import { esquemaSucursal, esquemaSucursalEdicion } from "@/lib/esquemas/catalogos";
import type { Sucursal } from "./tipos";

type Valores = { codigo: string; nombre: string; ciudad: string; direccion: string };
const VACIO: Valores = { codigo: "", nombre: "", ciudad: "", direccion: "" };

function valoresDe(sucursal: Sucursal | null): Valores {
  if (!sucursal) return VACIO;
  return { codigo: sucursal.codigo, nombre: sucursal.nombre, ciudad: sucursal.ciudad, direccion: sucursal.direccion };
}

export function FormularioSucursal({
  abierto, sucursal, onCerrar, onGuardado,
}: {
  abierto: boolean;
  sucursal: Sucursal | null;
  onCerrar: () => void;
  onGuardado: () => void;
}) {
  return (
    <Dialog open={abierto} onOpenChange={(v) => !v && onCerrar()}>
      <DialogContent className="sm:max-w-lg">
        <Contenido
          key={sucursal?.id ?? "nuevo"}
          sucursal={sucursal}
          onCerrar={onCerrar}
          onGuardado={onGuardado}
        />
      </DialogContent>
    </Dialog>
  );
}

function Contenido({
  sucursal, onCerrar, onGuardado,
}: {
  sucursal: Sucursal | null;
  onCerrar: () => void;
  onGuardado: () => void;
}) {
  const [valores, setValores] = useState<Valores>(() => valoresDe(sucursal));
  const [errores, setErrores] = useState<Record<string, string>>({});
  const [guardando, setGuardando] = useState(false);
  const editando = sucursal !== null;

  const cambiar = (campo: keyof Valores) => (e: { target: { value: string } }) =>
    setValores((v) => ({ ...v, [campo]: e.target.value }));

  async function guardar(e: FormEvent) {
    e.preventDefault();
    const esquema = editando ? esquemaSucursalEdicion : esquemaSucursal;
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
      if (editando) await api(`/api/sucursales/${sucursal.id}`, { method: "PATCH", json: r.data });
      else await api("/api/sucursales", { method: "POST", json: r.data });
      toast.success(editando ? "Sucursal actualizada." : "Sucursal creada.");
      onGuardado();
      onCerrar();
    } catch (err) {
      if (err instanceof ErrorCliente) {
        setErrores(err.porCampo());
        toast.error(err.message);
      } else {
        toast.error("No fue posible guardar la sucursal.");
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
        <DialogTitle>{editando ? "Editar sucursal" : "Nueva sucursal"}</DialogTitle>
        <DialogDescription>
          {editando
            ? "Modifique los datos y guarde los cambios."
            : "Al crearla, se genera su inventario para todos los productos con stock 0."}
        </DialogDescription>
      </DialogHeader>
      <div className="grid gap-4 sm:grid-cols-2">
        <Campo id="codigo" etiqueta="Código" error={errores.codigo}>
          <Input id="codigo" value={valores.codigo} onChange={cambiar("codigo")} {...invalido("codigo")} />
        </Campo>
        <Campo id="nombre" etiqueta="Nombre" error={errores.nombre}>
          <Input id="nombre" value={valores.nombre} onChange={cambiar("nombre")} {...invalido("nombre")} />
        </Campo>
        <Campo id="ciudad" etiqueta="Ciudad" error={errores.ciudad}>
          <Input id="ciudad" value={valores.ciudad} onChange={cambiar("ciudad")} {...invalido("ciudad")} />
        </Campo>
        <Campo id="direccion" etiqueta="Dirección" error={errores.direccion}>
          <Input id="direccion" value={valores.direccion} onChange={cambiar("direccion")} {...invalido("direccion")} />
        </Campo>
      </div>
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onCerrar} disabled={guardando}>Cancelar</Button>
        <Button type="submit" disabled={guardando}>
          {guardando && <Loader2 className="animate-spin" />}
          {editando ? "Guardar cambios" : "Crear sucursal"}
        </Button>
      </DialogFooter>
    </form>
  );
}
