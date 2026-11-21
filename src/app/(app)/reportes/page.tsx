import type { Metadata } from "next";
import { protegerPagina } from "@/server/auth/autorizacion";
import { EnConstruccion } from "@/components/layout/en-construccion";

export const metadata: Metadata = { title: "Reportes" };

export default async function Pagina() {
  await protegerPagina("/reportes");
  return (
    <EnConstruccion
      titulo="Reportes"
      fase={5}
      descripcion="Exportación en CSV de ventas detalladas, inventario bajo mínimo y cumplimiento de proveedores."
    />
  );
}
