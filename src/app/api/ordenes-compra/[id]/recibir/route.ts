// POST /api/ordenes-compra/{id}/recibir - bodega registra la recepcion completa (RF-22, RN-08)
import { rutaAccion } from "@/server/http/rutas-crud";
import { servicioCompras } from "@/server/servicios/compras";
import { PERMISOS_COMPRAS } from "@/lib/permisos";

export const POST = rutaAccion(PERMISOS_COMPRAS.recibir, (id, cuerpo, ctx) => servicioCompras.recibir(id, cuerpo, ctx), { cuerpoOpcional: true });
