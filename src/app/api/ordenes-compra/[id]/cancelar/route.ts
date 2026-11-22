// POST /api/ordenes-compra/{id}/cancelar - el gerente cancela con { motivo } (RF-21, RN-07)
import { rutaAccion } from "@/server/http/rutas-crud";
import { servicioCompras } from "@/server/servicios/compras";
import { PERMISOS_COMPRAS } from "@/lib/permisos";

export const POST = rutaAccion(PERMISOS_COMPRAS.cancelar, (id, cuerpo, ctx) => servicioCompras.cancelar(id, cuerpo, ctx));
