# 06-KPI — Indicadores clave de desempeño

Los KPI se calculan **en el servidor con consultas sobre la base de datos**, en un único servicio (`src/server/servicios/kpi.ts`) que usan el dashboard, los reportes, el chatbot y los agentes. Así, todos ven las mismas cifras.

---

## 1. Convenciones

- **Periodo:** rango de fechas `desde`–`hasta`, ambos inclusive, en la zona horaria `America/Bogota`. Por defecto son los **últimos 30 días completos, hasta ayer**: el día en curso se excluye para no comparar un día parcial con uno completo del periodo anterior. El usuario puede incluir hoy eligiendo las fechas; el dashboard lo advierte.
- **Periodo anterior:** rango de igual duración inmediatamente anterior; sirve para calcular la variación.
- **Filtros:** sucursal y categoría. Si un KPI no admite un filtro, se indica.
- **Ventas válidas:** solo las de estado `REGISTRADA`. Las anuladas se excluyen (RN-10).
- **Productos activos:** `producto.activo = true`.
- Las consultas de referencia usan los nombres reales de la BD en *snake_case* y parámetros `:desde`, `:hasta`, `:sucursal`, `:categoria` (nulos si no se filtra). Sirven para **verificar a mano** cada valor del dashboard (Fase 5).
- **Verificación en un solo paso:** `scripts/verificar-kpi.sql` reúne estas consultas en una sola sentencia de solo lectura que devuelve los ocho KPI del periodo y del anterior. Se escribió a partir de estas fichas, sin reutilizar el código de la aplicación, y se ejecuta en el editor SQL de Supabase cambiando solo la primera línea (periodo, sucursal y categoría). Los días se convierten a instantes con `AT TIME ZONE 'America/Bogota'`.

---

## 2. Fichas de los KPI

### KPI-01 · Ventas totales

| | |
|---|---|
| **Definición** | Valor total vendido en el periodo |
| **Fórmula** | Σ subtotal de los ítems de las ventas válidas del periodo |
| **Periodo** | Seleccionado, comparado con el anterior |
| **Fuente** | `venta`, `detalle_venta`, `producto` |
| **Filtros** | Sucursal y categoría |
| **Unidad** | COP |

```sql
SELECT COALESCE(SUM(dv.subtotal), 0) AS ventas_totales
FROM detalle_venta dv
JOIN venta v    ON v.id = dv.venta_id
JOIN producto p ON p.id = dv.producto_id
WHERE v.estado = 'REGISTRADA'
  AND v.fecha >= :desde AND v.fecha < (:hasta + INTERVAL '1 day')
  AND (:sucursal IS NULL OR v.sucursal_id = :sucursal)
  AND (:categoria IS NULL OR p.categoria_id = :categoria);
```

### KPI-02 · Ticket promedio

| | |
|---|---|
| **Definición** | Valor promedio de cada venta |
| **Fórmula** | Ventas totales / número de ventas válidas |
| **Periodo** | Seleccionado, comparado con el anterior |
| **Fuente** | `venta`, `detalle_venta`, `producto` |
| **Filtros** | Sucursal y categoría (con categoría: valor de esa categoría entre las ventas que la incluyen) |
| **Unidad** | COP |

```sql
SELECT ROUND(SUM(dv.subtotal) / NULLIF(COUNT(DISTINCT v.id), 0), 2) AS ticket_promedio
FROM detalle_venta dv
JOIN venta v    ON v.id = dv.venta_id
JOIN producto p ON p.id = dv.producto_id
WHERE v.estado = 'REGISTRADA'
  AND v.fecha >= :desde AND v.fecha < (:hasta + INTERVAL '1 day')
  AND (:sucursal IS NULL OR v.sucursal_id = :sucursal)
  AND (:categoria IS NULL OR p.categoria_id = :categoria);
```

### KPI-03 · Margen bruto

| | |
|---|---|
| **Definición** | Porcentaje de las ventas que queda después del costo de los productos vendidos |
| **Fórmula** | (Ventas − costo de los productos vendidos) / ventas × 100 |
| **Periodo** | Seleccionado, comparado con el anterior |
| **Fuente** | `detalle_venta` (precio y costo copiados al vender), `venta`, `producto` |
| **Filtros** | Sucursal y categoría |
| **Unidad** | % |

```sql
SELECT ROUND(100.0 * (SUM(dv.subtotal) - SUM(dv.cantidad * dv.costo_unitario))
             / NULLIF(SUM(dv.subtotal), 0), 2) AS margen_bruto_pct
FROM detalle_venta dv
JOIN venta v    ON v.id = dv.venta_id
JOIN producto p ON p.id = dv.producto_id
WHERE v.estado = 'REGISTRADA'
  AND v.fecha >= :desde AND v.fecha < (:hasta + INTERVAL '1 day')
  AND (:sucursal IS NULL OR v.sucursal_id = :sucursal)
  AND (:categoria IS NULL OR p.categoria_id = :categoria);
```

### KPI-04 · Nivel de agotamiento

| | |
|---|---|
| **Definición** | Proporción de combinaciones producto–sucursal activas sin existencias |
| **Fórmula** | Registros de inventario con stock = 0 / registros de inventario de productos activos × 100 |
| **Periodo** | Situación actual (foto del momento de la consulta) |
| **Fuente** | `inventario`, `producto` |
| **Filtros** | Sucursal y categoría |
| **Unidad** | % |

```sql
SELECT ROUND(100.0 * COUNT(*) FILTER (WHERE i.stock = 0) / NULLIF(COUNT(*), 0), 2) AS agotamiento_pct
FROM inventario i
JOIN producto p ON p.id = i.producto_id
WHERE p.activo
  AND (:sucursal IS NULL OR i.sucursal_id = :sucursal)
  AND (:categoria IS NULL OR p.categoria_id = :categoria);
```

### KPI-05 · Productos de baja rotación

| | |
|---|---|
| **Definición** | Productos activos con existencias cuya venta del periodo es nula o tan baja que su stock alcanza para más de 60 días |
| **Fórmula** | Cantidad de productos con stock > 0 y (unidades vendidas = 0 o días de cobertura > 60), donde días de cobertura = stock / (unidades vendidas / días del periodo) |
| **Umbral** | 60 días de cobertura (configurable) |
| **Periodo** | Seleccionado (ventas) y stock actual |
| **Fuente** | `inventario`, `detalle_venta`, `venta`, `producto` |
| **Filtros** | Sucursal y categoría (stock y ventas se suman en las sucursales filtradas) |
| **Unidad** | Número de productos |

```sql
WITH vendidos AS (
  SELECT dv.producto_id, SUM(dv.cantidad) AS unidades
  FROM detalle_venta dv JOIN venta v ON v.id = dv.venta_id
  WHERE v.estado = 'REGISTRADA'
    AND v.fecha >= :desde AND v.fecha < (:hasta + INTERVAL '1 day')
    AND (:sucursal IS NULL OR v.sucursal_id = :sucursal)
  GROUP BY dv.producto_id
), existencias AS (
  SELECT i.producto_id, SUM(i.stock) AS stock
  FROM inventario i JOIN producto p ON p.id = i.producto_id
  WHERE p.activo
    AND (:sucursal IS NULL OR i.sucursal_id = :sucursal)
    AND (:categoria IS NULL OR p.categoria_id = :categoria)
  GROUP BY i.producto_id
)
SELECT COUNT(*) AS productos_baja_rotacion
FROM existencias e LEFT JOIN vendidos s ON s.producto_id = e.producto_id
WHERE e.stock > 0
  AND (COALESCE(s.unidades, 0) = 0
       OR e.stock / (s.unidades::numeric / ((:hasta - :desde) + 1)) > 60);
```

### KPI-06 · Cumplimiento de pedidos

| | |
|---|---|
| **Definición** | Porcentaje de órdenes de compra entregadas a tiempo entre las que debían entregarse en el periodo |
| **Fórmula** | Órdenes recibidas con fecha de recepción ≤ fecha esperada / órdenes aprobadas o recibidas con fecha esperada dentro del periodo (hasta hoy) × 100 |
| **Periodo** | Seleccionado, comparado con el anterior |
| **Fuente** | `orden_compra` |
| **Filtros** | Sucursal (no aplica categoría) |
| **Unidad** | % |

```sql
SELECT ROUND(100.0 * COUNT(*) FILTER (WHERE oc.estado = 'RECIBIDA'
                                        AND oc.fecha_recepcion <= oc.fecha_esperada)
             / NULLIF(COUNT(*), 0), 2) AS cumplimiento_pct
FROM orden_compra oc
WHERE oc.estado IN ('APROBADA', 'RECIBIDA')
  AND oc.fecha_esperada BETWEEN :desde AND LEAST(:hasta, CURRENT_DATE)
  AND (:sucursal IS NULL OR oc.sucursal_id = :sucursal);
```

Una orden APROBADA cuya fecha esperada ya pasó sin recepción cuenta como **incumplida**.

### KPI-07 · Clientes recurrentes

| | |
|---|---|
| **Definición** | Clientes identificados con más de una compra en el periodo |
| **Fórmula** | Cantidad de clientes con número de ventas válidas > 1 en el periodo |
| **Periodo** | Seleccionado, comparado con el anterior |
| **Fuente** | `venta` |
| **Filtros** | Sucursal (no aplica categoría) |
| **Unidad** | Número de clientes (se muestra también el % sobre los clientes con alguna compra) |

```sql
SELECT COUNT(*) AS clientes_recurrentes
FROM (
  SELECT v.cliente_id
  FROM venta v
  WHERE v.estado = 'REGISTRADA' AND v.cliente_id IS NOT NULL
    AND v.fecha >= :desde AND v.fecha < (:hasta + INTERVAL '1 day')
    AND (:sucursal IS NULL OR v.sucursal_id = :sucursal)
  GROUP BY v.cliente_id
  HAVING COUNT(*) > 1
) t;
```

### KPI-08 · Rotación de inventario

| | |
|---|---|
| **Definición** | Veces que el inventario promedio se vendió en el periodo |
| **Fórmula** | Costo de los productos vendidos / inventario promedio, donde inventario promedio = (inventario inicial + inventario final) / 2, valorizado al costo actual |
| **Cálculo del inventario histórico** | Stock al inicio = stock actual − Σ movimientos del kardex desde `desde`; stock al final = stock actual − Σ movimientos posteriores a `hasta` |
| **Periodo** | Seleccionado; se compara con el anterior de igual duración (periodos comparables) |
| **Fuente** | `detalle_venta`, `venta`, `inventario`, `movimiento_inventario`, `producto` |
| **Filtros** | Sucursal y categoría |
| **Unidad** | Veces en el periodo |

```sql
WITH mov AS (
  SELECT m.producto_id, m.sucursal_id,
         SUM(m.cantidad) FILTER (WHERE m.fecha >= :desde)                          AS desde_inicio,
         SUM(m.cantidad) FILTER (WHERE m.fecha >= (:hasta + INTERVAL '1 day'))      AS despues_fin
  FROM movimiento_inventario m
  GROUP BY m.producto_id, m.sucursal_id
), inv AS (
  SELECT SUM((i.stock - COALESCE(mov.desde_inicio, 0)) * p.costo) AS inicial,
         SUM((i.stock - COALESCE(mov.despues_fin, 0))  * p.costo) AS final
  FROM inventario i
  JOIN producto p ON p.id = i.producto_id
  LEFT JOIN mov ON mov.producto_id = i.producto_id AND mov.sucursal_id = i.sucursal_id
  WHERE (:sucursal IS NULL OR i.sucursal_id = :sucursal)
    AND (:categoria IS NULL OR p.categoria_id = :categoria)
), cpv AS (
  SELECT SUM(dv.cantidad * dv.costo_unitario) AS costo_vendido
  FROM detalle_venta dv
  JOIN venta v    ON v.id = dv.venta_id
  JOIN producto p ON p.id = dv.producto_id
  WHERE v.estado = 'REGISTRADA'
    AND v.fecha >= :desde AND v.fecha < (:hasta + INTERVAL '1 day')
    AND (:sucursal IS NULL OR v.sucursal_id = :sucursal)
    AND (:categoria IS NULL OR p.categoria_id = :categoria)
)
SELECT ROUND(cpv.costo_vendido / NULLIF((inv.inicial + inv.final) / 2, 0), 2) AS rotacion
FROM cpv, inv;
```

---

## 3. Gráficos

| ID | Gráfico | Tipo | Datos | Pregunta que responde |
|---|---|---|---|---|
| G-01 | Ventas diarias | Líneas (periodo actual y anterior) | Σ ventas por día | ¿Cómo evolucionan las ventas y hay estacionalidad semanal? |
| G-02 | Ventas y margen por sucursal | Barras | Ventas totales y margen por sucursal | ¿Qué sucursal vende menos o es menos rentable? |
| G-03 | Top 10 productos | Barras horizontales | Unidades y valor vendidos | ¿Cuáles son los productos de mayor demanda? |
| G-04 | Estado del inventario por sucursal | Barras apiladas | Productos agotados, bajo mínimo, normales y en sobrestock | ¿Dónde está el riesgo de agotamiento o de exceso? |

Todos responden a los filtros de periodo, sucursal y categoría (G-04 muestra el estado actual).

---

## 4. Semáforos e interpretación automática

La interpretación breve que exige la guía se genera **con reglas explícitas en código**, no con IA. Así es determinista y verificable. El texto se muestra con la etiqueta "Interpretación automática basada en reglas".

| KPI | Verde | Amarillo | Rojo |
|---|---|---|---|
| KPI-01 Ventas totales | Variación ≥ 0 % | −5 % ≤ variación < 0 % | Variación < −5 % |
| KPI-02 Ticket promedio | Variación ≥ 0 % | −5 % ≤ variación < 0 % | Variación < −5 % |
| KPI-03 Margen bruto | ≥ 22 % | 15 % – 22 % | < 15 % |
| KPI-04 Agotamiento | < 3 % | 3 % – 8 % | > 8 % |
| KPI-05 Baja rotación | ≤ 5 productos | 6 – 10 | > 10 |
| KPI-06 Cumplimiento | ≥ 90 % | 75 % – 90 % | < 75 % |
| KPI-07 Clientes recurrentes | Variación ≥ 0 % | −10 % ≤ variación < 0 % | Variación < −10 % |
| KPI-08 Rotación | Variación ≥ 0 % | −10 % ≤ variación < 0 % | Variación < −10 % |

**Reglas de texto** (se muestran las que aplican, máximo cinco):

- IR-01: variación de las ventas frente al periodo anterior, con la sucursal de mayor y la de menor venta.
- IR-02: si el agotamiento está en amarillo o rojo, cuántos productos están agotados y en qué sucursal se concentran.
- IR-03: si el cumplimiento está en amarillo o rojo, el proveedor con más entregas tardías.
- IR-04: si hay productos de baja rotación, cuántos son y el valor inmovilizado al costo.
- IR-05: si el margen está en amarillo o rojo, la categoría de menor margen.
- IR-06: proporción de clientes recurrentes sobre los clientes identificados.

---

## 5. Uso de los KPI por el chatbot y los agentes

| Dato del dashboard | Herramienta de IA que lo consulta (`07-IAG`) | Quién la usa |
|---|---|---|
| KPI-01 a KPI-08 | `consultarKpis` | Chatbot, Agente 2 |
| G-02 ventas por sucursal | `ventasPorSucursal` | Chatbot, Agente 2 |
| G-03 top productos | `topProductos` | Chatbot, Agente 2 |
| G-04 y alertas | `productosEnRiesgo` | Chatbot, Agente 1 |
| KPI-05 | `productosBajaRotacion` | Chatbot, Agente 2 |
| KPI-06 | `cumplimientoProveedores`, `ordenesPendientes` | Chatbot, Agente 1 |

Como las herramientas llaman al mismo servicio de KPI que el dashboard, las cifras que mencionan el chatbot y los agentes se pueden **contrastar directamente** con las tarjetas y gráficos. Esta explicación se muestra en el propio dashboard (RF-29).
