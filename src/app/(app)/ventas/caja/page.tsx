import type { Metadata } from "next";
import { protegerPagina } from "@/server/auth/autorizacion";
import { EnConstruccion } from "@/components/layout/en-construccion";

export const metadata: Metadata = { title: "Caja" };

export default async function Pagina() {
  await protegerPagina("/ventas/caja");
  return (
    <EnConstruccion
      titulo="Caja"
      fase={4}
      descripcion="Registro de ventas con varios productos; el servidor calcula precios y totales y descuenta el inventario en una transacción."
    />
  );
}
