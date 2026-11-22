// /api/usuarios - listar (GET) y crear (POST). Permisos en src/lib/permisos.ts
import { rutasColeccion } from "@/server/http/rutas-crud";
import { servicioUsuarios } from "@/server/servicios/usuarios";
import { PERMISOS } from "@/lib/permisos";

export const { GET, POST } = rutasColeccion(servicioUsuarios, PERMISOS.usuarios);
