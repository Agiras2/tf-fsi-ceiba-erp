import type { Metadata } from "next";
import { protegerPagina } from "@/server/auth/autorizacion";
import { EnConstruccion } from "@/components/layout/en-construccion";

export const metadata: Metadata = { title: "Dashboard" };

export default async function Pagina() {
  await protegerPagina("/dashboard");
  return (
    <EnConstruccion
      titulo="Dashboard"
      fase={5}
      descripcion="Indicadores clave (KPI), gráficos, filtros por periodo, sucursal y categoría, e interpretación automática de los resultados."
    />
  );
}
