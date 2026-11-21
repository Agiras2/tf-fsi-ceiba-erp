import type { Metadata } from "next";
import { protegerPagina } from "@/server/auth/autorizacion";
import { EnConstruccion } from "@/components/layout/en-construccion";

export const metadata: Metadata = { title: "Ventas" };

export default async function Pagina() {
  await protegerPagina("/ventas");
  return (
    <EnConstruccion
      titulo="Ventas"
      fase={4}
      descripcion="Consulta de ventas y su detalle con filtros, y anulación por el gerente con restitución del inventario."
    />
  );
}
