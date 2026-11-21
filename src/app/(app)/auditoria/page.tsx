import type { Metadata } from "next";
import { protegerPagina } from "@/server/auth/autorizacion";
import { EnConstruccion } from "@/components/layout/en-construccion";

export const metadata: Metadata = { title: "Auditoría" };

export default async function Pagina() {
  await protegerPagina("/auditoria");
  return (
    <EnConstruccion
      titulo="Auditoría"
      fase={3}
      descripcion="Consulta del registro de operaciones del sistema."
    />
  );
}
