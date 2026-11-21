import type { Metadata } from "next";
import { protegerPagina } from "@/server/auth/autorizacion";
import { EnConstruccion } from "@/components/layout/en-construccion";

export const metadata: Metadata = { title: "Usuarios" };

export default async function Pagina() {
  await protegerPagina("/usuarios");
  return (
    <EnConstruccion
      titulo="Usuarios"
      fase={3}
      descripcion="Gestión de usuarios, roles y sucursales."
    />
  );
}
