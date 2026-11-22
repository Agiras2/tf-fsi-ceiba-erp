// POST /api/ventas/{id}/anular - el gerente anula con { motivo } y se restituye el stock (RF-18, RN-10)
import { rutaAccion } from "@/server/http/rutas-crud";
import { servicioVentas } from "@/server/servicios/ventas";
import { PERMISOS_VENTAS } from "@/lib/permisos";

export const POST = rutaAccion(PERMISOS_VENTAS.anular, (id, cuerpo, ctx) => servicioVentas.anular(id, cuerpo, ctx));
