import type { Metadata } from "next";
import { protegerPagina } from "@/server/auth/autorizacion";
import { accionesVentas, puedeLeer } from "@/lib/permisos";
import { ModuloVentas } from "./modulo-ventas";

export const metadata: Metadata = { title: "Ventas" };

export default async function Pagina() {
  const sesion = await protegerPagina("/ventas");
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Ventas</h1>
        <p className="text-sm text-muted-foreground">
          Consulta de ventas y su detalle, con filtros y anulación por el gerente
          {sesion.sucursalNombre ? ` · ${sesion.sucursalNombre}` : "."}
        </p>
      </div>
      <ModuloVentas
        acciones={accionesVentas(sesion.rol)}
        verSucursales={sesion.sucursalId === null && puedeLeer("sucursales", sesion.rol)}
      />
    </div>
  );
}
