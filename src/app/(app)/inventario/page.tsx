import type { Metadata } from "next";
import { protegerPagina } from "@/server/auth/autorizacion";
import { EnConstruccion } from "@/components/layout/en-construccion";

export const metadata: Metadata = { title: "Inventario" };

export default async function Pagina() {
  await protegerPagina("/inventario");
  return (
    <EnConstruccion
      titulo="Inventario"
      fase={3}
      descripcion="Existencias por sucursal con su estado (agotado, bajo mínimo, normal, sobrestock), ajustes con motivo y kardex."
    />
  );
}
