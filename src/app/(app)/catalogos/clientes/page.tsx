import type { Metadata } from "next";
import { protegerPagina } from "@/server/auth/autorizacion";
import { accionesPermitidas } from "@/lib/permisos";
import { ModuloClientes } from "./modulo-clientes";

export const metadata: Metadata = { title: "Clientes" };

export default async function Pagina() {
  const sesion = await protegerPagina("/catalogos/clientes");
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Clientes</h1>
        <p className="text-sm text-muted-foreground">Gestión de clientes ficticios.</p>
      </div>
      <ModuloClientes acciones={accionesPermitidas("clientes", sesion.rol)} />
    </div>
  );
}
