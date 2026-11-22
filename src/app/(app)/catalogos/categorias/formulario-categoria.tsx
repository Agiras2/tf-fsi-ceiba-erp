"use client";

import { useState, type FormEvent } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Campo } from "@/components/comun/campo";
import { api, ErrorCliente } from "@/lib/api-cliente";
import { esquemaCategoria, esquemaCategoriaEdicion } from "@/lib/esquemas/catalogos";
import type { Categoria } from "./tipos";

type Valores = { nombre: string; descripcion: string };

const VACIO: Valores = { nombre: "", descripcion: "" };

function valoresDe(categoria: Categoria | null): Valores {
  if (!categoria) return VACIO;
  return { nombre: categoria.nombre, descripcion: categoria.descripcion ?? "" };
}

export function FormularioCategoria({
  abierto, categoria, onCerrar, onGuardado,
}: {
  abierto: boolean;
  categoria: Categoria | null;
  onCerrar: () => void;
  onGuardado: () => void;
}) {
  return (
    <Dialog open={abierto} onOpenChange={(v) => !v && onCerrar()}>
      <DialogContent className="sm:max-w-lg">
        <Contenido
          key={categoria?.id ?? "nuevo"}
          categoria={categoria}
          onCerrar={onCerrar}
          onGuardado={onGuardado}
        />
      </DialogContent>
    </Dialog>
  );
}

function Contenido({
  categoria, onCerrar, onGuardado,
}: {
  categoria: Categoria | null;
  onCerrar: () => void;
  onGuardado: () => void;
}) {
  const [valores, setValores] = useState<Valores>(() => valoresDe(categoria));
  const [errores, setErrores] = useState<Record<string, string>>({});
  const [guardando, setGuardando] = useState(false);
  const editando = categoria !== null;

  const cambiar = (campo: keyof Valores) => (e: { target: { value: string } }) =>
    setValores((v) => ({ ...v, [campo]: e.target.value }));

  async function guardar(e: FormEvent) {
    e.preventDefault();
    const esquema = editando ? esquemaCategoriaEdicion : esquemaCategoria;
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
      if (editando) await api(`/api/categorias/${categoria.id}`, { method: "PATCH", json: r.data });
      else await api("/api/categorias", { method: "POST", json: r.data });
      toast.success(editando ? "Categoría actualizada." : "Categoría creada.");
      onGuardado();
      onCerrar();
    } catch (err) {
      if (err instanceof ErrorCliente) {
        setErrores(err.porCampo());
        toast.error(err.message);
      } else {
        toast.error("No fue posible guardar la categoría.");
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
        <DialogTitle>{editando ? "Editar categoría" : "Nueva categoría"}</DialogTitle>
        <DialogDescription>
          {editando ? "Modifique los datos y guarde los cambios." : "Complete los datos de la categoría."}
        </DialogDescription>
      </DialogHeader>
      <div className="grid gap-4">
        <Campo id="nombre" etiqueta="Nombre" error={errores.nombre}>
          <Input id="nombre" value={valores.nombre} onChange={cambiar("nombre")} {...invalido("nombre")} />
        </Campo>
        <Campo id="descripcion" etiqueta="Descripción (opcional)" error={errores.descripcion}>
          <Textarea id="descripcion" rows={3} value={valores.descripcion} onChange={cambiar("descripcion")} {...invalido("descripcion")} />
        </Campo>
      </div>
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onCerrar} disabled={guardando}>Cancelar</Button>
        <Button type="submit" disabled={guardando}>
          {guardando && <Loader2 className="animate-spin" />}
          {editando ? "Guardar cambios" : "Crear categoría"}
        </Button>
      </DialogFooter>
    </form>
  );
}
