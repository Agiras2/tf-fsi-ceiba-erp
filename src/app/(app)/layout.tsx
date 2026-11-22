// ============================================================
// Layout de las paginas protegidas: barra lateral por rol y encabezado.
// ============================================================
import { redirect } from "next/navigation";
import { leerSesion } from "@/server/auth/autorizacion";
import { ETIQUETA_ROL, menuParaRol } from "@/lib/navegacion";
import { BarraLateral } from "@/components/layout/barra-lateral";
import { MenuUsuario } from "@/components/layout/menu-usuario";

export default async function LayoutApp({ children }: { children: React.ReactNode }) {
  const sesion = await leerSesion();
  if (!sesion) redirect("/login");
  const items = menuParaRol(sesion.rol).map(({ titulo, ruta, grupo, icono }) => ({ titulo, ruta, grupo, icono }));

  return (
    <div className="flex min-h-screen">
      <BarraLateral items={items} />
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 items-center justify-between border-b bg-background px-4 md:px-6">
          <span className="text-sm text-muted-foreground">
            {sesion.sucursalNombre ? `Sucursal: ${sesion.sucursalNombre}` : "Todas las sucursales"}
          </span>
          <MenuUsuario nombre={sesion.nombre} rol={ETIQUETA_ROL[sesion.rol]} />
        </header>
        <main className="flex-1 bg-muted/30 p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}
