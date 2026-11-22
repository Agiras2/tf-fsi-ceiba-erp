import type { Metadata } from "next";
import { protegerPagina } from "@/server/auth/autorizacion";
import { accionesPermitidas } from "@/lib/permisos";
import { ModuloUsuarios } from "./modulo-usuarios";

export const metadata: Metadata = { title: "Usuarios" };

export default async function Pagina() {
  const sesion = await protegerPagina("/usuarios");
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Usuarios</h1>
        <p className="text-sm text-muted-foreground">Gestión de usuarios, roles y sucursales.</p>
      </div>
      <ModuloUsuarios
        acciones={accionesPermitidas("usuarios", sesion.rol)}
        usuarioId={sesion.usuarioId}
      />
    </div>
  );
}
