// POST /api/recomendaciones/{id}/descartar - el gerente descarta { comentario } (RF-40, RN-18)
import { rutaAccion } from "@/server/http/rutas-crud";
import { servicioRecomendaciones } from "@/server/servicios/recomendaciones";
import { PERMISOS_RECOMENDACIONES } from "@/lib/permisos";

export const POST = rutaAccion(PERMISOS_RECOMENDACIONES.decidir, (id, cuerpo, ctx) => servicioRecomendaciones.descartar(id, cuerpo, ctx));
