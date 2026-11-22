-- ============================================================
-- CeibaERP - Verificacion manual de los ocho KPI (docs/06-KPI seccion 2)
-- Consulta independiente del codigo de la aplicacion, escrita a partir de
-- las fichas de 06-KPI. Se ejecuta en el editor SQL de Supabase y su
-- resultado se compara con las tarjetas del dashboard con los mismos filtros.
--
-- Uso: cambie SOLO los valores de la primera linea de "par" (periodo,
-- sucursal y categoria; NULL = sin filtro). Los dias se interpretan en hora
-- de Bogota. Es de solo lectura.
-- Las tablas van calificadas con "public." porque el editor SQL de Supabase
-- no siempre incluye ese esquema en el search_path. Para verificar el esquema
-- de pruebas, reemplace "public." por "test.".
-- ============================================================
WITH par AS (
  SELECT DATE '2026-10-24' AS desde, DATE '2026-11-22' AS hasta, NULL::int AS sucursal, NULL::int AS categoria
), lim AS (
  SELECT par.*,
         (desde::timestamp AT TIME ZONE 'America/Bogota')                         AS ini,
         ((hasta + 1)::timestamp AT TIME ZONE 'America/Bogota')                   AS fin,
         (hasta - desde + 1)                                                      AS dias,
         (desde - (hasta - desde + 1))                                            AS desde_ant,
         (desde - 1)                                                              AS hasta_ant,
         ((desde - (hasta - desde + 1))::timestamp AT TIME ZONE 'America/Bogota') AS ini_ant,
         (now() AT TIME ZONE 'America/Bogota')::date                              AS hoy
  FROM par
),
-- KPI-01, KPI-02 y KPI-03 (periodo actual y anterior)
ventas AS (
  SELECT SUM(dv.subtotal) FILTER (WHERE v.fecha >= l.ini)                                   AS ventas,
         COUNT(DISTINCT v.id) FILTER (WHERE v.fecha >= l.ini)                               AS num,
         SUM(dv.cantidad * dv.costo_unitario) FILTER (WHERE v.fecha >= l.ini)               AS costo,
         SUM(dv.subtotal) FILTER (WHERE v.fecha < l.ini)                                    AS ventas_ant,
         COUNT(DISTINCT v.id) FILTER (WHERE v.fecha < l.ini)                                AS num_ant,
         SUM(dv.cantidad * dv.costo_unitario) FILTER (WHERE v.fecha < l.ini)                AS costo_ant
  FROM lim l
  JOIN public.venta v ON v.estado = 'REGISTRADA' AND v.fecha >= l.ini_ant AND v.fecha < l.fin
  JOIN public.detalle_venta dv ON dv.venta_id = v.id
  JOIN public.producto p ON p.id = dv.producto_id
  WHERE (l.sucursal IS NULL OR v.sucursal_id = l.sucursal)
    AND (l.categoria IS NULL OR p.categoria_id = l.categoria)
),
-- KPI-04
agot AS (
  SELECT ROUND(100.0 * COUNT(*) FILTER (WHERE i.stock = 0) / NULLIF(COUNT(*), 0), 2) AS agotamiento_pct
  FROM lim l JOIN public.inventario i ON TRUE JOIN public.producto p ON p.id = i.producto_id
  WHERE p.activo
    AND (l.sucursal IS NULL OR i.sucursal_id = l.sucursal)
    AND (l.categoria IS NULL OR p.categoria_id = l.categoria)
),
-- KPI-05
vendidos AS (
  SELECT dv.producto_id, SUM(dv.cantidad) AS unidades
  FROM lim l
  JOIN public.venta v ON v.estado = 'REGISTRADA' AND v.fecha >= l.ini AND v.fecha < l.fin
  JOIN public.detalle_venta dv ON dv.venta_id = v.id
  WHERE (l.sucursal IS NULL OR v.sucursal_id = l.sucursal)
  GROUP BY dv.producto_id
), existencias AS (
  SELECT i.producto_id, SUM(i.stock) AS stock
  FROM lim l JOIN public.inventario i ON TRUE JOIN public.producto p ON p.id = i.producto_id
  WHERE p.activo
    AND (l.sucursal IS NULL OR i.sucursal_id = l.sucursal)
    AND (l.categoria IS NULL OR p.categoria_id = l.categoria)
  GROUP BY i.producto_id
), baja AS (
  SELECT COUNT(*) AS productos_baja_rotacion
  FROM lim l, existencias e LEFT JOIN vendidos s ON s.producto_id = e.producto_id
  WHERE e.stock > 0
    AND (COALESCE(s.unidades, 0) = 0 OR e.stock / (s.unidades::numeric / l.dias) > 60)
),
-- KPI-06 (actual y anterior)
cumpl AS (
  SELECT ROUND(100.0 * COUNT(*) FILTER (WHERE oc.fecha_esperada >= l.desde AND oc.estado = 'RECIBIDA' AND oc.fecha_recepcion <= oc.fecha_esperada)
               / NULLIF(COUNT(*) FILTER (WHERE oc.fecha_esperada >= l.desde), 0), 2) AS cumplimiento_pct,
         ROUND(100.0 * COUNT(*) FILTER (WHERE oc.fecha_esperada < l.desde AND oc.estado = 'RECIBIDA' AND oc.fecha_recepcion <= oc.fecha_esperada)
               / NULLIF(COUNT(*) FILTER (WHERE oc.fecha_esperada < l.desde), 0), 2) AS cumplimiento_ant_pct
  FROM lim l
  JOIN public.orden_compra oc ON oc.estado IN ('APROBADA', 'RECIBIDA')
   AND oc.fecha_esperada BETWEEN l.desde_ant AND LEAST(l.hasta, l.hoy)
  WHERE (l.sucursal IS NULL OR oc.sucursal_id = l.sucursal)
),
-- KPI-07 (actual y anterior)
compras AS (
  SELECT v.cliente_id, (v.fecha >= l.ini) AS actual, COUNT(*) AS n
  FROM lim l
  JOIN public.venta v ON v.estado = 'REGISTRADA' AND v.cliente_id IS NOT NULL AND v.fecha >= l.ini_ant AND v.fecha < l.fin
  WHERE (l.sucursal IS NULL OR v.sucursal_id = l.sucursal)
  GROUP BY v.cliente_id, (v.fecha >= l.ini)
), recurrentes AS (
  SELECT COUNT(*) FILTER (WHERE actual AND n > 1) AS clientes_recurrentes,
         COUNT(*) FILTER (WHERE NOT actual AND n > 1) AS clientes_recurrentes_ant
  FROM compras
),
-- KPI-08: inventario inicial y final de cada periodo reconstruido desde el kardex, al costo actual
mov AS (
  SELECT m.producto_id, m.sucursal_id,
         SUM(m.cantidad) FILTER (WHERE m.fecha >= l.ini)     AS desde_ini,
         SUM(m.cantidad) FILTER (WHERE m.fecha >= l.fin)     AS desde_fin,
         SUM(m.cantidad) FILTER (WHERE m.fecha >= l.ini_ant) AS desde_ini_ant
  FROM lim l JOIN public.movimiento_inventario m ON m.fecha >= l.ini_ant
  GROUP BY m.producto_id, m.sucursal_id
), inv AS (
  SELECT SUM((i.stock - COALESCE(mov.desde_ini, 0)) * p.costo)     AS inicial,
         SUM((i.stock - COALESCE(mov.desde_fin, 0)) * p.costo)     AS final,
         SUM((i.stock - COALESCE(mov.desde_ini_ant, 0)) * p.costo) AS inicial_ant
  FROM lim l JOIN public.inventario i ON TRUE
  JOIN public.producto p ON p.id = i.producto_id
  LEFT JOIN mov ON mov.producto_id = i.producto_id AND mov.sucursal_id = i.sucursal_id
  WHERE (l.sucursal IS NULL OR i.sucursal_id = l.sucursal)
    AND (l.categoria IS NULL OR p.categoria_id = l.categoria)
)
SELECT l.desde, l.hasta, l.desde_ant, l.hasta_ant,
       COALESCE(ventas.ventas, 0)                                                   AS kpi01_ventas,
       COALESCE(ventas.ventas_ant, 0)                                               AS kpi01_anterior,
       ROUND(ventas.ventas / NULLIF(ventas.num, 0), 2)                              AS kpi02_ticket,
       ROUND(ventas.ventas_ant / NULLIF(ventas.num_ant, 0), 2)                      AS kpi02_anterior,
       ROUND(100.0 * (ventas.ventas - ventas.costo) / NULLIF(ventas.ventas, 0), 2)  AS kpi03_margen_pct,
       agot.agotamiento_pct                                                         AS kpi04_agotamiento_pct,
       baja.productos_baja_rotacion                                                 AS kpi05_baja_rotacion,
       cumpl.cumplimiento_pct                                                       AS kpi06_cumplimiento_pct,
       cumpl.cumplimiento_ant_pct                                                   AS kpi06_anterior,
       recurrentes.clientes_recurrentes                                             AS kpi07_recurrentes,
       recurrentes.clientes_recurrentes_ant                                         AS kpi07_anterior,
       ROUND(ventas.costo / NULLIF((inv.inicial + inv.final) / 2, 0), 2)            AS kpi08_rotacion,
       ROUND(ventas.costo_ant / NULLIF((inv.inicial_ant + inv.inicial) / 2, 0), 2)  AS kpi08_anterior
FROM lim l, ventas, agot, baja, cumpl, recurrentes, inv;
