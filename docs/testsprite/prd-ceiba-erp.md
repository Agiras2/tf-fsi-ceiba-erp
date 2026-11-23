<!-- ============================================================
     CeibaERP - Especificación para TestSprite (docs/10-PRU sección 6)
     Documento que se carga en el portal de TestSprite para generar el plan de pruebas
     sobre la aplicación desplegada. No contiene contraseñas: las credenciales se
     escriben directamente en la configuración de la prueba en el portal.
     ============================================================ -->

# CeibaERP — Especificación para pruebas end-to-end (TestSprite)

## 1. Producto

CeibaERP es un ERP web para **Supermercados Ceiba S.A.S.**, una cadena ficticia con cuatro sucursales (Ceiba Centro, Ceiba Laureles, Ceiba Envigado y Ceiba Bello). Integra ventas, inventario por sucursal, compras a proveedores, catálogos, un dashboard gerencial con KPI, un chatbot con IA y dos agentes de IA. **Toda la interfaz está en español** y todos los datos son ficticios.

- URL: `https://tf-fsi-ceiba-erp-production.up.railway.app`
- Moneda: pesos colombianos (formato `$ 12.345`). Zona horaria: America/Bogota.

## 2. Cuentas de prueba

| Rol | Correo | Página de inicio después de ingresar |
|---|---|---|
| Gerente (cuenta principal) | `gerente@ceiba.test` | `/dashboard` |
| Cajero de Ceiba Centro | `cajero.centro@ceiba.test` | `/ventas/caja` |
| Bodega de Ceiba Centro | `bodega.centro@ceiba.test` | `/inventario` |

Las contraseñas se entregan en la configuración de la prueba, no en este documento. **No usar la cuenta de administrador.**

## 3. Inicio y cierre de sesión

- `/login` muestra los campos **Correo** y **Contraseña** y el botón **Ingresar**.
- Credenciales válidas: redirige a la página de inicio del rol (tabla anterior).
- Credenciales inválidas: muestra un mensaje de error en el formulario y permanece en `/login`.
- Protección contra fuerza bruta: 5 intentos fallidos con el mismo correo desde la misma IP en 15 minutos bloquean temporalmente ese correo. **Las pruebas de credenciales inválidas deben usar un correo inexistente** (por ejemplo, `noexiste@ceiba.test`), nunca el de una cuenta de prueba.
- Sin sesión, cualquier página interna redirige a `/login`.
- El menú de usuario (esquina superior) tiene la opción **Salir**, que cierra la sesión y vuelve a `/login`.

## 4. Menú por rol

El menú lateral muestra solo las opciones permitidas al rol. Si un usuario escribe en la barra de direcciones una ruta que no le corresponde, la app lo lleva a `/sin-permiso`.

| Opción del menú | Ruta | Gerente | Cajero | Bodega |
|---|---|---|---|---|
| Dashboard | `/dashboard` | ✔ | | |
| Reportes | `/reportes` | ✔ | | ✔ |
| Caja (ventas) | `/ventas/caja` | | ✔ | |
| Ventas | `/ventas` | ✔ | ✔ | |
| Inventario | `/inventario` | ✔ | ✔ | ✔ |
| Órdenes de compra | `/compras` | ✔ | | ✔ |
| Productos | `/catalogos/productos` | ✔ | ✔ | ✔ |
| Categorías | `/catalogos/categorias` | ✔ | | ✔ |
| Proveedores | `/catalogos/proveedores` | ✔ | | ✔ |
| Sucursales | `/catalogos/sucursales` | ✔ | | ✔ |
| Clientes | `/catalogos/clientes` | ✔ | ✔ | |
| Asistente (chatbot) | `/chat` | ✔ | ✔ | ✔ |
| Agentes de IA | `/agentes` | ✔ | | |
| Usuarios, Auditoría | `/usuarios`, `/auditoria` | | | |

Usuarios y Auditoría son exclusivas del administrador: el gerente debe recibir `/sin-permiso` si las abre por URL.

## 5. Funcionalidades a probar

### 5.1 Dashboard (gerente)
Tarjetas de KPI (ventas, margen, rotación, agotados, cumplimiento de proveedores, entre otros) y gráficos alimentados por los datos de demostración. Tiene botones de periodo rápido (**7 días**, **30 días**, **90 días**) y filtros de sucursal ("Todas las sucursales" o una sucursal) y de categoría; al cambiarlos, los valores se recalculan.

### 5.2 Catálogos
Listados con búsqueda, filtros y paginación. **Crear, editar y desactivar productos, categorías, proveedores y sucursales es exclusivo del administrador**: para el gerente y la bodega esas pantallas son de solo lectura y no muestran los botones de crear, editar ni desactivar (comportamiento esperado, no un defecto). La única excepción es **Clientes**, donde el cajero puede registrar un cliente nuevo; los campos obligatorios vacíos muestran mensajes de validación y un documento repetido muestra un mensaje de error.

### 5.3 Inventario
Existencias por producto y sucursal, con indicador de estado (**Agotado**, **Bajo mínimo**, **Normal**, **Sobrestock**). Cada fila permite abrir el **kardex** (historial de movimientos) en un diálogo.

### 5.4 Caja (cajero)
En **Productos** se busca con "Buscar por SKU o producto" y se agrega con el botón de cada fila a **Venta actual**. Las cantidades se ajustan con los botones "Sumar una unidad" y "Restar una unidad". El cliente es opcional. El botón **Registrar venta** guarda la venta y abre el diálogo **"Venta #N registrada"** con el botón **Nueva venta**; el stock de la sucursal baja en las unidades vendidas. No se puede vender más que el stock disponible.

### 5.5 Ventas (gerente o cajero)
Listado de ventas con filtros y detalle de cada venta (productos, cantidades, total, medio de pago).

### 5.6 Órdenes de compra
Estados: **BORRADOR → APROBADA → RECIBIDA** (o **CANCELADA**).
- **La bodega crea** la orden de su sucursal con **Nueva orden de compra** (proveedor, productos y cantidades); se guarda en BORRADOR con el mensaje "Orden #N creada en borrador.". El gerente no tiene ese botón (comportamiento esperado).
- **El gerente aprueba** (o cancela) una orden en BORRADOR desde el detalle de la orden.
- **La bodega recibe** una orden APROBADA de su sucursal; al recibir, la orden pasa a RECIBIDA y el stock aumenta.

### 5.7 Reportes (gerente)
Tarjetas de reportes con rango de fechas y botón de descarga (la descarga está fuera de alcance) y una **vista previa en pantalla** del inventario agotado y bajo mínimo.

### 5.8 Asistente (chatbot)
El usuario escribe una pregunta sobre el negocio (por ejemplo, "¿Cuáles son los 5 productos más vendidos del último mes?") y recibe una respuesta basada en los datos del sistema, con la etiqueta "Respuesta generada por IA · Gemini (modelo) · fecha". La respuesta puede tardar hasta 60 segundos. Si el servicio de IA no está disponible, se muestra un mensaje de error comprensible y la pregunta se conserva para reintentar.

## 6. Fuera de alcance

- **Agentes de IA** (`/agentes`): ejecuciones largas que consumen cuota del modelo; están cubiertos por pruebas propias.
- **Usuarios y Auditoría**: exclusivas del administrador.
- Exportación y descarga de archivos.
- Anulación de ventas y cancelación masiva de órdenes.
- Pruebas de carga o de rendimiento.

## 7. Reglas para los datos de prueba

- Todo registro que creen las pruebas debe llevar el prefijo **"TS "** en el nombre (por ejemplo, "TS Categoría 01") para distinguirlo de los datos de demostración.
- Las ventas se hacen en Ceiba Centro, con 1 o 2 unidades de productos que tengan stock.
- El periodo por defecto del dashboard son los últimos 30 días completos **hasta ayer** (por diseño); el listado de Ventas sí incluye las del día.
- No desactivar ni modificar registros de demostración existentes; crear los propios con el prefijo.
- Hacer como máximo **una** pregunta al chatbot por prueba.
