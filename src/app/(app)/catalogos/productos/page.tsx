import type { Metadata } from "next";
import { protegerPagina } from "@/server/auth/autorizacion";
import { EnConstruccion } from "@/components/layout/en-construccion";

export const metadata: Metadata = { title: "Productos" };

export default async function Pagina() {
  await protegerPagina("/catalogos/productos");
  return (
    <EnConstruccion
      titulo="Productos"
      fase={3}
      descripcion="Gestión de productos: SKU, categoría, proveedor principal, costo y precio."
    />
  );
}
