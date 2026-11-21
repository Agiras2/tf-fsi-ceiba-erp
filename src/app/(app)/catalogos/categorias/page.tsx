import type { Metadata } from "next";
import { protegerPagina } from "@/server/auth/autorizacion";
import { accionesPermitidas } from "@/lib/permisos";
import { ModuloCategorias } from "./modulo-categorias";

export const metadata: Metadata = { title: "Categorías" };

export default async function Pagina() {
  const sesion = await protegerPagina("/catalogos/categorias");
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Categorías</h1>
        <p className="text-sm text-muted-foreground">Gestión de las categorías de productos.</p>
      </div>
      <ModuloCategorias acciones={accionesPermitidas("categorias", sesion.rol)} />
    </div>
  );
}
