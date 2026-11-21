import type { Metadata } from "next";
import { protegerPagina } from "@/server/auth/autorizacion";
import { EnConstruccion } from "@/components/layout/en-construccion";

export const metadata: Metadata = { title: "Agentes de IA" };

export default async function Pagina() {
  await protegerPagina("/agentes");
  return (
    <EnConstruccion
      titulo="Agentes de IA"
      fase={7}
      descripcion="Analista de inventario, analista comercial e informe ejecutivo, con validación humana de las recomendaciones."
    />
  );
}
