// /api/categorias/{id} - detalle (GET), edicion (PATCH) y eliminacion o desactivacion (DELETE)
import { rutasRecurso } from "@/server/http/rutas-crud";
import { servicioCategorias } from "@/server/servicios/catalogos";
import { PERMISOS } from "@/lib/permisos";

export const { GET, PATCH, DELETE } = rutasRecurso(servicioCategorias, PERMISOS.categorias);
