// ============================================================
// Raiz: envia al usuario a la pagina de inicio de su rol.
// ============================================================
import { redirect } from "next/navigation";
import { leerSesion } from "@/server/auth/autorizacion";
import { INICIO_POR_ROL } from "@/lib/navegacion";

export default async function Inicio() {
  const sesion = await leerSesion();
  redirect(sesion ? INICIO_POR_ROL[sesion.rol] : "/login");
}
