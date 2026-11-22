// ============================================================
// Caja: registro de ventas del cajero en su sucursal (docs/04-REQ RF-16, RN-01 a RN-06)
// ============================================================
import type { Metadata } from "next";
import { protegerPagina } from "@/server/auth/autorizacion";
import { accionesPermitidas } from "@/lib/permisos";
import { ModuloCaja } from "./modulo-caja";

export const metadata: Metadata = { title: "Caja" };

export default async function Pagina() {
  const sesion = await protegerPagina("/ventas/caja");
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Caja</h1>
        <p className="text-sm text-muted-foreground">
          Registro de ventas · {sesion.sucursalNombre}. El precio, el total y el descuento de inventario los calcula el servidor.
        </p>
      </div>
      <ModuloCaja permitirCrearCliente={accionesPermitidas("clientes", sesion.rol).crear} />
    </div>
  );
}
