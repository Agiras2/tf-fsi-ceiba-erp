import type { Metadata } from "next";
import { protegerPagina } from "@/server/auth/autorizacion";
import { accionesPermitidas } from "@/lib/permisos";
import { ModuloProveedores } from "./modulo-proveedores";

export const metadata: Metadata = { title: "Proveedores" };

export default async function Pagina() {
  const sesion = await protegerPagina("/catalogos/proveedores");
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Proveedores</h1>
        <p className="text-sm text-muted-foreground">Gestión de proveedores y su tiempo de entrega.</p>
      </div>
      <ModuloProveedores acciones={accionesPermitidas("proveedores", sesion.rol)} />
    </div>
  );
}
