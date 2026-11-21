import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { leerSesion } from "@/server/auth/autorizacion";
import { INICIO_POR_ROL } from "@/lib/navegacion";
import { FormularioLogin } from "./formulario-login";

export const metadata: Metadata = { title: "Iniciar sesión" };

/** Solo se aceptan rutas internas como destino (evita redirecciones abiertas). */
function destinoSeguro(valor: string | string[] | undefined): string | null {
  const v = Array.isArray(valor) ? valor[0] : valor;
  return v && v.startsWith("/") && !v.startsWith("//") ? v : null;
}

export default async function PaginaLogin({ searchParams }: PageProps<"/login">) {
  const sesion = await leerSesion();
  if (sesion) redirect(INICIO_POR_ROL[sesion.rol]);
  const destino = destinoSeguro((await searchParams).destino);

  return (
    <main className="flex min-h-screen items-center justify-center bg-muted/40 p-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="space-y-1 text-center">
          <h1 className="text-3xl font-bold tracking-tight">CeibaERP</h1>
          <p className="text-sm text-muted-foreground">Supermercados Ceiba S.A.S. · organización ficticia</p>
        </div>
        <FormularioLogin destino={destino} />
        <p className="text-center text-xs text-muted-foreground">
          Trabajo final · Fundamentos de Sistemas de Información · UdeA 2026-2
        </p>
      </div>
    </main>
  );
}
