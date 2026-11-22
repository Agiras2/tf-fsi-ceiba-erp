// /api/productos - listar (GET) y crear (POST). Permisos en src/lib/permisos.ts
import { rutasColeccion } from "@/server/http/rutas-crud";
import { servicioProductos } from "@/server/servicios/catalogos";
import { PERMISOS } from "@/lib/permisos";

export const { GET, POST } = rutasColeccion(servicioProductos, PERMISOS.productos);
