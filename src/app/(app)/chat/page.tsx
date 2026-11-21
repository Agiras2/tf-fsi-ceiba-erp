import type { Metadata } from "next";
import { protegerPagina } from "@/server/auth/autorizacion";
import { EnConstruccion } from "@/components/layout/en-construccion";

export const metadata: Metadata = { title: "Asistente (chatbot)" };

export default async function Pagina() {
  await protegerPagina("/chat");
  return (
    <EnConstruccion
      titulo="Asistente (chatbot)"
      fase={6}
      descripcion="Preguntas en lenguaje natural sobre el negocio, respondidas con datos reales del sistema."
    />
  );
}
