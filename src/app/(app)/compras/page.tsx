// ============================================================
// Ordenes de compra: borrador, aprobacion, recepcion y cancelacion
// (docs/04-REQ RF-19 a RF-23, RN-05 a RN-09; docs/03-NEG seccion 8.1)
// ============================================================
import type { Metadata } from "next";
import { protegerPagina } from "@/server/auth/autorizacion";
import { accionesCompras, puedeLeer } from "@/lib/permisos";
import { ModuloCompras } from "./modulo-compras";

export const metadata: Metadata = { title: "Órdenes de compra" };

export default async function Pagina() {
  const sesion = await protegerPagina("/compras");
  const todasLasSucursales = sesion.sucursalId === null;
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Órdenes de compra</h1>
        <p className="text-sm text-muted-foreground">
          Ciclo de abastecimiento: la bodega crea el borrador, el gerente lo aprueba o cancela y la bodega registra la recepción
          {todasLasSucursales ? "." : ` · ${sesion.sucursalNombre}.`}
        </p>
      </div>
      <ModuloCompras
        acciones={accionesCompras(sesion.rol)}
        verSucursales={todasLasSucursales && puedeLeer("sucursales", sesion.rol)}
      />
    </div>
  );
}
