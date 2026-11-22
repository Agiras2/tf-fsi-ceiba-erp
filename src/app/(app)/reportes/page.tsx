// ============================================================
// Reportes exportables en CSV y alertas de inventario (docs/04-REQ RF-28 y RF-30)
// ============================================================
import type { Metadata } from "next";
import { protegerPagina } from "@/server/auth/autorizacion";
import { puedeLeer, reportesPermitidos } from "@/lib/permisos";
import { ModuloReportes } from "./modulo-reportes";

export const metadata: Metadata = { title: "Reportes" };

export default async function Pagina() {
  const sesion = await protegerPagina("/reportes");
  const todasLasSucursales = sesion.sucursalId === null;
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Reportes</h1>
        <p className="text-sm text-muted-foreground">
          Descarga en CSV con los filtros elegidos. Los archivos usan punto y coma como separador y coma decimal, para abrirlos
          directamente en Excel{todasLasSucursales ? "." : ` · ${sesion.sucursalNombre}.`}
        </p>
      </div>
      <ModuloReportes
        permitidos={reportesPermitidos(sesion.rol)}
        verSucursales={todasLasSucursales && puedeLeer("sucursales", sesion.rol)}
        verCategorias={puedeLeer("categorias", sesion.rol)}
      />
    </div>
  );
}
