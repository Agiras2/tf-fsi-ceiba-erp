import type { Metadata } from "next";
import { protegerPagina } from "@/server/auth/autorizacion";
import { EnConstruccion } from "@/components/layout/en-construccion";

export const metadata: Metadata = { title: "Clientes" };

export default async function Pagina() {
  await protegerPagina("/catalogos/clientes");
  return (
    <EnConstruccion
      titulo="Clientes"
      fase={3}
      descripcion="Gestión de clientes ficticios."
    />
  );
}
