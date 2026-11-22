// /api/sucursales - listar (GET) y crear (POST). Permisos en src/lib/permisos.ts
import { rutasColeccion } from "@/server/http/rutas-crud";
import { servicioSucursales } from "@/server/servicios/catalogos";
import { PERMISOS } from "@/lib/permisos";

export const { GET, POST } = rutasColeccion(servicioSucursales, PERMISOS.sucursales);
