// ============================================================
// Inventario por sucursal (docs/04-REQ RF-12 a RF-15)
// ============================================================
import type { Metadata } from "next";
import { protegerPagina } from "@/server/auth/autorizacion";
import { accionesInventario, puedeLeer } from "@/lib/permisos";
import { ModuloInventario } from "./modulo-inventario";

export const metadata: Metadata = { title: "Inventario" };

export default async function Pagina() {
  const sesion = await protegerPagina("/inventario");
  const todasLasSucursales = sesion.sucursalId === null;
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Inventario</h1>
        <p className="text-sm text-muted-foreground">
          Existencias por producto y sucursal con su estado frente al stock mínimo y máximo
          {todasLasSucursales ? "." : ` · ${sesion.sucursalNombre}.`}
        </p>
      </div>
      <ModuloInventario
        acciones={accionesInventario(sesion.rol)}
        verSucursales={todasLasSucursales && puedeLeer("sucursales", sesion.rol)}
        verCategorias={puedeLeer("categorias", sesion.rol)}
      />
    </div>
  );
}
