// POST /api/ordenes-compra/{id}/aprobar - el gerente aprueba un borrador (RF-21, RN-07)
import { rutaAccion } from "@/server/http/rutas-crud";
import { servicioCompras } from "@/server/servicios/compras";
import { PERMISOS_COMPRAS } from "@/lib/permisos";

export const POST = rutaAccion(PERMISOS_COMPRAS.aprobar, (id, cuerpo, ctx) => servicioCompras.aprobar(id, cuerpo, ctx), { cuerpoOpcional: true });
