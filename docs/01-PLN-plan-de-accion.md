# 01-PLN — Plan de acción

**Proyecto:** CeibaERP · **Repositorio:** `tf-fsi-ceiba-erp` · **Fecha límite de entrega:** viernes 4 de diciembre de 2026.

---

## 1. Principios del plan

1. **Se cumple todo lo que pide la guía.** No hay componentes opcionales entre los exigidos: CRUD, persistencia, flujo de negocio completo, IA aplicada, chatbot, dos agentes que interactúan, dashboard con al menos seis KPI, reportes, validaciones, pruebas, repositorio, capturas e informe.
2. **Producto mínimo viable (MVP) completo y funcional de extremo a extremo.** Pocos procesos, pero implementados de verdad, sin datos estáticos simulados.
3. **Los números los calcula el código, la IA los interpreta.** Los KPI, las alertas y los cálculos de reposición se obtienen con consultas y funciones verificables; los modelos de lenguaje orquestan, priorizan y explican sobre esos resultados.
4. **Una fase a la vez.** Cada fase termina con su criterio de aceptación cumplido, sus capturas tomadas y su rama integrada según `02-GIT`.
5. **Trazabilidad del uso de IA.** Cada prompt usado con GitHub Copilot o Claude se registra en el historial de prompts (ver sección 5).

---

## 2. Herramientas

| Ámbito | Herramienta |
|---|---|
| Desarrollo asistido por IA | Claude (Opus 5.5) para la mayor parte del código, scripts y documentación; GitHub Copilot (VS Code, modo agente) para componentes de interfaz y tareas acotadas |
| Aplicación | Next.js + TypeScript, Tailwind CSS + shadcn/ui, Recharts, Zod |
| Datos | PostgreSQL en Supabase + Prisma ORM |
| Inteligencia artificial | API de Google Gemini con llamadas a funciones (*function calling*) |
| Pruebas | Vitest, pruebas de seguridad con PowerShell (`Invoke-RestMethod`), TestSprite |
| Despliegue | Railway (aplicación) y Supabase (base de datos) |
| Control de versiones | Git + GitHub con Gitflow (ramas, nombres y etiquetas) |
| Opcional | n8n autoalojado en Railway, solo si aporta valor al flujo de agentes |

El detalle y la justificación de cada tecnología se documentan en `08-ARQ`.

---

## 3. Fases

Cada fase indica objetivo, actividades, criterio de aceptación, capturas y versión. Las capturas marcadas con **[OBL-n]** corresponden a las ocho capturas obligatorias de la guía (sección 4 de este documento).

### Fase 0 — Preparación del entorno y documentación base

- **Objetivo:** dejar listo el entorno, las cuentas y la estructura del repositorio.
- **Actividades:**
  - Verificar herramientas instaladas (Node.js, npm, Git, CLI de Railway, VS Code).
  - Confirmar la cuenta activa de Railway en la terminal.
  - Clonar el repositorio, configurar la identidad de Git con el correo *noreply* de GitHub e inicializar Gitflow (`main`, `develop`).
  - Crear el documento externo de historial de prompts.
  - Crear el proyecto en Supabase con la Data API desactivada, más dos roles: `prisma` (migraciones) y `ceiba_app` (aplicación, mínimo privilegio).
  - Crear la clave de la API de Gemini.
  - Instalar extensiones de VS Code.
  - Documentos: `00-IDX`, `01-PLN`, `02-GIT`, `03-NEG`, `12-MAT`.
- **Criterio de aceptación:** `develop` contiene `docs/` y `.gitignore`; los roles existen en Supabase con los privilegios esperados; la clave de Gemini está guardada fuera del repositorio.
- **Capturas:** proyecto de Supabase, roles de la base de datos, clave de Gemini (oculta), historial de ramas.

### Fase 1 — Requisitos y diseño

- **Objetivo:** especificar el sistema antes de escribir código.
- **Actividades:** redactar `04-REQ`, `05-DAT` (con diagrama entidad-relación), `06-KPI`, `07-IAG`, `08-ARQ`, `09-SEG` y `10-PRU`.
- **Criterio de aceptación:** cada exigencia de la guía aparece en `12-MAT` con su requisito asociado.
- **Versión:** `release/0.1.0` → etiqueta `v0.1.0`.

### Fase 2 — Proyecto base

- **Objetivo:** tener una aplicación que arranca, se conecta a la base de datos y autentica usuarios por rol.
- **Actividades:**
  - Crear el proyecto Next.js con TypeScript, Tailwind y shadcn/ui.
  - Definir el esquema de Prisma, ejecutar la migración inicial y verificar los privilegios de `ceiba_app`.
  - Escribir el script de datos de demostración (*seed*) con casos sembrados a propósito.
  - Autenticación con credenciales (bcrypt + JWT en cookie httpOnly) y autorización por rol en el servidor.
  - Navegación según el rol, endpoint `/api/health`, `.env.example` y README inicial.
- **Criterio de aceptación:** los cuatro usuarios de demostración inician sesión y ven solo su menú; el *seed* se ejecuta de forma repetible; Vitest corre.
- **Versión:** `v0.2.0`.

### Fase 3 — Módulos de gestión

- **Objetivo:** gestionar la información maestra del negocio.
- **Actividades:**
  - CRUD de productos, categorías, proveedores, sucursales, clientes y usuarios.
  - Consulta de inventario por sucursal y ajuste con motivo obligatorio.
  - Validación con Zod en cliente y servidor, mensajes de error comprensibles, búsqueda y paginación.
  - Registro de auditoría de las operaciones.
- **Criterio de aceptación:** cada entidad se crea, consulta, actualiza y elimina (o desactiva cuando hay historial asociado) con validaciones efectivas.
- **Capturas:** **[OBL-2]** módulo de gestión de información; **[OBL-3]** formulario de creación y actualización.
- **Versión:** `v0.3.0`.

### Fase 4 — Procesos de negocio

- **Objetivo:** implementar los flujos transaccionales del ERP.
- **Actividades:**
  - Venta en caja con varios ítems, que descuenta el stock en una transacción. Los precios y costos se toman del servidor.
  - Anulación de venta por el gerente, con restitución del stock.
  - Ciclo de la orden de compra: BORRADOR → APROBADA → RECIBIDA / CANCELADA.
  - Recepción de mercancía con aumento del stock.
  - Kardex de movimientos de inventario.
- **Criterio de aceptación:** el stock nunca queda negativo; las transiciones de estado inválidas se rechazan; cada movimiento queda en el kardex y en la auditoría.
- **Capturas:** venta registrada, orden de compra en cada estado, kardex.
- **Versión:** `v0.4.0`.

### Fase 5 — Dashboard y reportes

- **Objetivo:** convertir los datos en información para decidir.
- **Actividades:**
  - Al menos seis KPI con su ficha completa (se planean ocho).
  - Tarjetas de KPI, al menos dos gráficos y filtros por periodo, sucursal y categoría.
  - Interpretación breve de los resultados y explicación de cómo los usan los agentes y el chatbot.
  - Reportes exportables a CSV.
- **Criterio de aceptación:** cada KPI se verifica a mano con una consulta SQL independiente sobre los mismos datos.
- **Capturas:** **[OBL-1]** pantalla principal o dashboard general; **[OBL-8]** dashboard con KPI y gráficos alimentados por datos de prueba; reporte exportado.
- **Versión:** `v0.5.0`.

### Fase 6 — Chatbot empresarial

- **Objetivo:** que cualquier usuario consulte el negocio en lenguaje natural.
- **Actividades:**
  - Chatbot con Gemini y herramientas de solo lectura, las mismas funciones que alimentan los KPI.
  - Respeta el rol y la sucursal del usuario.
  - Indica explícitamente cuando no tiene información.
  - Etiqueta "Respuesta generada por IA".
  - Registro de conversaciones.
- **Criterio de aceptación:** responde correctamente las preguntas de ejemplo de la guía y rechaza con transparencia las que no tienen datos.
- **Capturas:** **[OBL-5]** chatbot respondiendo una consulta pertinente; chatbot ante una pregunta sin información disponible.
- **Versión:** `v0.6.0`.

### Fase 7 — Agentes inteligentes

- **Objetivo:** dos agentes con responsabilidades diferenciadas que interactúan entre sí.
- **Actividades:**
  - **Agente 1, analista de inventario:** propone la reposición y crea órdenes de compra en BORRADOR con origen IA.
  - **Agente 2, analista comercial:** analiza ventas y tendencias y usa el resultado del agente 1.
  - **Informe ejecutivo:** orquesta ambos agentes.
  - Registro de ejecuciones y validación humana de las recomendaciones.
- **Criterio de aceptación:** las salidas de los agentes coinciden con el dashboard; ninguna recomendación se aplica sin aprobación humana.
- **Capturas:** **[OBL-6]** primer agente ejecutando una tarea; **[OBL-7]** segundo agente ejecutando una tarea; **[OBL-4]** proceso de negocio completo (venta → alerta → agente → aprobación → recepción → dashboard actualizado); interacción entre agentes.
- **Versión:** `v0.7.0`.

### Fase 8 — Pruebas automatizadas y de seguridad

- **Objetivo:** demostrar que el sistema funciona y se defiende.
- **Actividades:**
  - Vitest: reglas de negocio, KPI, transiciones de estado y validaciones.
  - Pruebas manuales en PowerShell: 401, 403, datos alterados desde el cliente, acceso a recursos de otra sucursal y stock negativo.
  - Preguntas al chatbot sin respuesta disponible.
- **Criterio de aceptación:** todas las pruebas en verde; los defectos encontrados quedan registrados y corregidos.
- **Capturas:** resultado de Vitest en verde y pruebas de seguridad.
- **Versión:** `v0.8.0`.

### Fase 9 — Despliegue

- **Objetivo:** dejar la aplicación accesible en la nube.
- **Actividades:**
  - Desplegar en Railway con las variables configuradas en su panel.
  - Ejecutar las migraciones y el *seed* en Supabase.
  - Programar una tarea diaria que consulte `/api/health` para evitar que se pause el proyecto gratuito de Supabase.
  - Redactar `11-DEP`.
- **Criterio de aceptación:** la URL pública funciona con todos los módulos y los usuarios de demostración.
- **Capturas:** servicio activo en Railway, aplicación desplegada.
- **Versión:** `v0.9.0`.

### Fase 10 — Pruebas con TestSprite

- **Objetivo:** validación automatizada adicional sobre la aplicación desplegada.
- **Actividades:**
  - Revisar y depurar el plan propuesto: quitar duplicados y casos imposibles, y corregir rutas y precondiciones.
  - Ejecutar las pruebas.
  - Clasificar cada fallo: defecto funcional, problema de ambiente, dato de prueba inválido o falso positivo.
  - Corregir solo los defectos reales y volver a correr solo las pruebas fallidas.
- **Capturas:** plan depurado, resultados y reejecución.
- **Versión:** `v0.9.x` según las correcciones.

### Fase 11 — Cierre del repositorio

- **Objetivo:** repositorio completo y reproducible.
- **Actividades:**
  - README final con instalación, configuración, ejecución y credenciales de demostración.
  - `13-PRM` con el historial de prompts.
  - Búsqueda de secretos en el historial de Git.
  - Revisión de `.env.example` y capturas finales.
- **Criterio de aceptación:** un tercero puede clonar, configurar y ejecutar el proyecto siguiendo el README.
- **Versión:** `release/1.0.0` → etiqueta `v1.0.0`.

### Fase 12 — Informe técnico

- **Objetivo:** el informe en PDF exigido por la guía.
- **Actividades:**
  - Documento de 8 a 15 páginas con los 18 puntos de la guía.
  - Formato APA: Times New Roman 12, doble espacio, márgenes de 1".
  - Figuras con pie numerado.
  - Portada con espacio para los integrantes.
- **Entregable:** informe en PDF.

### Fase opcional — n8n en Railway

Solo se implementa si aporta valor real; por ejemplo, programar el informe ejecutivo de los agentes. No es requisito de la guía.

---

## 4. Capturas obligatorias de la guía

| Código | Captura exigida | Fase |
|---|---|---|
| OBL-1 | Pantalla principal o dashboard general | 5 |
| OBL-2 | Módulo de gestión de información | 3 |
| OBL-3 | Formulario o proceso de creación y actualización de registros | 3 |
| OBL-4 | Ejecución de un proceso de negocio completo | 7 |
| OBL-5 | Chatbot respondiendo una consulta pertinente | 6 |
| OBL-6 | Primer agente ejecutando una tarea | 7 |
| OBL-7 | Segundo agente ejecutando una tarea | 7 |
| OBL-8 | Dashboard con KPI y gráficos alimentados por datos de prueba | 5 |

**Nomenclatura de capturas:** `faseNN_MM_descripcion.png` (por ejemplo, `fase05_02_dashboard_kpi.png`). Cada captura lleva en el informe un título y una descripción breve de lo que demuestra.

---

## 5. Historial de prompts

- Se lleva en un documento externo al repositorio: `C:\dev\tf-fsi-prompts\HISTORIAL_PROMPTS.md`.
- Formato del título de cada entrada: `Herramienta - DD/MM/AAAA - Propósito`. Por ejemplo, `Copilot - 21/11/2026 - Generacion de pantallas CRUD de productos`.
- Para Claude se registra el prompt autocontenido que habría generado el resultado sin la conversación intermedia.
- Al cierre (Fase 11) se incorpora al repositorio como `docs/13-PRM-historial-de-prompts.md` y sirve como fuente para el informe.

---

## 6. Reglas transversales de seguridad

- Ningún secreto (cadenas de conexión, contraseñas, claves de API, `JWT_SECRET`) se escribe en chats con agentes de IA ni en el repositorio. Solo van en `.env` local o en los paneles de Supabase y Railway.
- Los agentes de IA no leen ni modifican archivos `.env`.
- No se ejecutan comandos que impriman valores de variables de entorno.
- Antes de cada commit se ejecuta `git status --short | Select-String "\.env"`; solo puede aparecer `.env.example`.
- Las capturas muestran `.env.example`, nunca `.env`, y se ocultan contraseñas e IP públicas.
- La aplicación se conecta con un usuario de base de datos de mínimo privilegio (`ceiba_app`).
- Los mensajes de commit no llevan atribución.
