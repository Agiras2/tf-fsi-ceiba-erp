import type { Metadata } from "next";
import { protegerPagina } from "@/server/auth/autorizacion";
import { EnConstruccion } from "@/components/layout/en-construccion";

export const metadata: Metadata = { title: "Órdenes de compra" };

export default async function Pagina() {
  await protegerPagina("/compras");
  return (
    <EnConstruccion
      titulo="Órdenes de compra"
      fase={4}
      descripcion="Ciclo de la orden de compra: borrador, aprobación, recepción y cancelación, incluidas las órdenes propuestas por el agente de inventario."
    />
  );
}
