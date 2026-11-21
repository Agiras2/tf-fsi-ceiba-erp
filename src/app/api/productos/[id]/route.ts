// /api/productos/{id} - detalle (GET), edicion (PATCH) y eliminacion o desactivacion (DELETE)
import { rutasRecurso } from "@/server/http/rutas-crud";
import { servicioProductos } from "@/server/servicios/catalogos";
import { PERMISOS } from "@/lib/permisos";

export const { GET, PATCH, DELETE } = rutasRecurso(servicioProductos, PERMISOS.productos);
