// ============================================================
// Catalogo de productos (docs/04-REQ RF-09). Modulo de referencia:
// los demas catalogos siguen esta misma estructura.
// ============================================================
import type { Metadata } from "next";
import { protegerPagina } from "@/server/auth/autorizacion";
import { accionesPermitidas } from "@/lib/permisos";
import { ModuloProductos } from "./modulo-productos";

export const metadata: Metadata = { title: "Productos" };

export default async function Pagina() {
  const sesion = await protegerPagina("/catalogos/productos");
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Productos</h1>
        <p className="text-sm text-muted-foreground">Catálogo de productos con su categoría, proveedor principal, costo y precio.</p>
      </div>
      <ModuloProductos acciones={accionesPermitidas("productos", sesion.rol)} />
    </div>
  );
}
