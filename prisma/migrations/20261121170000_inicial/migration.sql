
-- CreateEnum
CREATE TYPE "Rol" AS ENUM ('ADMIN', 'GERENTE', 'BODEGA', 'CAJERO');

-- CreateEnum
CREATE TYPE "MedioPago" AS ENUM ('EFECTIVO', 'TARJETA_DEBITO', 'TARJETA_CREDITO', 'TRANSFERENCIA');

-- CreateEnum
CREATE TYPE "EstadoVenta" AS ENUM ('REGISTRADA', 'ANULADA');

-- CreateEnum
CREATE TYPE "EstadoOrdenCompra" AS ENUM ('BORRADOR', 'APROBADA', 'RECIBIDA', 'CANCELADA');

-- CreateEnum
CREATE TYPE "OrigenOrdenCompra" AS ENUM ('MANUAL', 'AGENTE_INVENTARIO');

-- CreateEnum
CREATE TYPE "TipoMovimiento" AS ENUM ('CARGA_INICIAL', 'VENTA', 'ANULACION_VENTA', 'RECEPCION_COMPRA', 'AJUSTE_ENTRADA', 'AJUSTE_SALIDA');

-- CreateEnum
CREATE TYPE "TipoAgente" AS ENUM ('INVENTARIO', 'COMERCIAL', 'INFORME_EJECUTIVO');

-- CreateEnum
CREATE TYPE "EstadoEjecucion" AS ENUM ('EN_CURSO', 'COMPLETADA', 'FALLIDA');

-- CreateEnum
CREATE TYPE "TipoRecomendacion" AS ENUM ('REPOSICION', 'PROMOCION', 'LIQUIDACION', 'REVISION_SUCURSAL', 'OTRA');

-- CreateEnum
CREATE TYPE "Prioridad" AS ENUM ('ALTA', 'MEDIA', 'BAJA');

-- CreateEnum
CREATE TYPE "EstadoRecomendacion" AS ENUM ('PENDIENTE', 'ACEPTADA', 'DESCARTADA');

-- CreateEnum
CREATE TYPE "RolMensaje" AS ENUM ('USUARIO', 'ASISTENTE');

-- CreateTable
CREATE TABLE "sucursal" (
    "id" SERIAL NOT NULL,
    "codigo" VARCHAR(10) NOT NULL,
    "nombre" VARCHAR(80) NOT NULL,
    "ciudad" VARCHAR(60) NOT NULL,
    "direccion" VARCHAR(120) NOT NULL,
    "activa" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "sucursal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "usuario" (
    "id" SERIAL NOT NULL,
    "nombre" VARCHAR(100) NOT NULL,
    "email" VARCHAR(120) NOT NULL,
    "password_hash" VARCHAR(100) NOT NULL,
    "rol" "Rol" NOT NULL,
    "sucursal_id" INTEGER,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "ultimo_acceso" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "usuario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "categoria" (
    "id" SERIAL NOT NULL,
    "nombre" VARCHAR(60) NOT NULL,
    "descripcion" VARCHAR(200),
    "activa" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "categoria_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "proveedor" (
    "id" SERIAL NOT NULL,
    "nit" VARCHAR(20) NOT NULL,
    "nombre" VARCHAR(120) NOT NULL,
    "contacto" VARCHAR(100),
    "telefono" VARCHAR(30),
    "email" VARCHAR(120),
    "tiempo_entrega_dias" INTEGER NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "proveedor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "producto" (
    "id" SERIAL NOT NULL,
    "sku" VARCHAR(20) NOT NULL,
    "nombre" VARCHAR(120) NOT NULL,
    "descripcion" VARCHAR(300),
    "categoria_id" INTEGER NOT NULL,
    "proveedor_id" INTEGER NOT NULL,
    "unidad" VARCHAR(20) NOT NULL,
    "costo" DECIMAL(14,2) NOT NULL,
    "precio" DECIMAL(14,2) NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "producto_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cliente" (
    "id" SERIAL NOT NULL,
    "documento" VARCHAR(20) NOT NULL,
    "nombre" VARCHAR(120) NOT NULL,
    "email" VARCHAR(120),
    "telefono" VARCHAR(30),
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "cliente_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inventario" (
    "id" SERIAL NOT NULL,
    "producto_id" INTEGER NOT NULL,
    "sucursal_id" INTEGER NOT NULL,
    "stock" INTEGER NOT NULL DEFAULT 0,
    "stock_minimo" INTEGER NOT NULL,
    "stock_maximo" INTEGER NOT NULL,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "inventario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "movimiento_inventario" (
    "id" SERIAL NOT NULL,
    "producto_id" INTEGER NOT NULL,
    "sucursal_id" INTEGER NOT NULL,
    "tipo" "TipoMovimiento" NOT NULL,
    "cantidad" INTEGER NOT NULL,
    "stock_resultante" INTEGER NOT NULL,
    "referencia_tipo" VARCHAR(30),
    "referencia_id" INTEGER,
    "motivo" VARCHAR(200),
    "usuario_id" INTEGER,
    "fecha" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "movimiento_inventario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "venta" (
    "id" SERIAL NOT NULL,
    "sucursal_id" INTEGER NOT NULL,
    "cajero_id" INTEGER NOT NULL,
    "cliente_id" INTEGER,
    "fecha" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "medio_pago" "MedioPago" NOT NULL,
    "estado" "EstadoVenta" NOT NULL DEFAULT 'REGISTRADA',
    "total" DECIMAL(14,2) NOT NULL,
    "costo_total" DECIMAL(14,2) NOT NULL,
    "anulada_por_id" INTEGER,
    "fecha_anulacion" TIMESTAMPTZ(6),
    "motivo_anulacion" VARCHAR(200),

    CONSTRAINT "venta_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "detalle_venta" (
    "id" SERIAL NOT NULL,
    "venta_id" INTEGER NOT NULL,
    "producto_id" INTEGER NOT NULL,
    "cantidad" INTEGER NOT NULL,
    "precio_unitario" DECIMAL(14,2) NOT NULL,
    "costo_unitario" DECIMAL(14,2) NOT NULL,
    "subtotal" DECIMAL(14,2) NOT NULL,

    CONSTRAINT "detalle_venta_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "orden_compra" (
    "id" SERIAL NOT NULL,
    "proveedor_id" INTEGER NOT NULL,
    "sucursal_id" INTEGER NOT NULL,
    "estado" "EstadoOrdenCompra" NOT NULL DEFAULT 'BORRADOR',
    "origen" "OrigenOrdenCompra" NOT NULL DEFAULT 'MANUAL',
    "ejecucion_agente_id" INTEGER,
    "creada_por_id" INTEGER,
    "aprobada_por_id" INTEGER,
    "recibida_por_id" INTEGER,
    "fecha_aprobacion" TIMESTAMPTZ(6),
    "fecha_esperada" DATE NOT NULL,
    "fecha_recepcion" DATE,
    "motivo_cancelacion" VARCHAR(200),
    "total" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "observaciones" VARCHAR(500),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "orden_compra_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "detalle_orden_compra" (
    "id" SERIAL NOT NULL,
    "orden_compra_id" INTEGER NOT NULL,
    "producto_id" INTEGER NOT NULL,
    "cantidad" INTEGER NOT NULL,
    "costo_unitario" DECIMAL(14,2) NOT NULL,
    "subtotal" DECIMAL(14,2) NOT NULL,

    CONSTRAINT "detalle_orden_compra_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ejecucion_agente" (
    "id" SERIAL NOT NULL,
    "agente" "TipoAgente" NOT NULL,
    "estado" "EstadoEjecucion" NOT NULL DEFAULT 'EN_CURSO',
    "parametros" JSONB NOT NULL DEFAULT '{}',
    "herramientas_usadas" JSONB NOT NULL DEFAULT '[]',
    "resultado" JSONB,
    "resumen" TEXT,
    "modelo" VARCHAR(60),
    "duracion_ms" INTEGER,
    "error" TEXT,
    "ejecutado_por_id" INTEGER NOT NULL,
    "ejecucion_padre_id" INTEGER,
    "ejecucion_entrada_id" INTEGER,
    "fecha_inicio" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fecha_fin" TIMESTAMPTZ(6),

    CONSTRAINT "ejecucion_agente_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "recomendacion" (
    "id" SERIAL NOT NULL,
    "ejecucion_id" INTEGER NOT NULL,
    "tipo" "TipoRecomendacion" NOT NULL,
    "prioridad" "Prioridad" NOT NULL,
    "producto_id" INTEGER,
    "sucursal_id" INTEGER,
    "titulo" VARCHAR(150) NOT NULL,
    "justificacion" TEXT NOT NULL,
    "estado" "EstadoRecomendacion" NOT NULL DEFAULT 'PENDIENTE',
    "decidida_por_id" INTEGER,
    "fecha_decision" TIMESTAMPTZ(6),
    "comentario_decision" VARCHAR(300),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "recomendacion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "conversacion" (
    "id" SERIAL NOT NULL,
    "usuario_id" INTEGER NOT NULL,
    "titulo" VARCHAR(120) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "conversacion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mensaje_chat" (
    "id" SERIAL NOT NULL,
    "conversacion_id" INTEGER NOT NULL,
    "rol" "RolMensaje" NOT NULL,
    "contenido" TEXT NOT NULL,
    "herramientas_usadas" JSONB,
    "modelo" VARCHAR(60),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "mensaje_chat_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "auditoria" (
    "id" SERIAL NOT NULL,
    "usuario_id" INTEGER,
    "accion" VARCHAR(40) NOT NULL,
    "entidad" VARCHAR(40) NOT NULL,
    "entidad_id" INTEGER,
    "detalle" JSONB,
    "ip" VARCHAR(45),
    "fecha" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "auditoria_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "sucursal_codigo_key" ON "sucursal"("codigo");

-- CreateIndex
CREATE UNIQUE INDEX "usuario_email_key" ON "usuario"("email");

-- CreateIndex
CREATE INDEX "usuario_sucursal_id_idx" ON "usuario"("sucursal_id");

-- CreateIndex
CREATE UNIQUE INDEX "categoria_nombre_key" ON "categoria"("nombre");

-- CreateIndex
CREATE UNIQUE INDEX "proveedor_nit_key" ON "proveedor"("nit");

-- CreateIndex
CREATE UNIQUE INDEX "producto_sku_key" ON "producto"("sku");

-- CreateIndex
CREATE INDEX "producto_categoria_id_idx" ON "producto"("categoria_id");

-- CreateIndex
CREATE INDEX "producto_proveedor_id_idx" ON "producto"("proveedor_id");

-- CreateIndex
CREATE UNIQUE INDEX "cliente_documento_key" ON "cliente"("documento");

-- CreateIndex
CREATE INDEX "inventario_sucursal_id_idx" ON "inventario"("sucursal_id");

-- CreateIndex
CREATE UNIQUE INDEX "inventario_producto_id_sucursal_id_key" ON "inventario"("producto_id", "sucursal_id");

-- CreateIndex
CREATE INDEX "movimiento_inventario_producto_id_sucursal_id_fecha_idx" ON "movimiento_inventario"("producto_id", "sucursal_id", "fecha");

-- CreateIndex
CREATE INDEX "movimiento_inventario_fecha_idx" ON "movimiento_inventario"("fecha");

-- CreateIndex
CREATE INDEX "venta_sucursal_id_fecha_idx" ON "venta"("sucursal_id", "fecha");

-- CreateIndex
CREATE INDEX "venta_fecha_idx" ON "venta"("fecha");

-- CreateIndex
CREATE INDEX "venta_cliente_id_idx" ON "venta"("cliente_id");

-- CreateIndex
CREATE INDEX "detalle_venta_venta_id_idx" ON "detalle_venta"("venta_id");

-- CreateIndex
CREATE INDEX "detalle_venta_producto_id_idx" ON "detalle_venta"("producto_id");

-- CreateIndex
CREATE INDEX "orden_compra_estado_idx" ON "orden_compra"("estado");

-- CreateIndex
CREATE INDEX "orden_compra_sucursal_id_estado_idx" ON "orden_compra"("sucursal_id", "estado");

-- CreateIndex
CREATE INDEX "orden_compra_proveedor_id_idx" ON "orden_compra"("proveedor_id");

-- CreateIndex
CREATE INDEX "orden_compra_fecha_esperada_idx" ON "orden_compra"("fecha_esperada");

-- CreateIndex
CREATE INDEX "detalle_orden_compra_orden_compra_id_idx" ON "detalle_orden_compra"("orden_compra_id");

-- CreateIndex
CREATE INDEX "detalle_orden_compra_producto_id_idx" ON "detalle_orden_compra"("producto_id");

-- CreateIndex
CREATE INDEX "ejecucion_agente_agente_fecha_inicio_idx" ON "ejecucion_agente"("agente", "fecha_inicio");

-- CreateIndex
CREATE INDEX "recomendacion_estado_idx" ON "recomendacion"("estado");

-- CreateIndex
CREATE INDEX "recomendacion_ejecucion_id_idx" ON "recomendacion"("ejecucion_id");

-- CreateIndex
CREATE INDEX "conversacion_usuario_id_idx" ON "conversacion"("usuario_id");

-- CreateIndex
CREATE INDEX "mensaje_chat_conversacion_id_idx" ON "mensaje_chat"("conversacion_id");

-- CreateIndex
CREATE INDEX "auditoria_fecha_idx" ON "auditoria"("fecha");

-- CreateIndex
CREATE INDEX "auditoria_entidad_entidad_id_idx" ON "auditoria"("entidad", "entidad_id");

-- AddForeignKey
ALTER TABLE "usuario" ADD CONSTRAINT "usuario_sucursal_id_fkey" FOREIGN KEY ("sucursal_id") REFERENCES "sucursal"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "producto" ADD CONSTRAINT "producto_categoria_id_fkey" FOREIGN KEY ("categoria_id") REFERENCES "categoria"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "producto" ADD CONSTRAINT "producto_proveedor_id_fkey" FOREIGN KEY ("proveedor_id") REFERENCES "proveedor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventario" ADD CONSTRAINT "inventario_producto_id_fkey" FOREIGN KEY ("producto_id") REFERENCES "producto"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventario" ADD CONSTRAINT "inventario_sucursal_id_fkey" FOREIGN KEY ("sucursal_id") REFERENCES "sucursal"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "movimiento_inventario" ADD CONSTRAINT "movimiento_inventario_producto_id_fkey" FOREIGN KEY ("producto_id") REFERENCES "producto"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "movimiento_inventario" ADD CONSTRAINT "movimiento_inventario_sucursal_id_fkey" FOREIGN KEY ("sucursal_id") REFERENCES "sucursal"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "movimiento_inventario" ADD CONSTRAINT "movimiento_inventario_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "venta" ADD CONSTRAINT "venta_sucursal_id_fkey" FOREIGN KEY ("sucursal_id") REFERENCES "sucursal"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "venta" ADD CONSTRAINT "venta_cajero_id_fkey" FOREIGN KEY ("cajero_id") REFERENCES "usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "venta" ADD CONSTRAINT "venta_cliente_id_fkey" FOREIGN KEY ("cliente_id") REFERENCES "cliente"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "venta" ADD CONSTRAINT "venta_anulada_por_id_fkey" FOREIGN KEY ("anulada_por_id") REFERENCES "usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "detalle_venta" ADD CONSTRAINT "detalle_venta_venta_id_fkey" FOREIGN KEY ("venta_id") REFERENCES "venta"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "detalle_venta" ADD CONSTRAINT "detalle_venta_producto_id_fkey" FOREIGN KEY ("producto_id") REFERENCES "producto"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orden_compra" ADD CONSTRAINT "orden_compra_proveedor_id_fkey" FOREIGN KEY ("proveedor_id") REFERENCES "proveedor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orden_compra" ADD CONSTRAINT "orden_compra_sucursal_id_fkey" FOREIGN KEY ("sucursal_id") REFERENCES "sucursal"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orden_compra" ADD CONSTRAINT "orden_compra_ejecucion_agente_id_fkey" FOREIGN KEY ("ejecucion_agente_id") REFERENCES "ejecucion_agente"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orden_compra" ADD CONSTRAINT "orden_compra_creada_por_id_fkey" FOREIGN KEY ("creada_por_id") REFERENCES "usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orden_compra" ADD CONSTRAINT "orden_compra_aprobada_por_id_fkey" FOREIGN KEY ("aprobada_por_id") REFERENCES "usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orden_compra" ADD CONSTRAINT "orden_compra_recibida_por_id_fkey" FOREIGN KEY ("recibida_por_id") REFERENCES "usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "detalle_orden_compra" ADD CONSTRAINT "detalle_orden_compra_orden_compra_id_fkey" FOREIGN KEY ("orden_compra_id") REFERENCES "orden_compra"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "detalle_orden_compra" ADD CONSTRAINT "detalle_orden_compra_producto_id_fkey" FOREIGN KEY ("producto_id") REFERENCES "producto"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ejecucion_agente" ADD CONSTRAINT "ejecucion_agente_ejecutado_por_id_fkey" FOREIGN KEY ("ejecutado_por_id") REFERENCES "usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ejecucion_agente" ADD CONSTRAINT "ejecucion_agente_ejecucion_padre_id_fkey" FOREIGN KEY ("ejecucion_padre_id") REFERENCES "ejecucion_agente"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ejecucion_agente" ADD CONSTRAINT "ejecucion_agente_ejecucion_entrada_id_fkey" FOREIGN KEY ("ejecucion_entrada_id") REFERENCES "ejecucion_agente"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recomendacion" ADD CONSTRAINT "recomendacion_ejecucion_id_fkey" FOREIGN KEY ("ejecucion_id") REFERENCES "ejecucion_agente"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recomendacion" ADD CONSTRAINT "recomendacion_producto_id_fkey" FOREIGN KEY ("producto_id") REFERENCES "producto"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recomendacion" ADD CONSTRAINT "recomendacion_sucursal_id_fkey" FOREIGN KEY ("sucursal_id") REFERENCES "sucursal"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recomendacion" ADD CONSTRAINT "recomendacion_decidida_por_id_fkey" FOREIGN KEY ("decidida_por_id") REFERENCES "usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversacion" ADD CONSTRAINT "conversacion_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mensaje_chat" ADD CONSTRAINT "mensaje_chat_conversacion_id_fkey" FOREIGN KEY ("conversacion_id") REFERENCES "conversacion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "auditoria" ADD CONSTRAINT "auditoria_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

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
