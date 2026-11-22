// ============================================================
// Dashboard: ocho KPI, cuatro graficos, interpretacion por reglas, alertas
// y uso de los datos por la IA (docs/04-REQ RF-24 a RF-29, docs/06-KPI)
// ============================================================
import type { Metadata } from "next";
import { protegerPagina } from "@/server/auth/autorizacion";
import { puedeLeer } from "@/lib/permisos";
import { ModuloDashboard } from "./modulo-dashboard";

export const metadata: Metadata = { title: "Dashboard" };

export default async function Pagina() {
  const sesion = await protegerPagina("/dashboard");
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
        <p className="text-sm text-muted-foreground">
          Indicadores calculados en el servidor a partir de las ventas, el inventario y las compras. Cada valor se puede verificar con
          la consulta SQL de su ficha en 06-KPI.
        </p>
      </div>
      <ModuloDashboard verSucursales={puedeLeer("sucursales", sesion.rol)} verCategorias={puedeLeer("categorias", sesion.rol)} />
    </div>
  );
}
