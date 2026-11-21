import type { Metadata } from "next";
import { protegerPagina } from "@/server/auth/autorizacion";
import { EnConstruccion } from "@/components/layout/en-construccion";

export const metadata: Metadata = { title: "Sucursales" };

export default async function Pagina() {
  await protegerPagina("/catalogos/sucursales");
  return (
    <EnConstruccion
      titulo="Sucursales"
      fase={3}
      descripcion="Gestión de las sucursales de la cadena."
    />
  );
}
