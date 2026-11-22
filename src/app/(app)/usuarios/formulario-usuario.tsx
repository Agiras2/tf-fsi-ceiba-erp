"use client";

import { useEffect, useState, type FormEvent } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { Campo } from "@/components/comun/campo";
import { api, ErrorCliente } from "@/lib/api-cliente";
import { esquemaUsuario, esquemaUsuarioEdicion } from "@/lib/esquemas/catalogos";
import type { Pagina } from "@/lib/esquemas/comunes";
import { ETIQUETA_ROL, ROLES, type Rol } from "@/lib/navegacion";
import type { OpcionSucursal, Usuario } from "./tipos";

type Valores = {
  nombre: string;
  email: string;
  rol: Rol;
  sucursalId: string;
  password: string;
};

const VACIO: Valores = {
  nombre: "",
  email: "",
  rol: "CAJERO",
  sucursalId: "",
  password: "",
};

function valoresDe(usuario: Usuario | null): Valores {
  if (!usuario) return VACIO;
  return {
    nombre: usuario.nombre,
    email: usuario.email,
    rol: usuario.rol,
    sucursalId: usuario.sucursalId == null ? "" : String(usuario.sucursalId),
    password: "",
  };
}

export function FormularioUsuario({
  abierto, usuario, onCerrar, onGuardado,
}: {
  abierto: boolean;
  usuario: Usuario | null;
  onCerrar: () => void;
  onGuardado: () => void;
}) {
  return (
    <Dialog open={abierto} onOpenChange={(v) => !v && onCerrar()}>
      <DialogContent className="sm:max-w-lg">
        <Contenido
          key={usuario?.id ?? "nuevo"}
          usuario={usuario}
          onCerrar={onCerrar}
          onGuardado={onGuardado}
        />
      </DialogContent>
    </Dialog>
  );
}

function Contenido({
  usuario, onCerrar, onGuardado,
}: {
  usuario: Usuario | null;
  onCerrar: () => void;
  onGuardado: () => void;
}) {
  const [valores, setValores] = useState<Valores>(() => valoresDe(usuario));
  const [sucursales, setSucursales] = useState<OpcionSucursal[]>([]);
  const [errores, setErrores] = useState<Record<string, string>>({});
  const [guardando, setGuardando] = useState(false);
  const editando = usuario !== null;
  const sucursalDeshabilitada = valores.rol === "ADMIN" || valores.rol === "GERENTE";

  useEffect(() => {
    let cancelado = false;
    api<Pagina<OpcionSucursal>>("/api/sucursales?activo=true&tamano=100")
      .then((r) => {
        if (!cancelado) setSucursales(r.datos);
      })
      .catch(() => {
        if (!cancelado) toast.error("No fue posible cargar las sucursales.");
      });
    return () => {
      cancelado = true;
    };
  }, []);

  const cambiar = (campo: keyof Valores) => (e: { target: { value: string } }) => {
    const valor = e.target.value;
    setValores((v) => campo === "rol"
      ? {
          ...v,
          rol: valor as Rol,
          sucursalId: valor === "ADMIN" || valor === "GERENTE" ? "" : v.sucursalId,
        }
      : { ...v, [campo]: valor });
  };

  async function guardar(e: FormEvent) {
    e.preventDefault();
    const datosBase: Record<string, unknown> = {
      nombre: valores.nombre,
      email: valores.email,
      rol: valores.rol,
      sucursalId: sucursalDeshabilitada ? null : (valores.sucursalId || null),
    };

    if (!editando) {
      datosBase.password = valores.password;
    } else if (valores.password !== "") {
      datosBase.password = valores.password;
    }

    const esquema = editando ? esquemaUsuarioEdicion : esquemaUsuario;
    const r = esquema.safeParse(datosBase);
    if (!r.success) {
      const porCampo: Record<string, string> = {};
      for (const i of r.error.issues) porCampo[String(i.path[0])] ??= i.message;
      setErrores(porCampo);
      return;
    }

    setErrores({});
    setGuardando(true);
    try {
      if (editando) await api(`/api/usuarios/${usuario.id}`, { method: "PATCH", json: r.data });
      else await api("/api/usuarios", { method: "POST", json: r.data });
      toast.success(editando ? "Usuario actualizado." : "Usuario creado.");
      onGuardado();
      onCerrar();
    } catch (err) {
      if (err instanceof ErrorCliente) {
        setErrores(err.porCampo());
        toast.error(err.message);
      } else {
        toast.error("No fue posible guardar el usuario.");
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
        <DialogTitle>{editando ? "Editar usuario" : "Nuevo usuario"}</DialogTitle>
        <DialogDescription>
          {editando ? "Modifique los datos y guarde los cambios." : "Complete los datos del usuario."}
        </DialogDescription>
      </DialogHeader>

      <div className="grid gap-4 sm:grid-cols-2">
        <Campo id="nombre" etiqueta="Nombre" error={errores.nombre}>
          <Input id="nombre" value={valores.nombre} onChange={cambiar("nombre")} {...invalido("nombre")} />
        </Campo>
        <Campo id="email" etiqueta="Correo" error={errores.email}>
          <Input id="email" type="email" value={valores.email} onChange={cambiar("email")} {...invalido("email")} />
        </Campo>
        <Campo id="rol" etiqueta="Rol" error={errores.rol}>
          <NativeSelect id="rol" value={valores.rol} onChange={cambiar("rol")} className="w-full" {...invalido("rol")}>
            {ROLES.map((rol) => (
              <NativeSelectOption key={rol} value={rol}>{ETIQUETA_ROL[rol]}</NativeSelectOption>
            ))}
          </NativeSelect>
        </Campo>
        <Campo id="sucursalId" etiqueta="Sucursal" error={errores.sucursalId}>
          <NativeSelect
            id="sucursalId"
            value={sucursalDeshabilitada ? "" : valores.sucursalId}
            onChange={cambiar("sucursalId")}
            className="w-full"
            disabled={sucursalDeshabilitada}
            {...invalido("sucursalId")}
          >
            <NativeSelectOption value="">Sin sucursal</NativeSelectOption>
            {sucursales.map((sucursal) => (
              <NativeSelectOption key={sucursal.id} value={String(sucursal.id)}>{sucursal.nombre}</NativeSelectOption>
            ))}
          </NativeSelect>
        </Campo>
        <Campo
          id="password"
          etiqueta="Contraseña"
          error={errores.password}
          ayuda={editando ? "Déjela vacía para conservar la actual" : undefined}
          className="space-y-1.5 sm:col-span-2"
        >
          <Input id="password" type="password" value={valores.password} onChange={cambiar("password")} {...invalido("password")} />
        </Campo>
      </div>

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onCerrar} disabled={guardando}>Cancelar</Button>
        <Button type="submit" disabled={guardando}>
          {guardando && <Loader2 className="animate-spin" />}
          {editando ? "Guardar cambios" : "Crear usuario"}
        </Button>
      </DialogFooter>
    </form>
  );
}
