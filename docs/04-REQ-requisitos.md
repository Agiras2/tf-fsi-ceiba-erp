# 04-REQ — Requisitos

Referencias: roles y flujos en `03-NEG`; entidades en `05-DAT`; indicadores en `06-KPI`; IA en `07-IAG`; seguridad en `09-SEG`.

**Convención:** `RF-NN` requisito funcional · `RNF-NN` requisito no funcional · `RN-NN` regla de negocio. Roles: **ADM** administrador, **GER** gerente, **BOD** bodega, **CAJ** cajero.

---

## 1. Requisitos funcionales

### 1.1 Autenticación, usuarios y auditoría

| ID | Requisito | Roles | Criterio de aceptación |
|---|---|---|---|
| RF-01 | Iniciar y cerrar sesión con correo y contraseña | Todos | Credenciales válidas crean la sesión; inválidas muestran un mensaje genérico sin revelar cuál dato falló |
| RF-02 | Autorizar cada operación según rol y sucursal en el servidor | Todos | Una petición sin sesión recibe 401; una petición con rol o sucursal no permitidos recibe 403 |
| RF-03 | Gestionar usuarios: crear, consultar, editar, desactivar, asignar rol y sucursal, restablecer contraseña | ADM | Un usuario desactivado no puede iniciar sesión |
| RF-04 | Registrar en auditoría las operaciones principales (ver RN-21) | Sistema | Cada operación deja usuario, acción, entidad, identificador, detalle y fecha |
| RF-05 | Consultar la auditoría con filtros por usuario, acción, entidad y fecha | ADM | Los registros se listan paginados y filtrados |

### 1.2 Catálogos

| ID | Requisito | Roles | Criterio de aceptación |
|---|---|---|---|
| RF-06 | CRUD de sucursales | ADM (GER y BOD consultan) | Código único; no se elimina una sucursal con historial (se desactiva) |
| RF-07 | CRUD de categorías | ADM (GER y BOD consultan) | Nombre único |
| RF-08 | CRUD de proveedores con NIT, contacto y tiempo de entrega en días | ADM (GER y BOD consultan) | NIT único; tiempo de entrega mayor que cero |
| RF-09 | CRUD de productos con SKU, nombre, categoría, proveedor principal, unidad, costo y precio | ADM (todos consultan) | SKU único; precio mayor o igual al costo; al crearlo se genera su registro de inventario en cada sucursal |
| RF-10 | CRUD de clientes ficticios con documento, nombre, correo y teléfono | ADM; CAJ crea y consulta; GER consulta | Documento único |
| RF-11 | Búsqueda por texto, filtros y paginación en todos los listados | Todos | Los listados responden con páginas de tamaño configurable |

### 1.3 Inventario

| ID | Requisito | Roles | Criterio de aceptación |
|---|---|---|---|
| RF-12 | Consultar el inventario por sucursal con su estado: agotado, bajo mínimo, normal o sobrestock | ADM, GER (todas); BOD, CAJ (su sucursal) | El estado se calcula según RN-12 |
| RF-13 | Configurar el stock mínimo y máximo por producto y sucursal | ADM; BOD (su sucursal) | Se cumple RN-13 |
| RF-14 | Registrar ajustes de inventario de entrada o salida con motivo obligatorio | BOD (su sucursal) | Se cumple RN-11; el ajuste queda en el kardex |
| RF-15 | Consultar el kardex de un producto en una sucursal | ADM, GER, BOD (su sucursal) | Muestra cada movimiento con tipo, cantidad, stock resultante, referencia, usuario y fecha |

### 1.4 Ventas

| ID | Requisito | Roles | Criterio de aceptación |
|---|---|---|---|
| RF-16 | Registrar una venta con uno o varios productos, cliente opcional y medio de pago | CAJ (su sucursal) | Se cumplen RN-01 a RN-06 |
| RF-17 | Consultar ventas y su detalle con filtros por fecha, sucursal, estado y cliente | ADM, GER (todas); CAJ (su sucursal) | Los totales mostrados son los calculados en el servidor |
| RF-18 | Anular una venta registrada indicando el motivo | GER | Se cumple RN-10 |

### 1.5 Compras

| ID | Requisito | Roles | Criterio de aceptación |
|---|---|---|---|
| RF-19 | Crear una orden de compra en borrador con proveedor, sucursal, productos, cantidades y fecha esperada | BOD (su sucursal); Agente 1 | Solo productos activos del proveedor elegido |
| RF-20 | Editar una orden en borrador | BOD (su sucursal), GER | Solo se editan órdenes en estado BORRADOR |
| RF-21 | Aprobar o cancelar una orden de compra | GER | Se cumplen RN-07 y RN-09 |
| RF-22 | Registrar la recepción de una orden aprobada | BOD (su sucursal) | Se cumple RN-08 |
| RF-23 | Consultar órdenes con filtros por estado, proveedor, sucursal y origen (manual o IA) | ADM, GER (todas); BOD (su sucursal) | Las órdenes generadas por IA muestran su etiqueta y la ejecución que las originó |

### 1.6 Dashboard y reportes

| ID | Requisito | Roles | Criterio de aceptación |
|---|---|---|---|
| RF-24 | Mostrar tarjetas con los ocho KPI de `06-KPI` y su variación frente al periodo anterior | ADM, GER | Cada valor coincide con la consulta de verificación del KPI |
| RF-25 | Mostrar al menos dos gráficos (se implementan cuatro, ver `06-KPI` §3) | ADM, GER | Los gráficos responden a los filtros |
| RF-26 | Filtrar por periodo (desde–hasta), sucursal y categoría | ADM, GER | Todos los KPI y gráficos se recalculan |
| RF-27 | Mostrar una interpretación breve de los resultados, generada por reglas explícitas | ADM, GER | Las reglas están documentadas en `06-KPI` §4 |
| RF-28 | Mostrar alertas de productos agotados y bajo mínimo | ADM, GER; BOD (su sucursal) | La lista coincide con el inventario |
| RF-29 | Explicar en el dashboard qué datos usan el chatbot y los agentes | ADM, GER | Sección visible con la relación KPI–herramienta |
| RF-30 | Exportar reportes en CSV: ventas detalladas, inventario bajo mínimo y cumplimiento de proveedores | ADM, GER; BOD (inventario de su sucursal) | El archivo descargado respeta los filtros aplicados |

### 1.7 Chatbot

| ID | Requisito | Roles | Criterio de aceptación |
|---|---|---|---|
| RF-31 | Responder preguntas en lenguaje natural sobre el negocio consultando herramientas de solo lectura | Todos | Las cifras de la respuesta coinciden con las del sistema |
| RF-32 | Restringir los datos consultados según el rol y la sucursal del usuario | Todos | Un cajero no obtiene datos de otra sucursal |
| RF-33 | Indicar explícitamente cuando no tiene información suficiente | Todos | Ante preguntas fuera del dominio responde que no dispone de esa información |
| RF-34 | Identificar cada respuesta como generada por IA y mostrar las fuentes consultadas | Todos | Se ve la etiqueta y la lista de herramientas usadas |
| RF-35 | Conservar el historial de la conversación | Todos | Las conversaciones quedan registradas en la base de datos |

### 1.8 Agentes inteligentes

| ID | Requisito | Roles | Criterio de aceptación |
|---|---|---|---|
| RF-36 | Ejecutar el Agente 1, analista de inventario, con sucursal opcional | ADM, GER | Produce una lista priorizada con criterios explicados (`07-IAG` §5) |
| RF-37 | Crear, desde el Agente 1, órdenes de compra en BORRADOR con origen IA, agrupadas por proveedor y sucursal | Sistema | Las órdenes quedan pendientes de aprobación humana |
| RF-38 | Ejecutar el Agente 2, analista comercial | ADM, GER | Produce hallazgos contrastables con el dashboard y recomendaciones (`07-IAG` §6) |
| RF-39 | Ejecutar el informe ejecutivo que encadena el Agente 1 y el Agente 2 | ADM, GER | El Agente 2 recibe y usa el resultado del Agente 1 (`07-IAG` §7) |
| RF-40 | Aceptar o descartar las recomendaciones de los agentes con comentario | GER | Se cumple RN-18 |
| RF-41 | Consultar el historial de ejecuciones con entrada, herramientas usadas, salida, modelo, duración y estado | ADM, GER | Cada ejecución es trazable |

### 1.9 Sistema

| ID | Requisito | Roles | Criterio de aceptación |
|---|---|---|---|
| RF-42 | Exponer un endpoint de salud que verifique la conexión con la base de datos | Público | Responde 200 con estado `ok` sin revelar datos internos |
| RF-43 | Cargar datos de demostración ficticios con un script repetible | Desarrollo | El script deja la base en un estado conocido (`05-DAT` §5) |

---

## 2. Requisitos no funcionales

| ID | Atributo | Requisito | Verificación |
|---|---|---|---|
| RNF-01 | Usabilidad | Interfaz en español, navegación lateral consistente según el rol, formularios con mensajes de validación junto a cada campo, confirmación antes de operaciones irreversibles | Revisión visual y capturas |
| RNF-02 | Seguridad | Ver `09-SEG`: autenticación, autorización en servidor, validación estricta de entradas, credenciales fuera del repositorio, usuario de BD de mínimo privilegio | Pruebas de seguridad `10-PRU` §4 |
| RNF-03 | Integridad | Operaciones de stock y estados en transacciones; restricciones de unicidad y llaves foráneas en la BD; reglas RN-01 a RN-20 | Pruebas automatizadas |
| RNF-04 | Mantenibilidad | Código en capas y módulos (`08-ARQ`), TypeScript estricto, ESLint | Revisión del repositorio |
| RNF-05 | Trazabilidad | Auditoría de operaciones y registro de ejecuciones de agentes y conversaciones | Consulta de auditoría y ejecuciones |
| RNF-06 | Confiabilidad | Errores con formato uniforme y mensajes comprensibles; si el servicio de IA falla, el resto del sistema sigue operando y se informa al usuario | Pruebas de manejo de errores |
| RNF-07 | Privacidad | Solo datos ficticios; ningún secreto ni dato personal real en el repositorio | Búsqueda de secretos en la Fase 11 |
| RNF-08 | Transparencia de IA | Toda salida de IA lleva etiqueta, modelo y fecha; toda recomendación requiere validación humana | Capturas del chatbot y los agentes |
| RNF-09 | Rendimiento | El dashboard carga en menos de 3 segundos con los datos de demostración | Medición en el navegador |
| RNF-10 | Reproducibilidad | El proyecto se instala y ejecuta siguiendo el README, con `.env.example`, migraciones y *seed* | Prueba de instalación limpia |
| RNF-11 | Disponibilidad | Aplicación desplegada en Railway y base de datos en Supabase, con tarea de mantenimiento que evita la pausa por inactividad | URL pública activa |

---

## 3. Reglas de negocio

| ID | Regla |
|---|---|
| RN-01 | El stock nunca puede quedar negativo. Una venta o ajuste que lo deje negativo se rechaza con 409 |
| RN-02 | El precio y el costo de cada ítem vendido se toman del producto en el servidor y se guardan en el detalle de la venta |
| RN-03 | El total de la venta lo calcula el servidor (Σ cantidad × precio unitario). Si el cliente envía precios o totales, la petición se rechaza por campos no permitidos |
| RN-04 | La venta, el descuento de stock, el kardex y la auditoría se registran en una sola transacción |
| RN-05 | Los usuarios BOD y CAJ solo operan sobre su propia sucursal; la sucursal se toma de la sesión, no de la petición |
| RN-06 | Un producto inactivo no se puede vender ni incluir en órdenes de compra |
| RN-07 | Transiciones válidas de una orden de compra: BORRADOR → APROBADA, BORRADOR → CANCELADA, APROBADA → RECIBIDA, APROBADA → CANCELADA. Cualquier otra se rechaza con 409 |
| RN-08 | Solo se reciben órdenes APROBADAS. La recepción suma al stock las cantidades de cada ítem, registra el kardex y guarda la fecha real. La entrega es a tiempo si la fecha de recepción es menor o igual a la fecha esperada |
| RN-09 | Ningún agente puede aprobar, cancelar ni recibir órdenes; solo crearlas en BORRADOR |
| RN-10 | Solo el gerente anula ventas en estado REGISTRADA, con motivo; se restituye el stock y se registra en el kardex. Las ventas anuladas no cuentan en los KPI |
| RN-11 | Todo ajuste de inventario requiere un motivo de al menos 5 caracteres |
| RN-12 | Estado del inventario: AGOTADO si stock = 0; BAJO_MINIMO si 0 < stock ≤ mínimo; SOBRESTOCK si stock > máximo; NORMAL en otro caso |
| RN-13 | El stock mínimo es mayor o igual a 0 y el máximo es mayor que el mínimo |
| RN-14 | El costo de un producto es mayor que 0 y el precio es mayor o igual al costo |
| RN-15 | Son únicos el SKU del producto, el documento del cliente, el NIT del proveedor, el código de la sucursal y el correo del usuario |
| RN-16 | Una entidad con historial asociado (ventas, órdenes, movimientos) no se elimina físicamente; se desactiva |
| RN-17 | La cantidad sugerida de reposición se calcula en código con la fórmula de `07-IAG` §5.2; el modelo de IA no inventa cantidades |
| RN-18 | Las recomendaciones de los agentes nacen PENDIENTES; solo el gerente las acepta o descarta, y queda registrado quién y cuándo |
| RN-19 | Un usuario desactivado no puede iniciar sesión |
| RN-20 | Los usuarios BOD y CAJ deben tener una sucursal asignada; ADM y GER no la tienen |
| RN-21 | Se auditan: inicio de sesión (exitoso y fallido), creación, edición, desactivación y eliminación de registros, ventas, anulaciones, ajustes, cambios de estado de órdenes, ejecuciones de agentes y decisiones sobre recomendaciones |

---

## 4. Interfaz de programación (API REST)

Todas las rutas están bajo `/api`, intercambian JSON (excepto los CSV) y requieren sesión salvo las marcadas como públicas. Los roles indican quién puede usarlas; el alcance por sucursal se aplica según RN-05.

### 4.1 Autenticación

| Método | Ruta | Roles | Descripción |
|---|---|---|---|
| POST | `/auth/login` | Público | Inicia sesión y establece la cookie |
| POST | `/auth/logout` | Todos | Cierra la sesión |
| GET | `/auth/me` | Todos | Usuario actual, rol y sucursal |

### 4.2 Catálogos y usuarios

Patrón para `usuarios`, `sucursales`, `categorias`, `proveedores`, `productos` y `clientes`:

| Método | Ruta | Descripción |
|---|---|---|
| GET | `/{recurso}?q=&page=&pageSize=&activo=` | Listar con búsqueda y paginación |
| POST | `/{recurso}` | Crear |
| GET | `/{recurso}/{id}` | Consultar uno |
| PATCH | `/{recurso}/{id}` | Actualizar |
| DELETE | `/{recurso}/{id}` | Eliminar, o desactivar según RN-16 |

### 4.3 Inventario

| Método | Ruta | Roles | Descripción |
|---|---|---|---|
| GET | `/inventario?sucursalId=&estado=&categoriaId=&q=` | ADM, GER, BOD, CAJ | Existencias con estado |
| PATCH | `/inventario/{id}` | ADM, BOD | Cambiar stock mínimo y máximo |
| POST | `/inventario/{id}/ajustes` | BOD | Registrar un ajuste con motivo |
| GET | `/inventario/kardex?productoId=&sucursalId=` | ADM, GER, BOD | Movimientos |

### 4.4 Ventas

| Método | Ruta | Roles | Descripción |
|---|---|---|---|
| GET | `/ventas?desde=&hasta=&sucursalId=&estado=&clienteId=` | ADM, GER, CAJ | Listar |
| POST | `/ventas` | CAJ | Registrar: `{ clienteId?, medioPago, items: [{ productoId, cantidad }] }` |
| GET | `/ventas/{id}` | ADM, GER, CAJ | Detalle |
| POST | `/ventas/{id}/anular` | GER | Anular con `{ motivo }` |

### 4.5 Órdenes de compra

| Método | Ruta | Roles | Descripción |
|---|---|---|---|
| GET | `/ordenes-compra?estado=&proveedorId=&sucursalId=&origen=` | ADM, GER, BOD | Listar |
| POST | `/ordenes-compra` | BOD | Crear borrador |
| GET | `/ordenes-compra/{id}` | ADM, GER, BOD | Detalle |
| PATCH | `/ordenes-compra/{id}` | BOD, GER | Editar borrador |
| POST | `/ordenes-compra/{id}/aprobar` | GER | Aprobar |
| POST | `/ordenes-compra/{id}/cancelar` | GER | Cancelar con `{ motivo }` |
| POST | `/ordenes-compra/{id}/recibir` | BOD | Registrar recepción |

### 4.6 Dashboard y reportes

| Método | Ruta | Roles | Descripción |
|---|---|---|---|
| GET | `/dashboard/kpis?desde=&hasta=&sucursalId=&categoriaId=` | ADM, GER | KPI con variación |
| GET | `/dashboard/graficos?...` | ADM, GER | Series de los gráficos |
| GET | `/dashboard/alertas?sucursalId=` | ADM, GER, BOD | Productos agotados y bajo mínimo |
| GET | `/reportes/ventas.csv?...` | ADM, GER | Ventas detalladas |
| GET | `/reportes/inventario-bajo-minimo.csv?...` | ADM, GER, BOD | Inventario crítico |
| GET | `/reportes/cumplimiento-proveedores.csv?...` | ADM, GER | Entregas por proveedor |

### 4.7 Chatbot y agentes

| Método | Ruta | Roles | Descripción |
|---|---|---|---|
| POST | `/chat` | Todos | Enviar mensaje `{ conversacionId?, mensaje }` |
| GET | `/chat/conversaciones` | Todos | Conversaciones propias |
| GET | `/chat/conversaciones/{id}` | Todos | Mensajes de una conversación propia |
| POST | `/agentes/inventario` | ADM, GER | Ejecutar el Agente 1 `{ sucursalId? }` |
| POST | `/agentes/comercial` | ADM, GER | Ejecutar el Agente 2 `{ desde?, hasta?, sucursalId?, ejecucionInventarioId? }` |
| POST | `/agentes/informe-ejecutivo` | ADM, GER | Ejecutar el Agente 1 y luego el Agente 2 `{ desde?, hasta?, sucursalId? }` |
| GET | `/agentes/ejecuciones?agente=&estado=` | ADM, GER | Historial |
| GET | `/agentes/ejecuciones/{id}` | ADM, GER | Detalle con herramientas y salida |
| GET | `/recomendaciones?estado=&tipo=&prioridad=&q=` | ADM, GER | Listar |
| GET | `/recomendaciones/{id}` | ADM, GER | Detalle |
| POST | `/recomendaciones/{id}/aceptar` | GER | Aceptar `{ comentario? }` |
| POST | `/recomendaciones/{id}/descartar` | GER | Descartar `{ comentario }` |

### 4.8 Auditoría y sistema

| Método | Ruta | Roles | Descripción |
|---|---|---|---|
| GET | `/auditoria?usuarioId=&accion=&entidad=&desde=&hasta=` | ADM | Consultar |
| GET | `/health` | Público | Estado del servicio y la BD |

### 4.9 Formato de errores

```json
{ "error": { "codigo": "STOCK_INSUFICIENTE", "mensaje": "No hay existencias suficientes de Arroz 500 g (disponible: 3).", "detalles": [] } }
```

| HTTP | Uso |
|---|---|
| 400 | Datos inválidos (validación Zod, campos no permitidos) |
| 401 | Sin sesión o sesión vencida |
| 403 | Rol o sucursal sin permiso |
| 404 | Recurso inexistente o fuera del alcance del usuario |
| 409 | Violación de una regla de negocio o de unicidad |
| 429 | Demasiados intentos (inicio de sesión) o límite del servicio de IA |
| 500 | Error interno, con mensaje genérico y sin traza |
| 503 | Servicio de IA no disponible temporalmente |

---

## 5. Fuera de alcance

Ver `03-NEG` §9.2.
