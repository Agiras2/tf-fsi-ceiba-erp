import type { Metadata } from "next";
import { protegerPagina } from "@/server/auth/autorizacion";
import { EnConstruccion } from "@/components/layout/en-construccion";

export const metadata: Metadata = { title: "Categorías" };

export default async function Pagina() {
  await protegerPagina("/catalogos/categorias");
  return (
    <EnConstruccion
      titulo="Categorías"
      fase={3}
      descripcion="Gestión de las categorías de productos."
    />
  );
}
