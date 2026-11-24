<!-- ============================================================
     CeibaERP - Capturas de la aplicacion funcionando (guia, entregable 3)
     Cada captura tiene titulo y descripcion breve de lo que demuestra.
     ============================================================ -->

# Capturas de CeibaERP

Evidencias de la aplicación funcionando, con título y descripción. Las ocho primeras son las capturas obligatorias de la guía (OBL-1 a OBL-8); las demás muestran validaciones, pruebas, despliegue e interacción entre agentes. Todos los datos son ficticios.

Las capturas se tomaron entre el 21 y el 23 de noviembre de 2026, en local y en la aplicación desplegada; algunas anteceden a correcciones posteriores (por ejemplo, el formato del margen, DEF-08).

## Capturas obligatorias

### OBL-1. Pantalla principal: dashboard general

![Pantalla principal: dashboard general](fase11_02_dashboard_kpi.png)

Vista del gerente en la aplicación desplegada en Railway con los datos de demostración cargados el 23/11/2026: filtros de periodo (24/10/2026 a 22/11/2026), sucursal y categoría; las ocho tarjetas de KPI con semáforo, variación frente al periodo anterior y fórmula, e interpretación automática basada en reglas.

### OBL-2. Módulo de gestión de información: productos

![Módulo de gestión de información: productos](fase03_01_productos_listado.png)

Catálogo de productos con búsqueda por SKU o nombre, filtros por categoría, proveedor y estado, costo, precio, margen, estado y acciones de editar y desactivar (vista del administrador). La captura es anterior a la corrección del DEF-08, por eso el margen aparece con punto decimal.

### OBL-3. Formulario de creación y actualización de registros

![Formulario de creación y actualización de registros](obl3_compuesta.png)

(a) Al crear un producto con precio menor que el costo, la validación lo rechaza junto al campo (regla RN-14) y no se envía nada al servidor. (b) Producto editado y guardado: la fila se actualiza y aparece la confirmación «Producto actualizado».

### OBL-4. Proceso de negocio completo: ciclo de abastecimiento inteligente

![Proceso de negocio completo: ciclo de abastecimiento inteligente](obl4_compuesta.png)

(a) La cajera de Ceiba Bello vende las últimas 2 unidades de Jugo de naranja 1 L (venta #10034). (b) El producto aparece agotado en las alertas del dashboard. (c) El Agente 1 lo prioriza y el sistema crea la orden BORRADOR #893 con la cantidad calculada en código. (d) El gerente aprueba la orden. (e) La bodega de Bello la recibe a tiempo. (f) El inventario de Bello vuelve a tener existencias del producto.

### OBL-5. Chatbot respondiendo una consulta pertinente

![Chatbot respondiendo una consulta pertinente](fase06_01_chatbot_respuesta.png)

A la pregunta «¿Qué sucursal tiene el menor nivel de ventas?», el asistente responde con datos reales del periodo, con la etiqueta «Respuesta generada por IA», el modelo, la fecha y las fuentes consultadas (herramienta ventasPorSucursal con sus filtros).

### OBL-6. Primer agente ejecutando una tarea: analista de inventario

![Primer agente ejecutando una tarea: analista de inventario](fase07_06_obl6_agente1.png)

Ejecución #52 del Agente 1 para Ceiba Bello: resumen, criterios de priorización, orden de compra en borrador creada por el sistema, producto analizado con cobertura, cantidad y prioridad calculadas en código, y alertas para el gerente.

### OBL-7. Segundo agente ejecutando una tarea: analista comercial

![Segundo agente ejecutando una tarea: analista comercial](fase07_07_obl7_agente2_1.png)

Ejecución #53 del Agente 2, parte del informe ejecutivo #51, que considera la salida del Agente 1 (#52). Cada hallazgo cita un KPI o gráfico del dashboard y muestra al lado el valor que calcula el sistema para contrastarlo.

### OBL-8. Dashboard con KPI y gráficos alimentados por datos de prueba

![Dashboard con KPI y gráficos alimentados por datos de prueba](fase11_01_dashboard_graficos.png)

Gráficos del dashboard calculados sobre los datos de demostración: ventas diarias frente al periodo anterior (G-01), ventas y margen por sucursal (G-02), estado del inventario por sucursal (G-04) y top 10 de productos (G-03). Cada gráfico tiene su tabla de datos plegable.

## Capturas adicionales

### A01. Inicio de sesión

![Inicio de sesión](fase02_09_login.png)

Formulario de acceso con correo y contraseña. Las credenciales se verifican en el servidor con bcrypt y la sesión viaja en una cookie httpOnly firmada (JWT).

### A02. Menú según el rol: cajero

![Menú según el rol: cajero](fase02_11_menu_cajero.png)

El cajero solo ve Caja, Ventas, Inventario, Productos, Clientes y el asistente; la autorización se verifica también en el servidor.

### A03. Bloqueo de acceso por rol

![Bloqueo de acceso por rol](fase02_12_sin_permiso.png)

Una ruta escrita a mano que no corresponde al rol lleva a la página «No tiene permiso para ver esta página».

### A04. Validación de duplicados en clientes

![Validación de duplicados en clientes](fase03_06_clientes_cajero.png)

El cajero intenta registrar un cliente con un documento existente: la API responde 409 y el error se muestra junto al campo.

### A05. Gestión de usuarios

![Gestión de usuarios](fase03_11_usuarios.png)

El administrador consulta los usuarios con su rol, sucursal, último acceso y estado, con filtros por rol y estado.

### A06. Inventario por estado

![Inventario por estado](fase03_13_inventario_resumen.png)

La bodega de Ceiba Centro ve las existencias de su sucursal con tarjetas por estado (agotado, bajo mínimo, normal, sobrestock) que filtran la tabla.

### A07. Ajuste de inventario con motivo

![Ajuste de inventario con motivo](fase03_14_inventario_ajuste.png)

Salida de una unidad por conteo físico: el formulario calcula el stock resultante y exige un motivo que queda en el kardex y en la auditoría.

### A08. Kardex de un producto

![Kardex de un producto](fase03_15_kardex.png)

Historial de movimientos de Arroz blanco 1 kg en Ceiba Centro, del más reciente al más antiguo, con stock resultante, referencia, usuario y motivo.

### A09. Auditoría de operaciones

![Auditoría de operaciones](fase03_16_auditoria.png)

Registro de un ajuste de inventario con usuario, acción, entidad, detalle en JSON e IP; solo lo consulta el administrador.

### A10. Caja: venta en curso

![Caja: venta en curso](fase04_01_caja_venta.png)

El cajero busca productos de su sucursal, ajusta cantidades, identifica al cliente y elige el medio de pago; el total lo recalcula el servidor.

### A11. Venta registrada

![Venta registrada](fase04_02_venta_registrada.png)

Confirmación de la venta #10032 con su detalle; el inventario se descontó y el movimiento quedó en el kardex en la misma transacción.

### A12. Validación de stock en la caja

![Validación de stock en la caja](fase04_03_caja_stock_insuficiente.png)

La caja no permite vender más unidades de las disponibles y lo indica en la línea del producto.

### A13. Nueva orden de compra

![Nueva orden de compra](fase04_05_oc_formulario.png)

La bodega crea un borrador con los productos del proveedor, sus existencias y umbrales, y puede completar faltantes hasta el máximo.

### A14. Orden de compra recibida

![Orden de compra recibida](fase04_08_oc_recibida.png)

La orden #885 pasa a RECIBIDA; el inventario se actualiza y queda registrada la fecha de recepción a tiempo.

### A15. Anulación de una venta

![Anulación de una venta](fase04_12_venta_anulada.png)

El gerente anula la venta #10032 con un motivo; las existencias se restituyen y la venta deja de contar en los indicadores.

### A16. Alertas de inventario y uso de los datos por la IA

![Alertas de inventario y uso de los datos por la IA](fase05_03_alertas_y_uso_ia.png)

Alertas de productos agotados y bajo mínimo con su proveedor y si tienen orden abierta, y la tabla que explica qué herramientas de IA consultan cada dato del dashboard.

### A17. Reportes

![Reportes](fase05_05_reportes_bodega.png)

La bodega descarga el reporte de inventario agotado y bajo mínimo de su sucursal y ve la vista previa en pantalla.

### A18. Reporte CSV abierto en Excel

![Reporte CSV abierto en Excel](fase05_04_reporte_csv_excel.png)

Reporte de ventas exportado con punto y coma y coma decimal para abrirlo directamente en Excel.

### A19. Verificación de los KPI con SQL

![Verificación de los KPI con SQL](fase05_06_verificacion_kpi_sql.png)

Los ocho KPI del dashboard coinciden con la consulta independiente scripts/verificar-kpi.sql ejecutada en Supabase (la dirección del proyecto está difuminada).

### A20. Chatbot sin información disponible

![Chatbot sin información disponible](fase06_03_chatbot_sin_informacion.png)

Ante «¿Cuál será el precio del dólar mañana?», el asistente indica que no tiene información suficiente en CeibaERP y no inventa datos.

### A21. Chatbot con restricción por sucursal

![Chatbot con restricción por sucursal](fase06_04_chatbot_restriccion_cajero.png)

El cajero de Centro pregunta por Bello: el asistente explica que solo puede consultar su sucursal y ofrece esos datos.

### A22. Pruebas del chatbot con Gemini real

![Pruebas del chatbot con Gemini real](fase06_05_pruebas_chat.png)

Script de PowerShell con las preguntas PRU-C01 a PRU-C08, las herramientas usadas y la respuesta de cada una.

### A23. Interacción entre agentes: informe ejecutivo

![Interacción entre agentes: informe ejecutivo](fase07_05_informe_ejecutivo.png)

El informe #51 ejecuta el Agente 1 y luego el Agente 2 con la salida validada del primero, y consolida órdenes, alertas y recomendaciones.

### A24. Recomendaciones del analista comercial

![Recomendaciones del analista comercial](fase07_07_obl7_agente2_2.png)

Recomendaciones del Agente 2 con tipo y prioridad, en estado pendiente hasta la decisión del gerente.

### A25. Validación humana de recomendaciones

![Validación humana de recomendaciones](fase07_08_recomendaciones.png)

El gerente descarta una recomendación con un motivo obligatorio; la decisión queda registrada con su nombre y fecha.

### A26. Historial de ejecuciones de los agentes

![Historial de ejecuciones de los agentes](fase07_09_historial.png)

Ejecuciones con entrada, duración, estado (incluidas las fallidas por la cuota del modelo), modelo, resultado y quién las ejecutó.

### A27. Pruebas de los agentes con Gemini real

![Pruebas de los agentes con Gemini real](fase07_03_pruebas_agentes.png)

Informe ejecutivo para Ceiba Bello con verificaciones automáticas de órdenes, encadenamiento, coherencia y decisión del gerente: 23 de 23.

### A28. Pruebas unitarias

![Pruebas unitarias](fase08_01_vitest_unitarias.png)

Vitest con 109 pruebas en verde al cierre de la Fase 8 (111 después de la corrección del DEF-08).

### A29. Pruebas de integración

![Pruebas de integración](fase08_02_vitest_integracion.png)

20 pruebas contra el esquema test de Supabase: ventas, órdenes de compra, KPI calculados a mano, agentes y chatbot con modelo simulado.

### A30. Pruebas de seguridad

![Pruebas de seguridad](fase08_03_pruebas_seguridad.png)

Script PRU-S01 a PRU-S12: sesión, roles, campos alterados, otra sucursal, stock, limitador de intentos, inyección y JWT alterado; 18 de 18.

### A31. Aplicación desplegada en Railway

![Aplicación desplegada en Railway](fase09_01_railway_servicio.png)

El endpoint /api/health de la URL pública responde con el estado del servicio y de la base de datos.

### A32. Pruebas de seguridad contra la URL pública

![Pruebas de seguridad contra la URL pública](fase09_03_seguridad_desplegada.png)

El mismo script de seguridad contra la aplicación desplegada: 18 de 18.

### A33. Tarea diaria en GitHub Actions

![Tarea diaria en GitHub Actions](fase09_04_github_actions.png)

El flujo «Mantener activa la base de datos» consulta /api/health para que el proyecto gratuito de Supabase no se pause.

### A34. Plan de pruebas de TestSprite

![Plan de pruebas de TestSprite](fase10_02_plan_depurado.png)

Plan de 15 casos revisado antes de ejecutar, agrupado por módulo.

### A35. Defecto encontrado por TestSprite (DEF-08)

![Defecto encontrado por TestSprite (DEF-08)](fase10_04_def08_fallo.png)

El caso CAT-01 falla porque el margen de Productos se muestra con punto decimal (21.6 %).

### A36. Reejecución después de la corrección

![Reejecución después de la corrección](fase10_05_reejecucion_cat01.png)

Tras la versión v0.9.1, CAT-01 se vuelve a ejecutar y pasa.

### A37. Resultado final de TestSprite

![Resultado final de TestSprite](fase10_08_resumen_testsprite.png)

Los 15 casos end-to-end en estado Passed sobre la aplicación desplegada.

## Modelo de datos

![Diagrama entidad-relación](er_modelo_datos.png)

Diagrama entidad-relación generado a partir de `prisma/schema.prisma`: 17 tablas con sus llaves primarias, llaves foráneas y campos principales. Las relaciones hacia `usuario` (quién registra, aprueba, recibe o decide) se listan como llaves foráneas en cada tabla, pero sus líneas se omiten para que el diagrama sea legible. Diccionario completo en [`05-DAT`](../05-DAT-modelo-de-datos.md).
