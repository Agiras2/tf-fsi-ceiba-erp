import type { Metadata } from "next";
import Link from "next/link";
import { ShieldAlert } from "lucide-react";

export const metadata: Metadata = { title: "Sin permiso" };

export default function SinPermiso() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 p-6 text-center">
      <ShieldAlert className="h-10 w-10 text-destructive" aria-hidden />
      <h1 className="text-2xl font-semibold">No tiene permiso para ver esta página</h1>
      <p className="max-w-md text-sm text-muted-foreground">
        Su rol no tiene acceso a este módulo. Si cree que es un error, comuníquese con el administrador.
      </p>
      <Link href="/" className="text-sm font-medium underline underline-offset-4">
        Volver al inicio
      </Link>
    </main>
  );
}
