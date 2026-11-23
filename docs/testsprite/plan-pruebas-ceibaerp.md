<!-- ============================================================
     CeibaERP - Plan de pruebas end-to-end generado por el agente de TestSprite
     a partir de prd-ceiba-erp.md y revisado antes de ejecutar (docs/10-PRU sección 6).
     Se conserva tal como quedó aprobado; los resultados están en 10-PRU §6.
     ============================================================ -->

# CeibaERP — Plan de pruebas (15 casos) para revisión

Pasos completos de cada caso: test-cases/<clave>.md del proyecto (aún sin commit).

## Ronda 1 — bodega.centro@ceiba.test
| Caso | Prio | Qué comprueba |
|---|---|---|
| OC-01 La bodega crea una orden en borrador | Alta | Nueva orden: Bebidas del Valle, Agua sin gas 600 ml (BEB-001) × 2, observaciones "TS OC <timestamp>" → "Orden #N creada en borrador."; Borrador, Ceiba Centro, total = cantidad × costo; persiste tras recargar; la bodega no ve "Aprobar". Se deja en Borrador para OC-02. |
| OC-03 La bodega recibe una orden aprobada demo | Alta | Orden Aprobada de Ceiba Centro que no sea TS → Recibida; el stock de cada SKU sube en lo recibido; el kardex registra la entrada con la orden. Si no hay ninguna: Blocked. |

## Ronda 2 — gerente@ceiba.test
| Caso | Prio | Qué comprueba |
|---|---|---|
| AUTH-01 Inicio de sesión válido y menú | Alta | /dashboard, "Gabriel Gerente Ceiba · Gerente", menú exacto del gerente, sin Caja/Usuarios/Auditoría; sesión sigue tras recargar. |
| AUTH-02 Credenciales inválidas | Alta | Salir; un solo intento con noexiste@ceiba.test → error en el formulario, sigue en /login. |
| AUTH-03 Salir y protección de rutas | Alta | Salir → /login; /dashboard e /inventario sin sesión → /login. |
| ROL-01 Bloqueo por URL | Alta | /usuarios, /auditoria y /ventas/caja → /sin-permiso; "Volver al inicio" → dashboard. |
| DASH-01 Dashboard y filtros | Alta | 8 KPI + 4 gráficos + alertas; 30 días hasta ayer; 7 días, Ceiba Centro y Lácteos y huevos recalculan; Restablecer vuelve al inicio. |
| CAT-01 Catálogos de solo lectura y margen | Alta | Categorías y Proveedores sin crear/editar/desactivar; búsqueda "Lácteos" y "Andina" filtra; Productos con margen "21,6 %". **Fallará por el defecto confirmado del punto decimal.** |
| INV-01 Kardex | Media | ABA-001 en Ceiba Centro: stock actual del kardex = stock de la fila; columnas; secuencia de stock resultante coherente. |
| VEN-01 Filtros y detalle de ventas | Media | Ceiba Centro + Efectivo + Registrada; detalle cuadra (subtotal = cant × precio; suma = total del detalle = total de la fila). |
| OC-02 El gerente aprueba la orden TS | Alta | Sin botón "Nueva orden de compra"; abre la orden "TS OC" en Borrador, Aprobar → Aprobada con fecha y aprobador; persiste tras recargar. Si no hay orden TS en Borrador: Blocked. |
| REP-01 Vista previa de reportes | Media | Conteos de agotado/bajo mínimo = filas = alertas del dashboard; filtro Ceiba Centro deja solo filas de Centro; sin descargas. |
| CHAT-01 Una pregunta al asistente | Media | "¿Cuáles son los 5 productos más vendidos del último mes?" una sola vez; respuesta ≤ 60 s con productos del catálogo y etiqueta "Respuesta generada por IA · Gemini". |

## Ronda 3 — cajero.centro@ceiba.test
| Caso | Prio | Qué comprueba |
|---|---|---|
| CAJA-01 Venta en caja descuenta stock | Alta | BEB-001: agregar, Sumar (2), Restar (1), Registrar sin cliente → "Venta #N registrada", Nueva venta vacía; stock de Centro −1; kardex "Venta #N"; aparece en Ventas. |
| CLI-01 Registrar cliente y duplicado | Media | "TS Cliente <timestamp>" con documento "9<timestamp>" se encuentra con la búsqueda (también tras recargar); documento 1002090629 (cliente demo) → error de duplicado y no se guarda. |

## Datos que quedan después de las rondas
- La orden TS (Aprobada), la venta de 1 × BEB-001 y el cliente TS: estos roles no pueden borrarlos y anular está fuera de alcance.
- OC-03 cambia una orden demo de Aprobada a Recibida (lo autorizaste).

## Dejado para después
Venta por encima del stock, venta con cliente, validaciones de campos vacíos en Clientes, cancelar orden, menú/bloqueo por URL de cajero y bodega, paginación de catálogos.

## Expectativas de las que no estoy seguro (no exploré bodega ni cajero)
- OC-01: que el formulario tenga campo de observaciones (si no, no hay dónde poner "TS OC") y que la sucursal se fije en Ceiba Centro.
- OC-03: que la recepción pida confirmar cantidades y que el kardex referencie la orden.
- CLI-01: qué campos son obligatorios; que el documento acepte 14 dígitos.
- CAJA-01: que BEB-001 tenga al menos 2 unidades en Ceiba Centro el día de la corrida.
- VEN-01 / DASH-01: los "menor que" asumen que hay ventas en el periodo y en la sucursal (hoy sí las hay).
