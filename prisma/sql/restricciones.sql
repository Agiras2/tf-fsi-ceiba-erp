
-- ============================================================
-- Restricciones CHECK (docs/05-DAT seccion 4). Ultima barrera de integridad
-- si falla la validacion de la aplicacion.
-- ============================================================
ALTER TABLE "inventario" ADD CONSTRAINT "inventario_stock_no_negativo" CHECK ("stock" >= 0);
ALTER TABLE "inventario" ADD CONSTRAINT "inventario_minimo_maximo" CHECK ("stock_minimo" >= 0 AND "stock_maximo" > "stock_minimo");
ALTER TABLE "producto" ADD CONSTRAINT "producto_costo_precio" CHECK ("costo" > 0 AND "precio" >= "costo");
ALTER TABLE "proveedor" ADD CONSTRAINT "proveedor_tiempo_entrega_positivo" CHECK ("tiempo_entrega_dias" > 0);
ALTER TABLE "detalle_venta" ADD CONSTRAINT "detalle_venta_cantidad_positiva" CHECK ("cantidad" > 0);
ALTER TABLE "detalle_venta" ADD CONSTRAINT "detalle_venta_montos_no_negativos" CHECK ("precio_unitario" >= 0 AND "costo_unitario" >= 0 AND "subtotal" >= 0);
ALTER TABLE "detalle_orden_compra" ADD CONSTRAINT "detalle_orden_compra_cantidad_positiva" CHECK ("cantidad" > 0);
ALTER TABLE "venta" ADD CONSTRAINT "venta_montos_no_negativos" CHECK ("total" >= 0 AND "costo_total" >= 0);
ALTER TABLE "venta" ADD CONSTRAINT "venta_anulacion_coherente" CHECK (("estado" = 'ANULADA') = ("fecha_anulacion" IS NOT NULL));
ALTER TABLE "orden_compra" ADD CONSTRAINT "orden_compra_recepcion_coherente" CHECK (("estado" = 'RECIBIDA') = ("fecha_recepcion" IS NOT NULL));
ALTER TABLE "movimiento_inventario" ADD CONSTRAINT "movimiento_stock_resultante_no_negativo" CHECK ("stock_resultante" >= 0);
