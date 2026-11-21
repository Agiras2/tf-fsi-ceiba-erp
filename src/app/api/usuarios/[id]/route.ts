// /api/usuarios/{id} - detalle (GET), edicion (PATCH) y eliminacion o desactivacion (DELETE)
import { rutasRecurso } from "@/server/http/rutas-crud";
import { servicioUsuarios } from "@/server/servicios/usuarios";
import { PERMISOS } from "@/lib/permisos";

export const { GET, PATCH, DELETE } = rutasRecurso(servicioUsuarios, PERMISOS.usuarios);
