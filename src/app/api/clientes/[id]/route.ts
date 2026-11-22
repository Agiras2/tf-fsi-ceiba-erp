// /api/clientes/{id} - detalle (GET), edicion (PATCH) y eliminacion o desactivacion (DELETE)
import { rutasRecurso } from "@/server/http/rutas-crud";
import { servicioClientes } from "@/server/servicios/catalogos";
import { PERMISOS } from "@/lib/permisos";

export const { GET, PATCH, DELETE } = rutasRecurso(servicioClientes, PERMISOS.clientes);
