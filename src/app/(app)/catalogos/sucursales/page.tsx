import type { Metadata } from "next";
import { protegerPagina } from "@/server/auth/autorizacion";
import { accionesPermitidas } from "@/lib/permisos";
import { ModuloSucursales } from "./modulo-sucursales";

export const metadata: Metadata = { title: "Sucursales" };

export default async function Pagina() {
  const sesion = await protegerPagina("/catalogos/sucursales");
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Sucursales</h1>
        <p className="text-sm text-muted-foreground">Gestión de las sucursales de la cadena.</p>
      </div>
      <ModuloSucursales acciones={accionesPermitidas("sucursales", sesion.rol)} />
    </div>
  );
}
