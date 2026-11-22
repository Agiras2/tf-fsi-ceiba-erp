"use client";

import { useState, type FormEvent } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Campo } from "@/components/comun/campo";
import { api, ErrorCliente } from "@/lib/api-cliente";
import { esquemaCliente, esquemaClienteEdicion } from "@/lib/esquemas/catalogos";
import type { Cliente } from "./tipos";

type Valores = { documento: string; nombre: string; email: string; telefono: string };
const VACIO: Valores = { documento: "", nombre: "", email: "", telefono: "" };

function valoresDe(cliente: Cliente | null): Valores {
  if (!cliente) return VACIO;
  return {
    documento: cliente.documento,
    nombre: cliente.nombre,
    email: cliente.email ?? "",
    telefono: cliente.telefono ?? "",
  };
}

export function FormularioCliente({
  abierto, cliente, onCerrar, onGuardado,
}: {
  abierto: boolean;
  cliente: Cliente | null;
  onCerrar: () => void;
  onGuardado: (cliente?: Cliente) => void;
}) {
  return (
    <Dialog open={abierto} onOpenChange={(v) => !v && onCerrar()}>
      <DialogContent className="sm:max-w-lg">
        <Contenido
          key={cliente?.id ?? "nuevo"}
          cliente={cliente}
          onCerrar={onCerrar}
          onGuardado={onGuardado}
        />
      </DialogContent>
    </Dialog>
  );
}

function Contenido({
  cliente, onCerrar, onGuardado,
}: {
  cliente: Cliente | null;
  onCerrar: () => void;
  onGuardado: (cliente?: Cliente) => void;
}) {
  const [valores, setValores] = useState<Valores>(() => valoresDe(cliente));
  const [errores, setErrores] = useState<Record<string, string>>({});
  const [guardando, setGuardando] = useState(false);
  const editando = cliente !== null;

  const cambiar = (campo: keyof Valores) => (e: { target: { value: string } }) =>
    setValores((v) => ({ ...v, [campo]: e.target.value }));

  async function guardar(e: FormEvent) {
    e.preventDefault();
    const esquema = editando ? esquemaClienteEdicion : esquemaCliente;
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
      const guardado = editando
        ? await api<Cliente>(`/api/clientes/${cliente.id}`, { method: "PATCH", json: r.data })
        : await api<Cliente>("/api/clientes", { method: "POST", json: r.data });
      toast.success(editando ? "Cliente actualizado." : "Cliente creado.");
      // La caja usa el cliente devuelto para seleccionarlo en la venta (Fase 4).
      onGuardado(guardado);
      onCerrar();
    } catch (err) {
      if (err instanceof ErrorCliente) {
        setErrores(err.porCampo());
        toast.error(err.message);
      } else {
        toast.error("No fue posible guardar el cliente.");
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
        <DialogTitle>{editando ? "Editar cliente" : "Nuevo cliente"}</DialogTitle>
        <DialogDescription>
          {editando ? "Modifique los datos y guarde los cambios." : "Complete los datos del cliente."}
        </DialogDescription>
      </DialogHeader>
      <div className="grid gap-4 sm:grid-cols-2">
        <Campo id="documento" etiqueta="Documento" error={errores.documento}>
          <Input id="documento" value={valores.documento} onChange={cambiar("documento")} {...invalido("documento")} />
        </Campo>
        <Campo id="nombre" etiqueta="Nombre" error={errores.nombre}>
          <Input id="nombre" value={valores.nombre} onChange={cambiar("nombre")} {...invalido("nombre")} />
        </Campo>
        <Campo id="email" etiqueta="Correo (opcional)" error={errores.email}>
          <Input id="email" type="email" value={valores.email} onChange={cambiar("email")} {...invalido("email")} />
        </Campo>
        <Campo id="telefono" etiqueta="Teléfono (opcional)" error={errores.telefono}>
          <Input id="telefono" value={valores.telefono} onChange={cambiar("telefono")} {...invalido("telefono")} />
        </Campo>
      </div>
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onCerrar} disabled={guardando}>Cancelar</Button>
        <Button type="submit" disabled={guardando}>
          {guardando && <Loader2 className="animate-spin" />}
          {editando ? "Guardar cambios" : "Crear cliente"}
        </Button>
      </DialogFooter>
    </form>
  );
}
