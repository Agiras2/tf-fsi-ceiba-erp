import type { Metadata } from "next";
import { protegerPagina } from "@/server/auth/autorizacion";
import { EnConstruccion } from "@/components/layout/en-construccion";

export const metadata: Metadata = { title: "Proveedores" };

export default async function Pagina() {
  await protegerPagina("/catalogos/proveedores");
  return (
    <EnConstruccion
      titulo="Proveedores"
      fase={3}
      descripcion="Gestión de proveedores y su tiempo de entrega."
    />
  );
}
