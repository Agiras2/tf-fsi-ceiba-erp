<!-- ============================================================
     CeibaERP - Historial de prompts (docs/00-IDX, documento 13)
     Copia del historial que se llevó fuera del repositorio durante el desarrollo.
     Ningún prompt contiene contraseñas, cadenas de conexión ni claves de API.
     ============================================================ -->

# 13-PRM — Historial de prompts

Registro cronológico de cada prompt usado con herramientas de IA durante el desarrollo de CeibaERP. Se llevó como documento externo mientras se construía el sistema y se incorporó al repositorio en la Fase 11. Es la fuente de la sección "Uso de herramientas de IA en el desarrollo" del informe.

## Convenciones

- **Título de cada entrada:** `Herramienta - DD/MM/AAAA - Propósito` (sin tildes en el título).
- **Herramientas:** `Claude` (Claude Opus 5.5 en claude.ai: diseño, documentación y la mayor parte del código, más la revisión del código de Copilot), `Copilot` (GitHub Copilot en VS Code, modo agente: pantallas a partir de un módulo de referencia) y `TestSprite` (agente del portal web de TestSprite: plan y ejecución de pruebas end-to-end).
- **Prompts de Claude:** se registra el prompt autocontenido que genera el resultado, sin la conversación intermedia.
- **Revisión humana:** cada entrada indica qué se verificó o corrigió antes de aceptar el resultado; ningún resultado se integró sin revisión, pruebas y commit propio.
- **Sin secretos:** ningún prompt contiene contraseñas, cadenas de conexión ni claves de API; todos prohíben a la herramienta leer o modificar los archivos `.env`.
- **Orden:** cronológico.

## Resumen

| Herramienta | Entradas | Uso principal |
|---|---|---|
| Claude | 19 | Documentación (fases 0 y 1), capa de datos y *seed*, autenticación, API, procesos de negocio, dashboard, chatbot, agentes, pruebas, despliegue, especificación para TestSprite y corrección de defectos (DEF-01, DEF-03, DEF-05 a DEF-08), README, capturas e informe final |
| Copilot | 6 | Pantallas de catálogos, usuarios, consulta de ventas e historial de agentes, y la corrección del DEF-02 |
| TestSprite | 1 | Exploración de la app desplegada, plan de 15 casos y ejecución end-to-end |

| Fase | Entradas |
|---|---|
| 0 — Documentación base | 1 |
| 1 — Requisitos y diseño | 2 |
| 2 — Proyecto base | 3, 4, 5, 6 |
| 3 — Módulos de gestión | 7, 8, 9, 10, 11, 12, 13, 14 |
| 4 — Procesos de negocio | 15, 16 |
| 5 — Dashboard y reportes | 17 |
| 6 — Chatbot | 18, 19 |
| 7 — Agentes de IA | 20, 21 |
| 8 — Pruebas | 22 |
| 9 — Despliegue | 23 |
| 10 — TestSprite | 24, 25 |
| 11 y 12 — Cierre del repositorio e informe | 26 |

## Plantilla

```
## [N]. Herramienta - DD/MM/AAAA - Proposito

- **Fase:** NN
- **Rama:** feature/...
- **Resultado:** archivos creados o modificados
- **Revision y ajustes:** que se verifico o corrigio a mano

### Prompt

(texto del prompt)
```

---

## 1. Claude - 21/11/2026 - Fase 0: documentacion base del repositorio y .gitignore

- **Fase:** 00
- **Rama:** feature/fase-00-documentacion-base
- **Resultado:** `.gitignore`, `docs/00-IDX-indice.md`, `docs/01-PLN-plan-de-accion.md`, `docs/02-GIT-convenciones-gitflow.md`, `docs/03-NEG-negocio-y-flujo.md`, `docs/12-MAT-matriz-de-cumplimiento.md`
- **Revision y ajustes:** revisión de alcance, roles y fases contra la guía del trabajo final.

### Prompt

```text
Actúa como analista de sistemas y arquitecto de software. Genera, en español y en Markdown compatible con GitHub (diagramas en Mermaid), la documentación base del repositorio "tf-fsi-ceiba-erp", trabajo final del curso Fundamentos de Sistemas de Información (Facultad de Ingeniería, Universidad de Antioquia, semestre 2026-2). Fecha límite: 4 de diciembre de 2026.

CONTEXTO DE LA GUÍA
El trabajo exige un sistema de información empresarial (se eligió ERP) para una cadena de supermercados ficticia, con: CRUD real y persistencia en base de datos; al menos un flujo de negocio completo; IA aplicada a una necesidad concreta (no basta un campo de texto con preguntas genéricas a un modelo); un chatbot que consulte datos reales e indique cuando no tiene información; al menos dos agentes de IA con responsabilidades diferenciadas y mecanismos de interacción definidos; un dashboard con mínimo seis KPI calculados desde los datos (cada uno con nombre, definición, fórmula, periodo y fuente; tarjetas, dos o más gráficos, filtros, interpretación y explicación de cómo los usan los agentes y el chatbot); reportes consultables o exportables; validaciones, manejo de errores y pruebas; requerimientos no funcionales de usabilidad, seguridad, integridad, mantenibilidad, trazabilidad, confiabilidad, privacidad y transparencia de IA. Entregables: aplicación funcional, repositorio GitHub (README, dependencias, script de BD, datos ficticios, .env.example, historial de prompts), mínimo ocho capturas obligatorias (dashboard general, módulo de gestión, formulario de creación/actualización, proceso de negocio completo, chatbot, agente 1, agente 2, dashboard con KPI y gráficos) e informe técnico en PDF de 8 a 15 páginas con 18 puntos. Todo lo exigido tiene el mismo peso: no priorices ni declares opcional ningún requisito de la guía.

PRODUCTO
CeibaERP para "Supermercados Ceiba S.A.S." (ficticia), sede en Medellín, cuatro sucursales: Centro, Laureles, Envigado y Bello. Problemas: agotamiento de productos de alta demanda, baja rotación, retrasos de proveedores, falta de información consolidada, clientes frecuentes no identificados y demoras para responder preguntas del negocio.
Roles: Administrador, Gerente, Bodega (jefe de bodega de una sucursal) y Cajero (de una sucursal).
Módulos: autenticación y usuarios, catálogos (productos, categorías, proveedores, sucursales, clientes), inventario por sucursal con kardex y ajustes con motivo, ventas (caja con varios ítems y anulación por el gerente), compras (orden de compra BORRADOR → APROBADA → RECIBIDA / CANCELADA con fecha esperada y real), dashboard, reportes CSV, chatbot, agentes y auditoría.
Flujo principal "ciclo de abastecimiento inteligente": venta → descuento transaccional de stock y kardex → producto bajo mínimo en alertas y KPI → el gerente ejecuta el Agente 1 (analista de inventario: cobertura frente al tiempo de entrega del proveedor, priorización y criterios) → orden de compra en BORRADOR marcada como generada por IA → el gerente aprueba o cancela → bodega recibe → sube el stock → dashboard actualizado. En paralelo, el Agente 2 (analista comercial) usa la salida del Agente 1 y genera recomendaciones PENDIENTES de validación humana. Principio: los números los calcula el código; la IA orquesta, prioriza y explica.
Fuera de alcance: pasarelas de pago (PayPal, bancos), facturación electrónica DIAN, contabilidad y nómina, recepciones y devoluciones parciales, transferencias entre sucursales, app móvil y decisiones de IA sin aprobación humana.
Tecnologías: Next.js + TypeScript, Tailwind + shadcn/ui, Recharts, Zod, PostgreSQL en Supabase + Prisma, Google Gemini con function calling, Vitest, pruebas de seguridad con PowerShell 5.1, TestSprite, despliegue en Railway; n8n en Railway solo como opción si aporta valor. Desarrollo asistido por Claude (la mayor parte del código) y GitHub Copilot.

ARCHIVOS A GENERAR
1. .gitignore para Next.js/Prisma que excluya .env y .env.* pero permita .env.example.
2. docs/00-IDX-indice.md: convención de nombres NN-COD-nombre.md (código de tres letras reutilizable en referencias como REQ-RF-05), tabla de los documentos 00 a 13 (IDX, PLN, GIT, NEG, REQ, DAT, KPI, IAG, ARQ, SEG, PRU, DEP, MAT, PRM) con estado y orden de lectura.
3. docs/01-PLN-plan-de-accion.md: principios, herramientas y fases 0 a 12 sin repartir por días (preparación, requisitos y diseño, proyecto base, módulos de gestión, procesos de negocio, dashboard y reportes, chatbot, agentes, pruebas, despliegue con keep-alive para Supabase gratuito, TestSprite, cierre del repositorio, informe) más una fase opcional de n8n; cada fase con objetivo, actividades, criterio de aceptación, capturas (marcando OBL-1 a OBL-8) y versión; nomenclatura de capturas faseNN_MM_descripcion.png; reglas del historial de prompts (documento externo, título "Herramienta - DD/MM/AAAA - Propósito"); reglas de seguridad transversales.
4. docs/02-GIT-convenciones-gitflow.md: ramas Gitflow (main, develop, feature/fase-NN-descripcion, release/X.Y.Z, hotfix/X.Y.Z) con comandos estándar de git en PowerShell 5.1 y merges --no-ff, commits Conventional Commits en español sin tildes y SIN líneas de atribución, etiquetas anotadas vX.Y.Z con tabla de versiones de v0.1.0 a v1.0.0, verificación de .env antes de cada commit y correo noreply de GitHub.
5. docs/03-NEG-negocio-y-flujo.md: organización, problema, solución, justificación de ERP frente a CRM, roles con matriz de permisos verificada en servidor, módulos, flujo principal (flowchart Mermaid), flujos secundarios (secuencia de venta, ajuste, anulación), diagramas de estado de orden de compra, venta y recomendación, alcance, fuera de alcance y supuestos (COP, proveedor principal con tiempo de entrega, 90 días de datos de demostración con casos sembrados).
6. docs/12-MAT-matriz-de-cumplimiento.md: matriz que relacione cada exigencia de la guía (secciones 4, 6, 7, 8, 10, 11 y los 18 puntos del informe) con cómo se cumple, fase, evidencia y estado.
```

---

## 2. Claude - 21/11/2026 - Fase 1: requisitos y diseno del sistema (docs 04 a 10)

- **Fase:** 01
- **Rama:** feature/fase-01-requisitos-y-diseno
- **Resultado:** `docs/04-REQ-requisitos.md`, `docs/05-DAT-modelo-de-datos.md`, `docs/06-KPI-indicadores.md`, `docs/07-IAG-chatbot-y-agentes.md`, `docs/08-ARQ-arquitectura-y-tecnologias.md`, `docs/09-SEG-seguridad.md`, `docs/10-PRU-plan-de-pruebas.md`; actualización de `docs/00-IDX-indice.md` y `docs/12-MAT-matriz-de-cumplimiento.md`
- **Revision y ajustes:** verificación de versiones estables de los paquetes en npm (Prisma fijado en 7.10 porque `latest` apunta a una RC 8.0), consulta de la documentación de Supabase sobre el rol para Prisma, el pooler y la Data API, y revisión de referencias cruzadas entre documentos.

### Prompt

```text
Actúa como analista de sistemas y arquitecto de software. Continúa la documentación del repositorio "tf-fsi-ceiba-erp" (CeibaERP, ERP para la cadena ficticia Supermercados Ceiba S.A.S., trabajo final de Fundamentos de Sistemas de Información, UdeA 2026-2). Ya existen docs/00-IDX, 01-PLN, 02-GIT, 03-NEG (organización, roles ADMIN/GERENTE/BODEGA/CAJERO con matriz de permisos, módulos, ciclo de abastecimiento inteligente, estados de orden de compra, venta y recomendación, fuera de alcance) y 12-MAT. Genera en español, Markdown compatible con GitHub y diagramas Mermaid, los documentos de requisitos y diseño, siguiendo la convención NN-COD-nombre.md y códigos internos reutilizables (RF-NN, RNF-NN, RN-NN, KPI-NN, PRU-XNN).

1. docs/04-REQ-requisitos.md: requisitos funcionales con ID, roles y criterio de aceptación (autenticación, usuarios, auditoría, catálogos, inventario con kardex y ajustes, ventas con anulación, compras con aprobación y recepción, dashboard con 8 KPI, 4 gráficos, filtros, interpretación por reglas, alertas y explicación del uso por la IA, reportes CSV, chatbot, agentes con informe ejecutivo y validación humana, endpoint de salud, seed); requisitos no funcionales (usabilidad, seguridad, integridad, mantenibilidad, trazabilidad, confiabilidad, privacidad, transparencia de IA, rendimiento, reproducibilidad, disponibilidad); reglas de negocio (stock nunca negativo, precios y totales calculados en servidor, transacción única para venta y kardex, alcance por sucursal tomado de la sesión, transiciones válidas de orden de compra, agentes que solo crean borradores, anulación con restitución, estados de inventario, unicidades, desactivación lógica con historial, recomendaciones PENDIENTES, auditoría); API REST completa bajo /api con roles y formato uniforme de errores (400, 401, 403, 404, 409, 429, 500, 503).
2. docs/05-DAT-modelo-de-datos.md: PostgreSQL + Prisma, ids enteros, montos DECIMAL(14,2), camelCase en código y snake_case en BD (@@map/@map); diagrama erDiagram; enumeraciones; diccionario de Sucursal, Usuario, Categoria, Proveedor (tiempo de entrega), Producto (costo, precio), Cliente, Inventario (stock, mínimo, máximo, única por producto y sucursal), MovimientoInventario (kardex con signo y stock resultante), Venta y DetalleVenta (precio y costo copiados), OrdenCompra (origen MANUAL o AGENTE_INVENTARIO, vínculo a la ejecución) y su detalle, EjecucionAgente (parámetros, herramientas usadas, resultado, modelo, duración, ejecución padre y de entrada), Recomendacion, Conversacion, MensajeChat, Auditoria; restricciones CHECK y control de concurrencia; seed determinista de 90 días con casos sembrados (riesgo de agotamiento, agotados, baja rotación, sucursal Bello con bajo desempeño, proveedor impuntual, tendencias, clientes recurrentes, órdenes en todos los estados) y contraseña demo desde SEED_DEMO_PASSWORD.
3. docs/06-KPI-indicadores.md: fichas de KPI-01 ventas totales, KPI-02 ticket promedio, KPI-03 margen bruto, KPI-04 nivel de agotamiento, KPI-05 baja rotación (cobertura > 60 días), KPI-06 cumplimiento de pedidos, KPI-07 clientes recurrentes y KPI-08 rotación de inventario (inventario inicial y final reconstruido desde el kardex), cada una con definición, fórmula, periodo, fuente, filtros, unidad y consulta SQL parametrizada de verificación; gráficos G-01 a G-04; semáforos y reglas de interpretación automática deterministas; tabla de uso de los KPI por el chatbot y los agentes.
4. docs/07-IAG-chatbot-y-agentes.md: principios (el código calcula y la IA interpreta, herramientas compartidas de solo lectura, contexto de rol impuesto por el servidor, humano en el ciclo, transparencia); arquitectura con Gemini (@google/genai, function calling, salida JSON validada con Zod); catálogo de herramientas con permisos por rol y agente; chatbot con instrucciones de sistema, respuesta "sin información", fuentes visibles y preguntas de referencia; Agente 1 analista de inventario con fórmula de reposición en código (venta diaria de 28 días, cobertura, en tránsito, tiempo de entrega, 7 días de seguridad, stock objetivo acotado al máximo), papel del modelo, esquema de salida y creación de órdenes BORRADOR por proveedor y sucursal; Agente 2 analista comercial que consume la salida del Agente 1 con regla de coherencia (no promocionar productos en riesgo); informe ejecutivo orquestado en código con diagrama de secuencia y mecanismos de interacción; transparencia, trazabilidad, manejo de 429/503 y límites.
5. docs/08-ARQ-arquitectura-y-tecnologias.md: monolito modular Next.js por capas con diagrama, estructura de carpetas, tabla de tecnologías con versiones estables vigentes y justificación (Next.js 16, React 19, Tailwind 4 + shadcn/ui, Recharts, Zod, PostgreSQL en Supabase, Prisma 7.10 con @prisma/adapter-pg, @google/genai, jose + bcryptjs, Vitest, TestSprite, Railway, GitHub Actions), alternativas descartadas, conexión mediante session pooler con rol ceiba_app (aplicación) y rol prisma (migraciones, solo local) y tabla de variables de entorno.
6. docs/09-SEG-seguridad.md: autenticación (bcrypt, JWT en cookie httpOnly, límite de intentos), autorización en servidor y alcance por sucursal, validación estricta con Zod, gestión de secretos, mínimo privilegio y Data API de Supabase desactivada, seguridad de la IA, encabezados y CSRF, trazabilidad, riesgos y limitaciones.
7. docs/10-PRU-plan-de-pruebas.md: estrategia (unitarias, integración contra una BD de pruebas separada en Supabase, seguridad con PowerShell 5.1 e Invoke-RestMethod -DisableKeepAlive, chatbot y agentes, verificación SQL de KPI, TestSprite), casos con ID y resultado esperado, plantilla PowerShell sin imprimir secretos, procedimiento de depuración y clasificación de fallos de TestSprite, registro de defectos y criterios de salida.
Actualiza además 00-IDX (estados y enlaces) y 12-MAT (columna de requisitos asociados a cada exigencia de la guía). No incluyas secretos.
```

---

## 3. Claude - 21/11/2026 - Fase 2A: proyecto Next.js, dependencias, variables de entorno y esquema de pruebas

- **Fase:** 02
- **Rama:** feature/fase-02-proyecto-base
- **Resultado:** proyecto Next.js 16.4.6 (TypeScript, Tailwind, ESLint, App Router, src/), dependencias base, `.env.example`, `.gitattributes`, esquema `test` en Supabase; actualización de `docs/08-ARQ` y `docs/10-PRU`
- **Revision y ajustes:** se probó la creación del proyecto y la instalación; se resolvió un conflicto entre Vitest 5 y `@types/node` 20 instalando `@types/node` 24; Prisma fijado en la versión exacta 7.10.1; el esquema `test` reemplaza un segundo proyecto de Supabase por el límite de dos proyectos del plan gratuito. 

### Prompt

```text
Para el repositorio tf-fsi-ceiba-erp (CeibaERP, Windows con PowerShell 5.1, Node.js 24, Gitflow con rama feature/fase-02-proyecto-base), genera los comandos y archivos para crear la base del proyecto:
1. Crear un proyecto Next.js 16.4.6 con TypeScript, Tailwind, ESLint, App Router, carpeta src/ y alias "@/*" en una carpeta temporal (create-next-app con --disable-git y --skip-install) y copiarlo al repositorio con robocopy sin sobrescribir .gitignore ni README.md; renombrar el paquete a ceiba-erp.
2. Instalar las dependencias: @prisma/client y @prisma/adapter-pg 7.10.1 exactas, pg, zod 4, jose 6, bcryptjs 3, @google/genai 3, recharts 3, dotenv; de desarrollo: prisma 7.10.1 exacta, @types/node 24 (compatible con Vitest 5), vitest 5, tsx, @types/pg. Verifica las versiones.
3. Escribir .env.example sin secretos con DATABASE_URL (rol ceiba_app) y DIRECT_URL (rol prisma) por el session pooler de Supabase en el puerto 5432 con sslmode=require, sus variantes _TEST con schema=test, JWT_SECRET, GEMINI_API_KEY, GEMINI_MODEL, SEED_DEMO_PASSWORD y APP_TIMEZONE=America/Bogota.
4. Escribir .gitattributes que normalice a LF, deje .ps1/.bat/.cmd en CRLF y marque los binarios.
5. Dar una función de PowerShell que genere claves aleatorias con RandomNumberGenerator y las copie al portapapeles sin imprimirlas.
6. Dar el SQL para crear en Supabase el esquema test propiedad del rol prisma, con privilegios por defecto de solo datos para ceiba_app, y la consulta de verificación de pg_default_acl.
7. Actualizar docs/08-ARQ y docs/10-PRU para usar el esquema test como base de datos de pruebas.
No incluyas secretos ni pidas leer o imprimir el archivo .env.
```

---

## 4. Claude - 21/11/2026 - Fase 2B: esquema Prisma, migracion inicial y verificacion de privilegios

- **Fase:** 02
- **Rama:** feature/fase-02-proyecto-base
- **Resultado:** `prisma/schema.prisma`, `prisma.config.ts`, `prisma/sql/restricciones.sql`, `prisma/migrations/` (migración inicial), `src/server/conexion.ts`, `src/server/db.ts`, `scripts/verificar-db.ts`, `certs/supabase-ca.crt`; actualización de `docs/07-IAG` y `docs/08-ARQ`
- **Revision y ajustes:** esquema validado y cliente generado; tipos verificados con tsc; restricciones probadas en PostgreSQL local; conexión probada contra PostgreSQL local con roles equivalentes (escritura en public y test según la URL, CREATE TABLE rechazado con 42501); se descartó fijar search_path por conexión por un aviso de concurrencia de pg y se optó por calificar el esquema en el SQL directo; prisma.config sin env() obligatorio para que "prisma generate" funcione en Railway sin DIRECT_URL; ajuste de 07-IAG a Gemini 3.8 Flash (sin temperature). La primera aplicación de la migración falló con 42501 (permission denied for database postgres) porque migrate diff incluyó CREATE SCHEMA "public"; se eliminó esa sentencia en lugar de ampliar los privilegios del rol prisma, se marcó el intento como revertido con "migrate resolve --rolled-back" y se aplicó de nuevo.

### Prompt

```text
Para el repositorio tf-fsi-ceiba-erp (Next.js 16, Prisma 7.10.1 con @prisma/adapter-pg, PostgreSQL en Supabase, Windows con PowerShell 5.1), implementa la capa de datos según docs/05-DAT-modelo-de-datos.md:
1. prisma/schema.prisma con generator "prisma-client" (salida ../src/generated/prisma), datasource postgresql sin URL (Prisma 7), las 12 enumeraciones y los 17 modelos (sucursal, usuario, categoria, proveedor, producto, cliente, inventario, movimiento_inventario, venta, detalle_venta, orden_compra, detalle_orden_compra, ejecucion_agente, recomendacion, conversacion, mensaje_chat, auditoria) con nombres camelCase en código y snake_case en la BD (@@map/@map), DECIMAL(14,2), timestamptz, onDelete Restrict salvo los detalles (Cascade), índices para consultas por sucursal y fecha, y relaciones nombradas para los usuarios que crean, aprueban, reciben o anulan.
2. prisma.config.ts que cargue dotenv, use DIRECT_URL (rol prisma) o DIRECT_URL_TEST si PRISMA_TARGET=test, defina el seed con tsx y no exija la URL para "prisma generate".
3. prisma/sql/restricciones.sql (ASCII) con restricciones CHECK: stock no negativo, mínimo/máximo, costo > 0 y precio >= costo, tiempo de entrega > 0, cantidades > 0, montos no negativos, coherencia de anulación de venta y de recepción de orden, stock resultante no negativo.
4. src/server/conexion.ts: prepara la conexión desde una URL (extrae schema, maneja sslmode: disable sin TLS para local, TLS verificado con certs/supabase-ca.crt si existe, si no cifrado sin verificar) y crea PrismaClient con un Pool pg (máx. 5) y PrismaPg con la opción schema. src/server/db.ts: instancia única con DATABASE_URL (rol ceiba_app).
5. scripts/verificar-db.ts: para DATABASE_URL y DATABASE_URL_TEST muestra el modo TLS, el usuario conectado, las tablas esperadas encontradas, una lectura con Prisma, el número de restricciones CHECK y comprueba que el rol de la aplicación NO puede crear tablas; sin imprimir cadenas ni contraseñas.
6. Comandos PowerShell para: generar la migración inicial con "prisma migrate diff --from-empty --to-schema ... --script -o" en prisma/migrations/<fecha>_inicial, anexarle las restricciones, aplicarla con "prisma migrate deploy" en public, sincronizar el esquema test con "prisma db push" y "prisma db execute --file", agregar scripts npm (postinstall, db:generar, db:migrar, db:verificar, test) y descargar el certificado raíz de Supabase.
7. Actualiza docs/08-ARQ (esquema, TLS, migraciones, verificación) y docs/07-IAG (gemini-3.8-flash, sin temperature, thinking level).
```

---

## 5. Claude - 21/11/2026 - Fase 2C: datos de demostracion (seed) con simulacion de 90 dias

- **Fase:** 02
- **Rama:** feature/fase-02-proyecto-base
- **Resultado:** `prisma/seed.ts`, `prisma/seed-datos.ts`, script `db:seed`; actualización de `docs/05-DAT` (sección 5) y `docs/09-SEG` (riesgo aceptado de npm audit)
- **Revision y ajustes:** se probó contra PostgreSQL local con la migración real del repositorio y roles equivalentes. Correcciones durante las pruebas: cantidades de reposición redondeadas hacia abajo para no superar el máximo; 800 clientes en lugar de 200, porque con 200 casi todos resultaban recurrentes y el KPI-07 perdía sentido; minutos únicos por venta para que el kardex quede en orden cronológico cuando hay anulaciones; tildes en nombres y correos normalizados. Verificado: kardex igual al inventario en 240 combinaciones, totales de venta iguales a sus detalles, ejecución repetible en public y test, KPI de referencia en rangos realistas.

### Prompt

```text
Para el repositorio tf-fsi-ceiba-erp (CeibaERP, Prisma 7.10.1 con adaptador pg, esquema en prisma/schema.prisma y conexión en src/server/conexion.ts), escribe el seed de datos de demostración en TypeScript (prisma/seed.ts y prisma/seed-datos.ts, ejecutable con tsx) que:
1. Use un generador aleatorio con semilla fija (mulberry32) y fechas relativas al día de ejecución en America/Bogota (UTC-5).
2. Defina catálogos ficticios: 4 sucursales (Centro, Laureles, Envigado, Bello con menos ventas), 10 usuarios @ceiba.test (1 admin, 1 gerente, bodega y cajero por sucursal) con contraseña desde SEED_DEMO_PASSWORD validada (mínimo 10 caracteres con letras y números) y hash bcrypt de costo 12, 8 categorías, 8 proveedores con tiempo de entrega y probabilidad de entrega tardía (uno impuntual cercano al 55 %), 60 productos con costo, precio y popularidad, y 800 clientes con nombres, documentos y correos ficticios.
3. Simule 90 días en orden cronológico: carga inicial (mínimo y máximo derivados de la demanda esperada y el tiempo de entrega), recepciones a las 07:30, ventas con horas únicas por sucursal (factor de fin de semana, tendencia creciente de Bebidas en las últimas 5 semanas, cliente identificado según la sucursal con distribución sesgada para generar recurrencia, medios de pago, ~0,8 % de anulaciones con restitución inmediata) y reposición a las 18:00 agrupada por proveedor, aprobada por el gerente, con retrasos según el proveedor; las órdenes que llegan después de hoy quedan APROBADAS.
4. Siembre casos: 5 productos en riesgo (sin reposición los últimos 12 días y ajuste final por conteo físico a la mitad de la cobertura del tiempo de entrega), 3 combinaciones agotadas (sin reposición los últimos 30 días), 6 productos de baja rotación con sobrestock, 2 órdenes en borrador y 2 canceladas.
5. Borre los datos existentes en orden seguro, inserte catálogos con createManyAndReturn, reserve los ids de ventas y órdenes con nextval(pg_get_serial_sequence(...)) para enlazar detalles y kardex sin privilegios extra, inserte por lotes de 2000, registre una auditoría SEED_EJECUTADO e imprima un resumen (ventas, órdenes por estado, ventas por sucursal, agotados, sobrestock, casos sembrados).
6. Permita cargar el esquema de pruebas con SEED_DESTINO=test (DATABASE_URL_TEST).
Garantiza que el kardex cuadre con el inventario, que el total de cada venta sea la suma de sus detalles y que se respeten las restricciones CHECK. Actualiza docs/05-DAT sección 5 con los volúmenes y casos resultantes.
```

---

## 6. Claude - 21/11/2026 - Fase 2D: autenticacion, autorizacion por rol, layout y pruebas unitarias

- **Fase:** 02
- **Rama:** feature/fase-02-proyecto-base
- **Resultado:** `src/proxy.ts`, `src/server/auth/` (sesion, limitador, autorizacion), `src/server/errores.ts`, `src/server/auditoria.ts`, `src/server/validacion/` (zod en español, login), `src/app/api/auth/{login,logout,me}`, `src/app/api/health`, `src/app/login`, `src/app/(app)` (layout y 15 páginas por módulo), `src/app/sin-permiso`, `src/components/layout/`, `src/lib/navegacion.ts`, `next.config.ts`, `vitest.config.mts`, `tests/unit/auth.test.ts`, `README.md`; componentes shadcn/ui generados con su CLI; actualización de `docs/05-DAT`, `docs/08-ARQ` y `docs/12-MAT`; versión v0.2.0
- **Revision y ajustes:** se consultó la documentación incluida en Next.js 16.4.6 (proxy.ts reemplaza a middleware y Cache Components viene activado); se desactivó Cache Components por depender casi todas las páginas de la sesión; se probó con el servidor de desarrollo contra PostgreSQL local con datos sembrados (401 sin sesión, credenciales inválidas, campo extra rechazado, acceso y bloqueo por rol, token alterado, 429 al sexto intento, cierre de sesión, encabezados y auditoría); mensajes de Zod pasados a español; hash ficticio válido para igualar el tiempo de respuesta cuando el correo no existe.

### Prompt

```text
Para el repositorio tf-fsi-ceiba-erp (Next.js 16.4.6 con App Router y carpeta src/, Prisma 7 con cliente en src/server/db.ts, shadcn/ui con base radix, Zod 4, jose, bcryptjs, Vitest; documentos docs/03-NEG, 04-REQ y 09-SEG), implementa la base de autenticación y autorización:
1. src/lib/navegacion.ts: roles ADMIN, GERENTE, BODEGA y CAJERO con etiquetas, menú agrupado con ruta, roles e icono de lucide según la matriz de permisos de 03-NEG, página de inicio por rol y funciones para filtrar el menú y decidir el acceso a una ruta (coincidencia más específica, denegar por defecto).
2. src/server/auth/sesion.ts: JWT HS256 con jose (sub, nombre, rol, sucursalId; 8 h), clave JWT_SECRET de al menos 32 caracteres, verificación que valide el rol y opciones de cookie httpOnly, secure en producción, sameSite lax. src/server/auth/limitador.ts: limitador en memoria de 5 fallos por correo e IP en 15 minutos, con reloj inyectable. src/server/auth/autorizacion.ts: leerSesion (JWT más confirmación en la BD de que el usuario sigue activo y no cambió rol ni sucursal), requerirSesion y requerirRol para Route Handlers (401 o 403), sucursalPermitida para el alcance de BODEGA y CAJERO, y protegerPagina para Server Components (redirige a /login o /sin-permiso).
3. src/server/errores.ts con ErrorApi y manejarError (formato { error: { codigo, mensaje, detalles } }, Zod → 400 con detalles por campo, Prisma P2002/P2025/P2003 → 409/404/409, resto → 500 genérico). src/server/auditoria.ts que no interrumpa la operación si falla, con la IP desde x-forwarded-for. src/server/validacion/zod.ts que configure Zod en español, y el esquema estricto de login que normalice el correo.
4. Rutas: POST /api/auth/login (límite de intentos, comparación con un hash ficticio cuando el correo no existe, mensaje genérico, auditoría de éxito, fallo y bloqueo, actualización del último acceso, cookie y página de inicio del rol), POST /api/auth/logout, GET /api/auth/me y GET /api/health público (SELECT 1, sin datos internos).
5. src/proxy.ts (Next 16): rutas públicas /login, /api/auth/login y /api/health; sin JWT válido, las API responden 401 y las páginas redirigen a /login?destino=...; matcher que excluya los archivos estáticos.
6. Interfaz: layout raíz en español con Toaster de sonner; página /login (Server Component que valida el destino contra redirecciones abiertas, más un formulario cliente con validación y errores por campo); layout (app) con barra lateral por rol, encabezado con la sucursal, nombre, rol y botón Salir; página /sin-permiso; 15 páginas de módulos protegidas con protegerPagina y un componente "en construcción" que indica la fase.
7. next.config.ts sin Cache Components, sin el encabezado x-powered-by y con encabezados de seguridad (nosniff, X-Frame-Options DENY, Referrer-Policy, Permissions-Policy, CSP con frame-ancestors none).
8. vitest.config.mts con el alias @ y pruebas unitarias de la sesión (válida, firma alterada, otra clave, rol inexistente), del limitador, de la validación de login y de la matriz de permisos.
9. README.md con descripción, tecnologías, instalación, variables, base de datos, ejecución, usuarios de demostración sin contraseña, pruebas, estructura y aviso de datos ficticios.
Incluye los comandos de shadcn para crear button, input, label, card, badge, separator y sonner, y un script de pruebas de seguridad en PowerShell 5.1 que pida la contraseña de forma oculta.
```

---

## 7. Claude - 21/11/2026 - Fase 3A: API CRUD de catalogos y usuarios y modulo de referencia de productos

- **Fase:** 03
- **Rama:** feature/fase-03-modulos-gestion
- **Resultado:** `src/lib/{zod,permisos,api-cliente,formato}.ts`, `src/lib/esquemas/{comunes,catalogos}.ts`, `src/hooks/use-listado.ts`, `src/components/comun/*`, `src/server/servicios/{comun,catalogos,usuarios}.ts`, `src/server/http/rutas-crud.ts`, 12 rutas en `src/app/api/{productos,categorias,proveedores,sucursales,clientes,usuarios}`, módulo `src/app/(app)/catalogos/productos/`, `tests/unit/catalogos.test.ts`; ajustes en `autorizacion.ts` (cache por solicitud), `errores.ts` (campo duplicado), `layout.tsx` (fuente); docs 08, 09 y 12
- **Revision y ajustes:** se descargaron del repositorio oficial de shadcn los componentes base radix para verificar tipos con su API real; se reescribió el hook de listados por la regla react-hooks/set-state-in-effect; se inspeccionó el error real de Prisma 7 con el adaptador pg para indicar el campo duplicado; se probó la API completa contra PostgreSQL local con datos sembrados (creación con inventario, duplicados, RN-14 al editar, permisos 403, eliminación y desactivación según historial, RN-20, autodesactivación 409, sin hash en respuestas) y los botones por rol en la página.

### Prompt

```text
Para el repositorio tf-fsi-ceiba-erp (Next.js 16, Prisma 7, Zod 4, shadcn/ui radix-nova, autenticación de src/server/auth), implementa la gestión de catálogos según docs/04-REQ (RF-03, RF-06 a RF-11, RN-14 a RN-16, RN-20) y docs/03-NEG 4.1:
1. Esquemas Zod compartidos por cliente y servidor (src/lib/esquemas): piezas comunes (texto, texto opcional que convierte "" en null, correo y teléfono opcionales, id y monto con hasta 2 decimales aceptando texto de formularios, parámetros de listado q, pagina, tamano ≤ 100 y activo) y, por catálogo, un esquema base sin refinamientos para edición parcial más el esquema completo estricto (sucursal, categoría, proveedor con NIT y tiempo de entrega, producto con SKU en mayúsculas, unidad, costo y precio con RN-14, cliente con documento numérico, usuario con contraseña de 10 caracteres con letras y números y RN-20). Zod configurado en español en src/lib/zod.ts.
2. Tabla única de permisos por recurso (leer, crear, editar, eliminar) en src/lib/permisos.ts, con una función de acciones permitidas para la interfaz.
3. Servicios con la interfaz ServicioCrud (listar paginado con búsqueda insensible y filtros, obtener, crear, actualizar, eliminar): crear producto o sucursal genera inventario con stock 0, mínimo 10 y máximo 60 en una transacción; edición de producto verifica RN-14 con los valores guardados y que la categoría y el proveedor existan y estén activos; eliminar desactiva si hay historial (ventas, órdenes, movimientos, productos, usuarios) y si no borra con sus inventarios; usuarios sin exponer el hash, con hash bcrypt de costo 12, RN-20 con los valores resultantes, sin permitir que alguien se desactive o cambie su propio rol, y siempre desactivados en lugar de eliminados; auditoría de cada operación con los campos cambiados.
4. Fábrica de Route Handlers (rutasColeccion y rutasRecurso) que autentica, autoriza por rol, valida el id y el JSON y responde con el formato uniforme; las 12 rutas se declaran en una línea cada una.
5. Errores: P2002 indicando el campo, deduciéndolo del nombre del índice "<tabla>_<columna>_key" que entrega el adaptador pg.
6. Interfaz cliente: cliente HTTP que convierte errores en errores por campo y recarga al recibir 401; formatos es-CO; hook useListado (búsqueda con espera de 300 ms, filtros, paginación, recarga) sin llamar setState de forma síncrona dentro de efectos; componentes comunes (Campo, Buscador, Paginacion, FilasEstado, ConfirmarAccion, InsigniaEstado).
7. Módulo de referencia de productos: página protegida, listado con filtros de categoría, proveedor y estado, columnas de costo, precio y margen, formulario en diálogo validado con el mismo esquema y errores por campo, desactivar con confirmación, reactivar y botones según permisos.
8. Lectura de sesión memorizada por solicitud con cache de React e incluida la sucursal; fuente --font-sans en el layout raíz.
9. Pruebas unitarias de los esquemas, las reglas RN-14 y RN-20 y la detección de cambios. Documenta en docs/08-ARQ las decisiones y en docs/09-SEG el riesgo aceptado de la CLI de shadcn.
```

---

## 8. Copilot - 21/11/2026 - Fase 3B: plan de pantallas de catalogos y usuarios

- **Fase:** 03
- **Rama:** feature/fase-03-modulos-gestion
- **Resultado:** plan de entregas (pendiente de revisión)
- **Revision y ajustes:** plan revisado con Claude y aprobado con ajustes: entregas 1 a 4 en una sola solicitud para cuidar la cuota, carga de opciones según puedeLeer por el defecto DEF-01, mismo patrón de formulario que productos, sin comandos git y con verificación final.

### Prompt

```text
Eres el agente de desarrollo de CeibaERP (este repositorio). Antes de escribir código, lee: AGENTS.md; docs/03-NEG-negocio-y-flujo.md (sección 4.1, permisos); docs/04-REQ-requisitos.md (RF-03, RF-06 a RF-10, RN-15, RN-16, RN-20); docs/08-ARQ-arquitectura-y-tecnologias.md (secciones 2 y 5); y el módulo de referencia completo en src/app/(app)/catalogos/productos/ (page.tsx, modulo-productos.tsx, formulario-producto.tsx, tipos.ts).

REGLAS
- No leas, abras, crees ni modifiques archivos .env ni .env.local. No ejecutes comandos que impriman variables de entorno.
- La API ya existe y NO se modifica: /api/categorias, /api/proveedores, /api/sucursales, /api/clientes y /api/usuarios (GET con q, pagina, tamano, activo y filtros; POST; GET, PATCH y DELETE por id). Listados: { datos, total, pagina, tamano }. Errores: { error: { codigo, mensaje, detalles: [{ campo, mensaje }] } }. DELETE responde { resultado: "eliminado" | "desactivado" }.
- No modifiques src/server/**, src/lib/**, src/hooks/**, src/components/ui/**, src/components/comun/** ni el módulo de productos. Solo crea o reemplaza archivos dentro de src/app/(app)/catalogos/categorias/, proveedores/, sucursales/, clientes/ y src/app/(app)/usuarios/.
- Reutiliza los mismos componentes y patrones del módulo de productos: useListado, api y ErrorCliente, Buscador, Paginacion, FilasEstado, ConfirmarAccion, InsigniaEstado, Campo, NativeSelect, Dialog, Table y toast de sonner. Valida en el cliente con los esquemas existentes de src/lib/esquemas/catalogos.ts (esquemaCategoria, esquemaProveedor, esquemaSucursal, esquemaCliente, esquemaUsuario, esquemaUsuarioEdicion). Muestra los botones según accionesPermitidas(recurso, rol) de src/lib/permisos.ts. Cada page.tsx llama a protegerPagina con su ruta.
- Interfaz en español con tildes. TypeScript estricto, sin any.

ALCANCE (una pantalla por recurso)
1. Categorías: Nombre, Descripción, Productos (conteo), Estado; filtro de estado.
2. Proveedores: NIT, Nombre, Contacto, Teléfono, Correo, Tiempo de entrega (días), Productos, Estado.
3. Sucursales: Código, Nombre, Ciudad, Dirección, Estado. Al crear, indicar que se genera su inventario con stock 0.
4. Clientes: Documento, Nombre, Correo, Teléfono, Estado. El cajero puede crear, pero no editar ni desactivar (lo definen los permisos).
5. Usuarios: Nombre, Correo, Rol (con ETIQUETA_ROL), Sucursal, Último acceso (formatoFechaHora), Estado; filtros de rol y estado. Formulario: nombre, correo, rol, sucursal (select de /api/sucursales activas; deshabilitado y vacío cuando el rol es Administrador o Gerente), contraseña (obligatoria al crear; al editar, opcional con la ayuda "Déjela vacía para conservar la actual", y se envía solo si se escribió). page.tsx pasa sesion.usuarioId al componente para no mostrar el botón de desactivar en el propio usuario.

PLAN PRIMERO
No escribas código todavía. Responde con un plan dividido en entregas pequeñas (una por recurso), con los archivos que crearás y un criterio de aceptación verificable para cada una. Espera mi aprobación.

CRITERIO DE TERMINADO
- npm run typecheck, npm run lint y npm test sin errores.
- Cada pantalla lista, busca, filtra, pagina, crea, edita, desactiva y reactiva usando la API existente, y muestra los errores de validación junto a cada campo.
```

---

## 9. Claude - 21/11/2026 - Fase 3A: correccion DEF-01 (opciones segun permisos de lectura)

- **Fase:** 03
- **Rama:** feature/fase-03-modulos-gestion
- **Resultado:** `src/lib/permisos.ts` (puedeLeer), `src/app/(app)/catalogos/productos/{page,modulo-productos}.tsx`, `tests/unit/catalogos.test.ts`, registro del defecto en `docs/10-PRU`
- **Revision y ajustes:** defecto encontrado en la prueba manual con el rol Cajero (403 al pedir categorías y proveedores, mensaje de error repetido); se clasificó como defecto funcional, se corrigió y se verificó contra PostgreSQL local; 28 pruebas en verde.

### Prompt

```text
En CeibaERP, la pantalla de productos (src/app/(app)/catalogos/productos) muestra el error "No fue posible cargar las opciones del formulario" al entrar con el rol Cajero, porque pide /api/categorias y /api/proveedores y ese rol no puede consultarlos según src/lib/permisos.ts (respuesta 403). Agrega a permisos.ts una función puedeLeer(recurso, rol); calcula en page.tsx si el rol puede leer categorías y proveedores y pásalo como prop; carga esas opciones solo si está permitido (con cancelación del efecto) y oculta los filtros correspondientes cuando no lo está. Agrega pruebas unitarias de puedeLeer y de las acciones del cajero sobre clientes, y registra el defecto como DEF-01 en el registro de defectos de docs/10-PRU.
```

---

## 10. Copilot - 21/11/2026 - Fase 3B: pantallas de categorias, proveedores, sucursales y clientes

- **Fase:** 03
- **Rama:** feature/fase-03-modulos-gestion
- **Resultado:** 16 archivos en `src/app/(app)/catalogos/{categorias,proveedores,sucursales,clientes}/` (page.tsx, modulo-*.tsx, formulario-*.tsx y tipos.ts por recurso), +1170 líneas. Copilot ejecutó typecheck, lint y test: todo correcto, 28 pruebas aprobadas.
- **Revision y ajustes:** revisión de código por Claude: estructura, validación, permisos y alcance correctos; se encontró el defecto DEF-02 en categorías (campo "activo" en lugar de "activa"), no detectado por typecheck, lint ni las pruebas porque el tipo se declaró a mano.

### Prompt

```text
Plan aprobado, con estos ajustes:
1. Implementa ahora las entregas 1 a 4 (categorías, proveedores, sucursales y clientes) en una sola pasada. La entrega 5 (usuarios) la haremos en otra solicitud.
2. Vuelve a leer src/app/(app)/catalogos/productos/ y src/lib/permisos.ts: cambiaron para corregir el defecto DEF-01 (la pantalla pedía datos de recursos que el rol no puede consultar). Regla: solo carga opciones de un recurso si puedeLeer(recurso, rol) lo permite; calcúlalo en page.tsx y pásalo como prop, igual que en productos.
3. Copia la estructura del formulario de productos: un componente interno con key para reiniciar el formulario al cambiar de registro, validación con safeParse y errores por campo, err.porCampo() para los errores de la API, y aria-invalid y aria-describedby en cada control.
4. El toast al desactivar debe distinguir "eliminado" de "desactivado porque tiene historial", como en productos.
5. No ejecutes comandos de git ni instales dependencias. Al terminar, ejecuta npm run typecheck, npm run lint y npm test, corrige lo que falle y entrégame un resumen con los archivos creados y el resultado de los tres comandos.
Recuerda: no leas, abras ni modifiques archivos .env.
```

---

## 11. Copilot - 21/11/2026 - Fase 3B: correccion DEF-02 en la pantalla de categorias

- **Fase:** 03
- **Rama:** feature/fase-03-modulos-gestion
- **Resultado:** `src/app/(app)/catalogos/categorias/tipos.ts` y `modulo-categorias.tsx` (campo `activa`); registro de DEF-02 en `docs/10-PRU`. Commit `fix(catalogos): usa el campo activa en la pantalla de categorias (DEF-02)`.
- **Revision y ajustes:** diagnóstico hecho en la revisión de código de Claude; verificación manual en el navegador (estado, desactivar y reactivar).
- **Nota:** prompt reconstruido a partir del diagnóstico; si se conserva el texto exacto en el chat de Copilot, reemplazarlo.

### Prompt

```text
En la pantalla de categorías (src/app/(app)/catalogos/categorias/) hay un defecto: el tipo y el módulo usan el campo "activo", pero GET /api/categorias devuelve "activa" (femenino, igual que en el esquema baseCategoria de src/lib/esquemas/catalogos.ts). Por eso todas las categorías se muestran como Inactivo, no aparece la acción de desactivar y reactivar falla con 400 (campo no permitido). Corrige tipos.ts y modulo-categorias.tsx para usar "activa" en el tipo, en la insignia de estado, en la decisión de mostrar desactivar o reactivar y en el cuerpo del PATCH de reactivación ({ activa: true }). Usa los nombres de campo exactamente como los devuelve la API. No modifiques nada fuera de esa carpeta, no ejecutes git y al terminar ejecuta npm run typecheck, npm run lint y npm test. No leas, abras ni modifiques archivos .env.
```

---

## 12. Copilot - 21/11/2026 - Fase 3B: entrega 5, pantalla de usuarios

- **Fase:** 03
- **Rama:** feature/fase-03-modulos-gestion
- **Resultado:** `src/app/(app)/usuarios/{page.tsx, modulo-usuarios.tsx, formulario-usuario.tsx, tipos.ts}` (+393 líneas). Copilot ejecutó typecheck, lint y test sin errores. Commit `feat(usuarios): agrega pantalla de gestion de usuarios`.
- **Revision y ajustes:** revisión de Claude sin defectos; verificación manual en el navegador: el propio usuario no tiene botón de desactivar, la edición sin contraseña conserva la actual y la sucursal se deshabilita para Gerente y Administrador.

### Prompt

```text
Ahora implementa la entrega 5 (usuarios) del plan aprobado, con los mismos ajustes de las entregas anteriores y estas precisiones:
1. Usa los nombres de campo exactamente como los devuelve la API (lección de DEF-02). GET /api/usuarios devuelve en cada elemento: id, nombre, email, rol ("ADMIN" | "GERENTE" | "BODEGA" | "CAJERO"), sucursalId (number | null), activo (masculino), ultimoAcceso (string ISO | null), createdAt, updatedAt y sucursal ({ id, nombre } | null). Nunca devuelve passwordHash. Filtros admitidos: q, rol (un rol o "todos"), sucursalId, activo, pagina y tamano.
2. Archivos solo en src/app/(app)/usuarios/: page.tsx, modulo-usuarios.tsx, formulario-usuario.tsx y tipos.ts. page.tsx llama a protegerPagina("/usuarios") y pasa al módulo las acciones de accionesPermitidas("usuarios", rol) y sesion.usuarioId.
3. Listado: Nombre, Correo, Rol (ETIQUETA_ROL de src/lib/navegacion.ts), Sucursal (o "Todas" si es null), Último acceso (formatoFechaHora de src/lib/formato.ts, "Nunca" si es null), Estado y Acciones. Filtros: búsqueda, rol (ROLES de src/lib/navegacion.ts) y estado. No muestres el botón de desactivar en la fila del usuario de la sesión.
4. Formulario: nombre, correo, rol (select con ROLES y ETIQUETA_ROL), sucursal (select cargado de /api/sucursales?activo=true&tamano=100) y contraseña (input type password).
   - Si el rol es ADMIN o GERENTE: sucursal deshabilitada y con valor "" (se envía null).
   - Al crear: valida con esquemaUsuario; la contraseña es obligatoria.
   - Al editar: si la contraseña está vacía, quítala del objeto ANTES de validar con esquemaUsuarioEdicion y no la envíes; muestra la ayuda "Déjela vacía para conservar la actual".
   - Errores de Zod y de la API (err.porCampo()) junto a cada campo; un 409 (por ejemplo, intentar cambiar el propio rol) se muestra en un toast.
5. No modifiques nada fuera de src/app/(app)/usuarios/ ni ejecutes git. Al terminar ejecuta npm run typecheck, npm run lint y npm test y dame el resumen con los archivos creados.
No leas, abras ni modifiques archivos .env.
```

---

## 13. Claude - 21/11/2026 - Fase 3C: inventario por estado, ajustes, umbrales, kardex y consulta de auditoria

- **Fase:** 03
- **Rama:** feature/fase-03-modulos-gestion
- **Resultado:** `src/lib/esquemas/inventario.ts`, `src/server/servicios/{inventario,auditoria}.ts`, rutas `src/app/api/inventario/` (listado, `[id]`, `[id]/ajustes`, `kardex`) y `src/app/api/auditoria`, módulo `src/app/(app)/inventario/` (página, módulo, insignia, diálogos de umbrales, ajuste y kardex, tipos), módulo `src/app/(app)/auditoria/`, `src/hooks/use-listado.ts` (respuesta completa), `src/lib/permisos.ts`, `tests/unit/inventario.test.ts`; `docs/08-ARQ`. Commit `feat(inventario): agrega consulta por estado, ajustes, umbrales, kardex y consulta de auditoria`; versión v0.3.0.
- **Revision y ajustes:** probado contra PostgreSQL local con datos sembrados (filtros por estado resueltos en la BD, ajuste de salida mayor al stock con 409, alcance por sucursal con 404, permisos por rol); 35 pruebas en verde. En la prueba manual se encontró DEF-03 (entrada 14).

### Prompt

```text
Para el repositorio tf-fsi-ceiba-erp (Next.js 16, Prisma 7 con adaptador pg, Zod 4, shadcn/ui; servicios en src/server/servicios con Contexto, auditar, paginar y filtroId; rutas con contexto, leerCuerpo y leerId de src/server/http/rutas-crud.ts; hook useListado), implementa el inventario y la consulta de auditoría según docs/04-REQ (RF-05, RF-12 a RF-15, RN-01, RN-05, RN-11 a RN-13):
1. src/lib/esquemas/inventario.ts (compartido): estados AGOTADO, BAJO_MINIMO, NORMAL y SOBRESTOCK con etiquetas, función estadoInventario según RN-12, esquema estricto de umbrales (mínimo >= 0, máximo > mínimo) y de ajuste (ENTRADA o SALIDA, cantidad entera positiva, motivo de 5 a 200 caracteres).
2. Permisos en src/lib/permisos.ts: inventario (leer todos; umbrales ADMIN y BODEGA; ajustar solo BODEGA; kardex ADMIN, GERENTE y BODEGA) y auditoría (solo ADMIN), con una función de acciones por rol.
3. src/server/servicios/inventario.ts: listar con búsqueda por SKU o nombre, filtros de sucursal (alcance de la sesión para BODEGA y CAJERO), categoría y estado resuelto en la BD comparando columnas con referencias de campo de Prisma, más un resumen con el conteo por estado; actualizar umbrales con auditoría de antes y después; ajustar dentro de una transacción con actualización condicional (stock >= cantidad en las salidas) para que el stock nunca quede negativo, movimiento AJUSTE_ENTRADA o AJUSTE_SALIDA en el kardex con motivo y auditoría en la misma transacción, 409 STOCK_INSUFICIENTE con el disponible; kardex paginado de un producto y sucursal, del más reciente al más antiguo, con el usuario. Registros fuera del alcance responden 404.
4. src/server/servicios/auditoria.ts: listado paginado con búsqueda por acción, filtro de entidad y rango de fechas, con el usuario, y la lista de entidades existentes.
5. Rutas GET /api/inventario, PATCH /api/inventario/[id], POST /api/inventario/[id]/ajustes (201), GET /api/inventario/kardex y GET /api/auditoria.
6. useListado genérico que exponga también la respuesta completa (para el resumen).
7. Pantalla /inventario: tarjetas por estado que filtran la tabla, filtros de búsqueda, sucursal (solo si el rol ve todas y puede leer sucursales), categoría y estado, tabla con stock, mínimo, máximo, unidad e insignia de estado, y acciones según el rol en diálogos: umbrales, ajuste (con stock resultante previsto y motivo) y kardex paginado. Pantalla /auditoria: filtros de acción, entidad y fechas, y detalle JSON plegable.
8. Pruebas unitarias de RN-11, RN-12, RN-13 y de los permisos, y actualización de docs/08-ARQ §5.
Reglas: patrón del módulo de productos (Dialog con componente interno con key, errores por campo, sin setState síncrono dentro de efectos), textos en español, no leer ni modificar archivos .env.
```

---

## 14. Claude - 22/11/2026 - Fase 3C: correccion DEF-03 (el kardex desborda el dialogo)

- **Fase:** 03
- **Rama:** feature/fase-03-modulos-gestion
- **Resultado:** `src/app/(app)/inventario/dialogo-kardex.tsx`; registro de DEF-03 en `docs/10-PRU`. Commit `fix(inventario): evita que el kardex desborde el dialogo (DEF-03)`.
- **Revision y ajustes:** defecto encontrado en la prueba manual con el kardex de Arroz blanco 1 kg; se clasificó como defecto de interfaz y se verificó en el navegador.

### Prompt

```text
En CeibaERP, el diálogo del kardex (src/app/(app)/inventario/dialogo-kardex.tsx) se desborda: la columna Motivo y el botón de página siguiente salen del borde del diálogo. El contenido, como elemento de la cuadrícula CSS de DialogContent, se ensancha hasta el ancho de la tabla. Corrígelo: amplía el diálogo (sm:max-w-5xl), limita el contenido al ancho disponible con min-w-0, deja que el motivo haga salto de línea con un ancho mínimo y máximo, y conserva el desplazamiento horizontal de la tabla dentro de su recuadro. Registra el defecto como DEF-03 en el registro de defectos de docs/10-PRU (prueba, descripción, clasificación, corrección, commit y estado).
```

---

## 15. Claude - 22/11/2026 - Fase 4A: procesos de negocio, ventas y ordenes de compra

- **Fase:** 04
- **Rama:** feature/fase-04-procesos-negocio
- **Resultado:** 38 archivos. `src/lib/fechas.ts`, `src/lib/esquemas/{ventas,compras}.ts`, `src/lib/permisos.ts`, `src/lib/formato.ts`, `src/server/servicios/{ventas,compras}.ts`, `src/server/servicios/inventario.ts` (precio, costo y filtro de proveedor), `src/server/http/rutas-crud.ts` (rutaAccion), 8 rutas en `src/app/api/{ventas,ordenes-compra}`, pantallas `src/app/(app)/ventas/caja/` y `src/app/(app)/compras/`, componentes compartidos `ventas/detalle-venta.tsx` y `components/comun/dialogo-motivo.tsx`, `catalogos/clientes/formulario-cliente.tsx` (devuelve el cliente creado), `tests/unit/procesos.test.ts`, `scripts/pruebas-api-fase04.ps1`; docs 08-ARQ, 10-PRU y 12-MAT. Commit `feat(procesos): agrega caja de ventas, anulacion y ciclo de ordenes de compra`.
- **Revision y ajustes:** probado contra PostgreSQL local: seis ventas simultáneas sobre dos unidades (dos confirmadas, stock final 0), venta con un ítem sin existencias revertida completa, anulación con restitución, tres aprobaciones simultáneas (solo una aplicada), transiciones inválidas con 409 y alcance por sucursal con 404; revisión visual de la caja y de compras con capturas automatizadas. Se corrigió la redacción de los mensajes de transición ("está en borrador"). En el equipo del desarrollador: 54 pruebas unitarias en verde y el script de PowerShell 11 de 11 OK. El script tuvo un defecto propio, no de la aplicación: la función que convierte el cuerpo a bytes UTF-8 devolvía el arreglo desarmado por PowerShell y el servidor respondía 400; se corrigió devolviéndolo con el operador coma.

### Prompt

```text
Contexto: proyecto CeibaERP (Next.js 16 App Router, TypeScript, Prisma 7.10.1 con @prisma/adapter-pg sobre PostgreSQL en Supabase, Zod 4 en español, shadcn/ui, Vitest). Ya existen: sesión con roles ADMIN/GERENTE/BODEGA/CAJERO y sucursal (src/server/auth/autorizacion.ts, sucursalPermitida), errores uniformes (src/server/errores.ts), auditoría (servicios/comun.ts: auditar), CRUD de catálogos, inventario con ajustes condicionales y kardex (servicios/inventario.ts), hook useListado, componentes comunes y el modelo prisma/schema.prisma (Venta, DetalleVenta, OrdenCompra, DetalleOrdenCompra, MovimientoInventario). Requisitos: docs/04-REQ RF-16 a RF-23, RN-01 a RN-10 y API §4.4 y §4.5.

Tarea: implementar la Fase 4A sin cambiar el esquema de la BD.
1. src/lib/fechas.ts: fechas del negocio en hora de Bogotá (hoy, sumar días, rango [desde, hasta+1) en UTC, columnas DATE como medianoche UTC, validación de fecha real).
2. Esquemas compartidos: src/lib/esquemas/ventas.ts (venta estricta con clienteId opcional, medioPago e items {productoId, cantidad}, sin precios, totales ni sucursal y sin productos repetidos; anulación con motivo de al menos 5 caracteres; filtros; calcularTotales en centavos enteros) y src/lib/esquemas/compras.ts (estados, orígenes, tabla de transiciones RN-07 con transicionValida, entregaATiempo RN-08, borrador sin costo, sucursal, estado ni origen, edición sin cambiar el proveedor, cancelación con motivo, cuerpo vacío para aprobar y recibir).
3. src/lib/permisos.ts: PERMISOS_VENTAS (leer ADMIN/GERENTE/CAJERO, registrar CAJERO, anular GERENTE) y PERMISOS_COMPRAS (leer ADMIN/GERENTE/BODEGA, crear BODEGA, editar BODEGA/GERENTE, aprobar y cancelar GERENTE, recibir BODEGA), con accionesVentas (verCostos solo ADMIN/GERENTE) y accionesCompras.
4. src/server/servicios/ventas.ts: listar con filtros y resumen (ventas registradas, total, ticket promedio, anuladas); obtener con alcance por sucursal (404) y costos solo para ADMIN/GERENTE; registrar en la sucursal de la sesión con precio y costo tomados de la BD, en UNA transacción (timeout 15 s): descuento condicional stock >= cantidad por producto en orden de productoId; si falta stock, revertir todo y responder 409 STOCK_INSUFICIENTE con detalle items.i.cantidad y lo disponible; crear la venta con su detalle, kardex VENTA (cantidad negativa y stock resultante) y auditoría VENTA_REGISTRADA. anular: actualización condicional REGISTRADA→ANULADA (409 si ya estaba anulada), restituir el stock, kardex ANULACION_VENTA con motivo y auditoría.
5. src/server/servicios/compras.ts: listar con filtros (estado, proveedor, sucursal, origen y búsqueda por número o proveedor), conteo por estado y vencidas; obtener con alcance; crearOrdenBorrador exportada (siempre BORRADOR, origen MANUAL o AGENTE_INVENTARIO, para el Agente 1); productos existentes, activos y del proveedor; costo tomado del producto; fecha esperada >= hoy; editar solo borradores (reemplaza los ítems); aprobar (rechaza productos inactivos), cancelar con motivo, recibir (suma el stock, kardex RECEPCION_COMPRA, fecha de recepción hoy, aTiempo). En cada transición: validar RN-07 con mensaje claro (409 TRANSICION_INVALIDA) y aplicar una actualización condicional sobre el estado leído (409 CONFLICTO si cambió). Auditoría OC_CREADA, OC_EDITADA, OC_APROBADA, OC_CANCELADA y OC_RECIBIDA.
6. Inventario: incluir precio, costo y proveedorId del producto, y el filtro proveedorId.
7. Rutas: /api/ventas (GET y POST 201), /api/ventas/[id] (GET), /api/ventas/[id]/anular, /api/ordenes-compra (GET y POST 201), /api/ordenes-compra/[id] (GET y PATCH), /[id]/aprobar, /[id]/cancelar y /[id]/recibir, con un ayudante rutaAccion en src/server/http/rutas-crud.ts (cuerpo opcional para aprobar y recibir).
8. Pantallas:
   - /ventas/caja (cajero): buscador de productos de su sucursal con precio y disponible; venta en curso con cantidades; cliente opcional con búsqueda y registro rápido (FormularioCliente debe devolver el cliente creado); medio de pago; total estimado con la misma función del servidor; errores por línea; diálogo con la venta registrada (componente DetalleVenta reutilizable).
   - /compras: tarjetas por estado que filtran; aviso de órdenes vencidas; filtros; tabla con insignias de estado y origen (IA); detalle en diálogo con acciones según el rol y la transición válida (aprobar y recibir con confirmación; cancelar con un DialogoMotivo reutilizable); formulario de borrador con los productos del proveedor y las existencias de la sucursal, botón para completar faltantes hasta el máximo y total estimado.
9. Pruebas unitarias en tests/unit/procesos.test.ts (PRU-U03 transiciones, PRU-U04 esquema de venta, totales, fechas y permisos); script scripts/pruebas-api-fase04.ps1 para Windows PowerShell 5.1 que pida la clave oculta, envíe los cuerpos en UTF-8 y verifique PRU-I01, I04, I05 y PRU-S03, S04, S05, S07 y S08 dejando el stock como estaba; actualización de docs 08-ARQ §5, 10-PRU §3 y 12-MAT.
Reglas: seguir el patrón de las pantallas existentes (Dialog con componente interno con key, useListado, sin setState síncrono dentro de efectos), textos en español, comentarios sin tildes en el código, no leer ni modificar archivos .env y no incluir secretos.
```

---

## 16. Copilot - 22/11/2026 - Fase 4B: pantalla de consulta de ventas con detalle y anulacion

- **Fase:** 04
- **Rama:** feature/fase-04-procesos-negocio
- **Resultado:** `src/app/(app)/ventas/page.tsx` (reemplaza el marcador), `modulo-ventas.tsx` y `dialogo-venta.tsx` (+331 líneas). Copilot ejecutó typecheck, lint y test sin errores (54 pruebas). Commit `feat(ventas): agrega consulta de ventas con detalle y anulacion`.
- **Revision y ajustes:** revisión de código de Claude desde GitHub sin defectos (campos de la API, conteo de columnas por rol, efectos con cancelación, reutilización de DetalleVenta y DialogoMotivo, botón Anular solo para el gerente en ventas registradas); prueba en base local y en el navegador: el gerente anula desde la pantalla con restitución en el kardex y el cajero solo ve su sucursal. En la revisión se encontró un punto doble en la fecha de anulación del componente compartido DetalleVenta (escrito por Claude en la Fase 4A); se corrigió en el commit `fix(ventas): evita el punto doble en la fecha de anulacion`.

### Prompt

```text
Eres el agente de desarrollo de CeibaERP (este repositorio). Implementa la pantalla de consulta de ventas (/ventas) según docs/04-REQ RF-17 y RF-18. Antes de escribir código lee: src/app/(app)/compras/ (page.tsx, modulo-compras.tsx, detalle-orden.tsx: es el módulo de referencia), src/app/(app)/ventas/tipos.ts, src/app/(app)/ventas/detalle-venta.tsx, src/app/(app)/ventas/insignia-venta.tsx, src/components/comun/dialogo-motivo.tsx, src/lib/esquemas/ventas.ts, src/lib/permisos.ts (accionesVentas, puedeLeer), src/lib/fechas.ts y src/lib/formato.ts.

REGLAS
- No leas, abras, crees ni modifiques archivos .env ni .env.local. No ejecutes comandos que impriman variables de entorno.
- La API ya existe y NO se modifica. Usa los nombres de campo exactamente como están en src/app/(app)/ventas/tipos.ts (FilaVenta, RespuestaVentas, Venta):
  - GET /api/ventas?q=&desde=&hasta=&sucursalId=&estado=&medioPago=&pagina=&tamano= devuelve { datos: FilaVenta[], total, pagina, tamano, resumen: { ventas, totalVendido, ticketPromedio, anuladas } }. desde y hasta son "AAAA-MM-DD" (días completos en hora de Bogotá); vacío = sin límite; los selects usan "todos". q busca por número de venta (acepta "#123") o por nombre o documento del cliente.
  - GET /api/ventas/{id} devuelve Venta (costoTotal, utilidad y costoUnitario solo llegan para ADMIN y GERENTE).
  - POST /api/ventas/{id}/anular con { motivo } (solo GERENTE) devuelve la Venta actualizada; 409 VENTA_YA_ANULADA si ya estaba anulada.
- Solo crea o reemplaza archivos en src/app/(app)/ventas/: page.tsx (reemplaza el marcador "en construcción"), modulo-ventas.tsx y dialogo-venta.tsx. No modifiques la carpeta caja/, tipos.ts, detalle-venta.tsx, insignia-venta.tsx ni nada fuera de src/app/(app)/ventas/.
- Interfaz en español con tildes. TypeScript estricto, sin any. Sin setState síncrono dentro de efectos (regla react-hooks/set-state-in-effect): sigue el patrón de detalle-orden.tsx, con un resultado guardado junto a la clave o al id consultado y cancelación del efecto.

ALCANCE
1. page.tsx: protegerPagina("/ventas"); título "Ventas" y descripción (con " · {sesion.sucursalNombre}" si el usuario tiene sucursal); pasa al módulo acciones = accionesVentas(sesion.rol) y verSucursales = sesion.sucursalId === null && puedeLeer("sucursales", sesion.rol).
2. modulo-ventas.tsx:
   - useListado<FilaVenta, RespuestaVentas>("/api/ventas", { desde: sumarDias(hoyBogota(), -6), hasta: hoyBogota(), sucursalId: "todos", estado: "todos", medioPago: "todos" }).
   - Cuatro tarjetas de resumen (no filtran): Ventas registradas, Total vendido (formatoCOP), Ticket promedio (formatoCOP) y Anuladas. Una nota bajo las tarjetas: "Las ventas anuladas no suman en los totales."
   - Filtros: Buscador ("Buscar por número o cliente"), inputs date Desde y Hasta (como en src/app/(app)/auditoria/modulo-auditoria.tsx), sucursal (solo si verSucursales, opciones de /api/sucursales?tamano=100 cargadas en un efecto con cancelación, como useOpciones de modulo-compras.tsx), estado (ESTADOS_VENTA con ETIQUETA_ESTADO_VENTA) y medio de pago (MEDIOS_PAGO con ETIQUETA_MEDIO_PAGO).
   - Tabla: N.º (#id), Fecha (formatoFechaHora), Sucursal (solo si verSucursales), Cajero, Cliente (nombre y documento en texto pequeño, o "Sin identificar"), Medio de pago, Ítems, Total (formatoCOP, a la derecha), Estado (InsigniaVenta) y un botón con icono Eye para ver el detalle. La fila completa también abre el detalle. Usa FilasEstado y Paginacion.
3. dialogo-venta.tsx: DialogoVenta({ ventaId, puedeAnular, onCerrar, onCambio }). Carga GET /api/ventas/{id} y muestra <DetalleVenta venta={...} /> dentro de un Dialog de sm:max-w-3xl, con Skeleton mientras carga y el mensaje de error si falla. Si puedeAnular y la venta está REGISTRADA, muestra en el pie el botón "Anular venta" (variant destructive, icono Ban) que abre DialogoMotivo con el título "Anular la venta #N", la descripción "Se restituirán las existencias en el kardex y la venta dejará de contar en los indicadores." y el placeholder "Ej. Error en el registro de la venta". Al confirmar: POST de anulación; si sale bien, toast de éxito, mostrar la venta devuelta y llamar onCambio(); si falla, devolver el mensaje del error a DialogoMotivo y recargar el detalle.

CRITERIO DE TERMINADO
- npm run typecheck, npm run lint y npm test sin errores.
- No ejecutes comandos de git ni instales dependencias. Al terminar entrégame un resumen con los archivos creados y el resultado de los tres comandos.
```

---

## 17. Claude - 22/11/2026 - Fase 5: dashboard con ocho KPI, graficos, interpretacion por reglas y reportes CSV

- **Fase:** 05
- **Rama:** feature/fase-05-dashboard-reportes
- **Resultado:** 33 archivos. `src/lib/kpi.ts` (definiciones, semáforos, variación e interpretación IR-01 a IR-06), `src/lib/esquemas/kpi.ts`, `src/server/servicios/{kpi,reportes}.ts`, `src/server/csv.ts`, `src/server/db.ts` (esquemaDb), 6 rutas en `src/app/api/{dashboard,reportes}`, pantallas `src/app/(app)/dashboard/` (tarjetas, cuatro gráficos con Recharts, alertas, uso de la IA) y `src/app/(app)/reportes/`, `src/components/comun/semaforo.tsx`, `src/lib/descargar.ts`, colores de gráficos en `globals.css`, `tests/unit/kpi.test.ts`, `scripts/verificar-kpi.sql`, `scripts/pruebas-api-fase05.ps1`, comprobación de zona horaria en `scripts/verificar-db.ts`; docs 06-KPI, 08-ARQ, 09-SEG, 10-PRU y 12-MAT. Commit `feat(dashboard): agrega ocho kpi, graficos, interpretacion por reglas, alertas y reportes csv`; versión v0.5.0.
- **Revision y ajustes:** los ocho KPI se compararon con una consulta SQL independiente (`scripts/verificar-kpi.sql`) escrita desde las fichas de 06-KPI: primero en la base local, sin filtros y con sucursal, categoría y otro periodo, y después en Supabase con el periodo por defecto (23/10/2026 – 21/11/2026). Coincidieron todas las cifras, también las del periodo anterior. En la verificación local apareció DEF-04: Prisma envía los Date sin zona horaria y una sesión de PostgreSQL fuera de UTC desplazaba 5 horas los límites del periodo; se corrigió enviando timestamptz explícitos y se agregó la comprobación en db:verificar, que en Supabase confirmó la sesión en UTC. La consulta de verificación se ajustó para calificar las tablas con "public.", porque el editor SQL de Supabase no siempre incluye ese esquema. Se cambió el periodo por defecto a 30 días completos hasta ayer, porque el día en curso sesgaba la variación. La paleta de los gráficos se validó para daltonismo; las leyendas llevan el texto en tinta, las etiquetas no se parten en dos líneas y cada gráfico tiene debajo su tabla de datos. Pruebas: 69 unitarias en verde y el script de PowerShell 15 de 15 OK.

### Prompt

````text
Para el repositorio tf-fsi-ceiba-erp (CeibaERP: Next.js 16, Prisma 7.10.1 con adaptador pg sobre PostgreSQL en Supabase, Zod 4, shadcn/ui, Recharts 3, Vitest), implementa la Fase 5 según docs/06-KPI y docs/04-REQ RF-24 a RF-30:
1. src/lib/kpi.ts (compartido y sin BD): definición de KPI-01 a KPI-08 (nombre, unidad, definición, fórmula, tipo de comparación relativa, en puntos o ninguna, si no aplica el filtro de categoría y herramienta de IA que consulta el dato), variación frente al periodo anterior, semáforos de 06-KPI §4, formatos y la interpretación automática con las reglas IR-01 a IR-06 (máximo cinco hallazgos), como funciones puras.
2. src/lib/esquemas/kpi.ts: periodo validado (desde <= hasta, máximo 366 días), periodo por defecto de los últimos 30 días completos hasta ayer en hora de Bogotá, y periodo anterior de igual duración.
3. src/server/servicios/kpi.ts, único servicio de indicadores para el dashboard, los reportes y las futuras herramientas de IA: SQL parametrizado con $queryRaw y tablas calificadas con el esquema de la conexión (exportar esquemaDb desde src/server/db.ts), instantes enviados como timestamptz explícitos en ISO con Z, días interpretados en hora de Bogotá; los ocho KPI con su valor del periodo anterior (KPI-04 y KPI-05 como foto actual), ventas por día alineadas con el periodo anterior (G-01), ventas, ticket y margen por sucursal (G-02), top de productos por unidades o valor (G-03), estado del inventario por sucursal (G-04), margen por categoría, productos de baja rotación con cobertura y valor inmovilizado, cumplimiento por proveedor (aprobadas vencidas cuentan como incumplidas), alertas de agotados y bajo mínimo indicando si hay una orden abierta, y las líneas de venta para el reporte. Lectura de filtros con alcance por sucursal (RN-05).
4. Rutas: GET /api/dashboard/kpis y /graficos (ADMIN, GERENTE), /api/dashboard/alertas (también BODEGA, solo su sucursal) y los CSV /api/reportes/ventas.csv, inventario-bajo-minimo.csv (también BODEGA) y cumplimiento-proveedores.csv, con permisos en src/lib/permisos.ts. CSV con ";", coma decimal, UTF-8 con BOM, fechas en hora de Bogotá, protección contra inyección de fórmulas, límite de 100.000 líneas y auditoría REPORTE_EXPORTADO.
5. Pantalla /dashboard: filtros en una fila (fechas, 7, 30 y 90 días, sucursal y categoría), tarjetas de KPI con semáforo con icono y texto, variación y fórmula, interpretación etiquetada como "Interpretación automática basada en reglas", los cuatro gráficos con un solo eje cada uno, leyenda con el texto en tinta, colores de estado reservados para el inventario y tabla de datos plegable, alertas de inventario y la sección que explica qué datos usan el chatbot y los agentes (06-KPI §5). Pantalla /reportes: filtros, tarjetas de descarga según el rol (la descarga muestra el mensaje de error de la API en lugar de bajar un archivo con el JSON) y vista previa del inventario crítico.
6. Pruebas unitarias PRU-U06 (semáforos en sus límites, variación, reglas, periodo y CSV), la consulta independiente scripts/verificar-kpi.sql escrita desde las fichas de 06-KPI para el editor SQL de Supabase (una sola sentencia que devuelve los ocho KPI del periodo y del anterior), el script scripts/pruebas-api-fase05.ps1 para Windows PowerShell 5.1 y la comprobación en scripts/verificar-db.ts de que la sesión de BD esté en UTC. Actualiza docs 06-KPI, 08-ARQ, 09-SEG, 10-PRU y 12-MAT.
Reglas: patrón de las pantallas existentes (sin setState síncrono dentro de efectos), textos en español, comentarios sin tildes en el código, no leer ni modificar archivos .env y no incluir secretos.
````

---

## 18. Claude - 22/11/2026 - Fase 6: chatbot con Gemini, herramientas de solo lectura por rol e historial

- **Fase:** 06
- **Rama:** feature/fase-06-chatbot
- **Resultado:** Chatbot en /chat para los 4 roles: 12 herramientas de solo lectura por rol (Zod a JSON Schema), sucursal impuesta por el servidor, ciclo de llamadas a funciones de hasta 5 rondas, historial de conversaciones propias, etiqueta "Respuesta generada por IA" con modelo y fecha y "Fuentes consultadas" con filtros. Modelo principal gemini-3.8-flash con respaldo opcional (GEMINI_MODEL_RESPALDO). 87 pruebas unitarias con modelo simulado; con Gemini real, PRU-C01 a PRU-C08 respondieron correctamente (C07 se repitió aparte por una sobrecarga momentánea del modelo; ver entrada 19). Versión v0.6.0.
- **Revision y ajustes:** Se revisó cada respuesta contra el dashboard y el módulo de compras (C01 coincide con G-03, C03 con G-02 Bello, C04 con las órdenes pendientes). Ajustes: tendencia con semanas completas, contador en ref por la regla de pureza de React, modelo de respaldo ante 503 de alta demanda y, tras el DEF-05, guardado del chat sin transacción interactiva y fallas de BD como 503 (ver entrada 19).

### Prompt

```text
Para el repositorio tf-fsi-ceiba-erp (CeibaERP: Next.js 16, Prisma 7.10.1, Zod 4, @google/genai 3, shadcn/ui, Vitest; servicio de indicadores en src/server/servicios/kpi.ts), implementa el chatbot de la Fase 6 según docs/07-IAG secciones 1 a 4 y docs/04-REQ RF-31 a RF-35:
1. src/server/ia/modelo.ts: interfaz ModeloIA (generar con instrucciones de sistema, contenidos, declaraciones de funciones, nivel de razonamiento y modo de herramientas auto o ninguna) e implementación con Gemini: modelo de GEMINI_MODEL, thinkingLevel LOW para el chat y MEDIUM para los agentes, sin temperature, llamadas automáticas desactivadas, tiempo límite de 30 s, un reintento ante 429, 5xx o tiempo agotado, y ErrorApi 503 comprensible si persiste o si falta GEMINI_API_KEY.
2. src/server/ia/herramientas.ts: registro de herramientas de solo lectura con nombre, descripción, argumentos Zod (convertidos a JSON Schema con z.toJSONSchema, sin $schema ni additionalProperties) y roles: buscarProducto, topProductos y productosEnRiesgo para todos; productosBajaRotacion, ordenesPendientes y cumplimientoProveedores también para bodega; consultarKpis, ventasPorSucursal, tendenciaVentas (semanas completas), margenPorCategoria, clientesRecurrentes (sin datos de contacto) y ultimasEjecucionesAgentes solo para gerente y administrador. Sucursal y categoría por nombre o código sin importar tildes, con error que lista las opciones; para bodega y cajero la sucursal de la sesión siempre se impone, con una nota cuando se ignoró otra; cada resultado incluye los filtros aplicados; respuestas limitadas en tamaño; la ejecución nunca lanza y devuelve los errores como datos. Agrega a kpi.ts productos en riesgo (agotados, bajo mínimo o con cobertura de 28 días menor al tiempo de entrega), tendencia semanal por categoría y clientes con más compras.
3. src/server/ia/orquestador.ts: ciclo de hasta 5 rondas que conserva el contenido del modelo con sus firmas, ejecuta en paralelo las llamadas pedidas, responde cada una con su id y su name, y en la última ronda exige texto sin herramientas; registra herramienta, argumentos, filtros, éxito y duración.
4. src/server/ia/instrucciones.ts: instrucciones de 07-IAG §4.2 más el contexto impuesto por el servidor (rol, alcance de sucursal, fecha de hoy y periodo por defecto), la respuesta exacta de falta de información, la regla de tratar los datos como datos y el formato sin tablas.
5. src/server/servicios/chat.ts y rutas POST /api/chat, GET /api/chat/conversaciones y GET /api/chat/conversaciones/{id} (todos los roles): mensaje de hasta 1000 caracteres con esquema estricto, conversación propia o 404, últimos 10 mensajes como contexto, límite de 10 preguntas por minuto por usuario, y pregunta y respuesta guardadas con las herramientas usadas y el modelo solo si hubo respuesta.
6. Pantalla /chat: lista de conversaciones propias, nueva conversación, preguntas sugeridas por rol, burbujas con la etiqueta "Respuesta generada por IA · Gemini (modelo) · fecha" y "Fuentes consultadas" con los filtros, texto con Markdown mínimo construido con elementos de React (sin HTML), envío con Enter y conservación de la pregunta si la IA no está disponible.
7. Pruebas unitarias con un modelo simulado (permisos por rol, ciclo de llamadas, herramienta no permitida, argumentos inválidos, límite de rondas, 503 sin clave, Markdown) y el script scripts/pruebas-chat-fase06.ps1 para Windows PowerShell 5.1 con PRU-C01 a PRU-C08 contra Gemini real. Actualiza docs 07-IAG, 08-ARQ, 09-SEG, 10-PRU (incluido el resultado de la verificación de KPI en Supabase) y 12-MAT.
Reglas: patrón de las pantallas existentes (sin setState síncrono dentro de efectos ni funciones impuras en el render), textos en español, comentarios sin tildes en el código, no leer ni modificar archivos .env y no incluir secretos.
```

---

## 19. Claude - 22/11/2026 - Fase 6: robustez del chatbot ante cuota de Gemini y conexion a BD

- **Fase:** 06
- **Rama:** feature/fase-06-chatbot
- **Resultado:** Se corrigió el DEF-05 (P2028 al guardar el chat tras una espera larga del modelo, respondido como 500). El guardado es una sola instrucción atómica; Prisma espera hasta 10 s para iniciar transacciones y el pool fija límites de conexión; P2028, P1001, P1002, P1008 y P1017 responden 503 BD_NO_DISPONIBLE. Con 429 o 504 se pasa directo al respaldo, que queda primero 60 s. El log indica qué límite de cuota se agotó. El script de pruebas acepta en C06 la indicación de la restricción, muestra el código de error, reintenta una vez ante IA_NO_DISPONIBLE y admite -Casos. La pregunta del cajero pasó de 500 en 46 s a 200 en 5,3 s. 87 pruebas unitarias; con Gemini real, PRU-C01 a PRU-C08 y H01/H02 respondieron correctamente.
- **Revision y ajustes:** Se verificó en local el guardado con conversación nueva y existente y se repitió la prueba manual del cajero de Centro. El 22/11/2026 se agotó la cuota diaria gratuita de los dos modelos: el sistema respondió 503 en menos de 2 s, sin errores 500. El 23/11/2026, con la cuota reiniciada, la corrida completa dio 12 de 13; C07 respondió 503 por sobrecarga momentánea de ambos modelos (no de cuota) y se repitió aparte con -Casos C07, con otro modelo de respaldo configurado en el .env, y respondió correctamente.

### Prompt

```text
Proyecto CeibaERP (Next.js 16, Prisma 7 con adaptador pg, Supabase en us-west-2, Gemini con @google/genai). En la prueba manual del chatbot, el cajero de Ceiba Centro pregunto por la sucursal Bello. El modelo principal gemini-3.8-flash respondio 429 (cuota agotada) y luego 504; el respaldo respondio, pero al guardar la conversacion Prisma fallo con P2028 "Unable to start a transaction in the given time" y la API devolvio 500 a los 46 s. Diagnostica la causa y corrige: (1) el guardado de la pregunta y la respuesta debe seguir siendo atomico sin depender de una transaccion interactiva tras la espera del modelo; (2) las fallas transitorias de conexion con la base de datos deben responder 503 con un mensaje comprensible y no 500; (3) ante cuota agotada o tiempo agotado se debe pasar al modelo de respaldo sin repetir el principal, y el respaldo debe ir primero un tiempo despues de usarse. Ajusta ademas el script pruebas-chat-fase06.ps1: PRU-C06 debe aceptar tanto la respuesta con datos de la sucursal propia como la indicacion de la restriccion, debe mostrar el codigo de error de la API, reintentar una vez ante 503 IA_NO_DISPONIBLE y permitir correr solo algunos casos. Agrega pruebas unitarias, registra el defecto en docs/10-PRU y actualiza docs/07-IAG. No leas ni modifiques .env ni .env.local, no imprimas valores de variables y no incluyas secretos.
```

---

## 20. Claude - 22/11/2026 - Fase 7: agentes de inventario y comercial, informe ejecutivo y validacion humana

- **Fase:** 07
- **Rama:** feature/fase-07-agentes
- **Resultado:** Agente 1 (analista de inventario): el código calcula los candidatos de reposición (stock objetivo para cubrir el tiempo de entrega más 7 días de seguridad, menos stock y tránsito); la IA solo excluye o sube prioridades y explica los criterios; el sistema crea órdenes en BORRADOR con origen IA usando crearOrdenBorrador. Agente 2 (analista comercial): hallazgos que citan KPI o gráficos del dashboard con el valor del sistema al lado, recomendaciones PENDIENTES y regla de coherencia (sin promociones ni liquidaciones de productos en riesgo). Informe ejecutivo que encadena ambos (ejecucionPadreId y ejecucionEntradaId). Validación humana: solo el gerente acepta o descarta, con comentario y auditoría. Pantalla /agentes con ejecutar, recomendaciones, historial y detalle con etiqueta de IA. Con Gemini real: Agente 1 #42 y #45, Agente 2 #47 (22 de 22) e informe ejecutivo completo tras una venta que agotó Jugo de naranja en Bello (Agente 1 #52 con la orden BORRADOR #893, Agente 2 #53; 23 de 23). 109 pruebas unitarias; versión v0.7.0.
- **Revision y ajustes:** Se verificó con un modelo simulado contra la base local (cantidades del código, candidatos inventados ignorados, prioridades que no bajan, coherencia, encadenamiento, 409 en la segunda decisión). Con Gemini real aparecieron y se corrigieron DEF-06 (el modelo rechazaba el esquema JSON por los límites de cantidad) y DEF-07 (listas más largas de lo permitido invalidaban la salida: ahora se recortan); además, varios modelos de respaldo con dos intentos cada uno y pausa del principal sin cuota diaria. Para las corridas con Gemini real se usaron claves de API de proyectos nuevos de Google AI Studio cuando se agotó la cuota diaria, escritas solo en el .env. El script se ajustó para no dar OK cuando el Agente 2 falla, para el caso sin candidatos (no se llama al modelo) y con la opción -Inventario. Observaciones: el Agente 1 excluyó en la #42 un producto con 1,6 días de cobertura (queda en borrador para el gerente) y el Agente 2 citó como KPI-05 un valor en pesos en lugar del número de productos; la columna de valor del sistema lo evidencia.

### Prompt

```text
Proyecto CeibaERP (Next.js 16, Prisma 7, Supabase, Gemini con @google/genai), Fase 7: implementa los dos agentes de docs/07-IAG secciones 5 a 7. Agente 1, analista de inventario: el codigo calcula los candidatos de reposicion (stock objetivo = min(maximo, max(minimo + 1, techo(venta diaria de 28 dias x (tiempo de entrega + 7)))), cantidad = objetivo - stock - en transito) y la prioridad base; el modelo, con herramientas de solo lectura, solo puede excluir candidatos o subir su prioridad y debe explicar los criterios; el sistema crea ordenes de compra en BORRADOR con origen AGENTE_INVENTARIO usando las cantidades del codigo y descarta candidatos inexistentes. Agente 2, analista comercial: analiza ventas, tendencias y margenes con los mismos KPI del dashboard, cita en cada hallazgo un KPI o grafico, propone acciones como recomendaciones PENDIENTES y lee la salida registrada del Agente 1 para no promocionar productos en riesgo (regla de coherencia en codigo). Informe ejecutivo que ejecuta el Agente 1 y luego el Agente 2 con la salida del primero y redacta un resumen (con plantilla si la IA falla). Registra cada ejecucion en ejecucion_agente (entrada, herramientas usadas, salida validada con Zod, modelo, duracion, estado). Solo el gerente acepta o descarta recomendaciones, con comentario obligatorio al descartar, una sola decision y auditoria. Si la IA falla, la ejecucion queda FALLIDA, se muestran los candidatos sin analisis de IA y no se crean ordenes. Crea la API de docs/04-REQ seccion 4.7, la pantalla /agentes con etiqueta de IA, pruebas unitarias y un script PowerShell para PRU-C09 y PRU-C10, y actualiza la documentacion. No leas ni modifiques .env ni .env.local, no imprimas valores de variables y no incluyas secretos.
```

---

## 21. Copilot - 23/11/2026 - Fase 7: historial de ejecuciones de los agentes

- **Fase:** 07
- **Rama:** feature/fase-07-agentes
- **Resultado:** Reemplazó el marcador de src/app/(app)/agentes/historial-ejecuciones.tsx por la tabla de ejecuciones con filtros por agente y estado, entrada, inicio, duración, estado con error, modelo, resultado, ejecutado por y apertura del detalle desde la fila o el botón. 1 archivo, 130 líneas; typecheck, lint y 108 pruebas correctas.
- **Revision y ajustes:** Se revisó el código en GitHub: conserva la firma exportada, usa useListado, FilasEstado y Paginacion, detiene la propagación del botón y no modifica otros archivos ni la API. Sin ajustes.

### Prompt

```text
Proyecto CeibaERP (Next.js 16 App Router, React 19, TypeScript, Tailwind 4, shadcn/ui). Reemplaza el marcador temporal de src/app/(app)/agentes/historial-ejecuciones.tsx por el historial de ejecuciones de los agentes de IA (docs/04-REQ RF-41). Conserva exactamente la firma exportada: export function HistorialEjecuciones({ onVer }: { onVer: (id: number) => void }).

Requisitos:
1. Usa el hook useListado<FilaEjecucion>("/api/agentes/ejecuciones", { agente: "todos", estado: "todos" }, 20) de @/hooks/use-listado, con el tipo FilaEjecucion de ./tipos. Toma como referencia de estilo src/app/(app)/compras/modulo-compras.tsx.
2. Filtros en una fila, con NativeSelect: agente (AGENTES y ETIQUETA_AGENTE de @/lib/esquemas/agentes, opción "Todos los agentes") y estado (ESTADOS_EJECUCION y ETIQUETA_ESTADO_EJECUCION, opción "Todos los estados"). No agregues búsqueda de texto.
3. Tabla dentro de Card con las columnas: N.º (#id y, si ejecucionPadreId no es null, debajo en texto pequeño "parte del informe #N"); Agente; Entrada (parametros.sucursal y, si existen parametros.desde y parametros.hasta, el periodo con formatoDia); Inicio (formatoFechaHora de fechaInicio); Duración (función duracion de ./insignias); Estado (InsigniaEjecucion de ./insignias y, si hay error, el error recortado en texto pequeño de color destructive); Modelo (texto mono pequeño o "—"); Resultado ("N órdenes · M recomendaciones" con formatoNumero, omitiendo los ceros); Ejecutado por (ejecutadoPor.nombre); y un botón de icono Eye con aria-label "Ver la ejecución N" que llama onVer(id). Toda la fila es clicable y llama onVer(id); el botón usa stopPropagation.
4. Usa FilasEstado (@/components/comun/filas-estado) para carga, error y vacío, y Paginacion (@/components/comun/paginacion).
5. Agrega un comentario de cabecera como el de los demás archivos del módulo, con la referencia a RF-41.
6. No modifiques otros archivos, no agregues dependencias y no cambies la API. No uses Date.now() ni new Date() durante el render (regla de pureza de React) y no dejes variables sin usar.
7. Verifica con npm run typecheck, npm run lint y npm test (deben pasar las 106 pruebas).
No leas ni modifiques los archivos .env ni .env.local, no ejecutes comandos que impriman variables de entorno y no incluyas secretos.
```

---

## 22. Claude - 23/11/2026 - Fase 8: pruebas de integracion sobre el esquema test y pruebas de seguridad

- **Fase:** 08
- **Rama:** feature/fase-08-pruebas
- **Resultado:** Pruebas de integración con Vitest contra el esquema test de Supabase (configuración propia que se niega a correr fuera de schema=test; cada archivo borra el esquema y crea un escenario controlado): ventas (transacción, kardex, auditoría, 6 ventas simultáneas sobre 2 unidades, anulación y KPI-01), órdenes de compra (ciclo completo, KPI-06 a tiempo, tardía y vencida, recibir un borrador, aprobaciones simultáneas), los 8 KPI frente a valores calculados a mano con y sin filtros, y agentes y chat con modelo simulado (sin gastar cuota de Gemini). Script PowerShell con PRU-S01 a PRU-S12. Resultados: 109 unitarias, 20 de 20 de integración en 138 s y 18 de 18 de seguridad; versión v0.8.0.
- **Revision y ajustes:** Se verificó primero contra un esquema test local y después contra Supabase sin cambios. Se comprobó que el bloqueo de esquema funciona con una URL sin schema=test. PRU-S09 usa un correo inexistente para no bloquear cuentas reales y PRU-S11 altera un carácter de la firma del JWT y confirma que la cookie original sigue válida. En la primera corrida falló una prueba por un dato de prueba inválido (medio de pago "TARJETA"; el valor válido es "TARJETA_DEBITO") y la configuración se renombró a .mts para evitar el aviso de ESM.

### Prompt

```text
Proyecto CeibaERP (Next.js 16, Prisma 7 con adaptador pg, Supabase, Vitest 5, Windows PowerShell 5.1), Fase 8: automatiza las pruebas de integracion PRU-I01 a PRU-I10 de docs/10-PRU contra el esquema "test" de Supabase usando DATABASE_URL_TEST y el mismo rol de minimo privilegio de la aplicacion. La configuracion debe negarse a ejecutar si la URL no apunta a schema=test. Cada archivo debe borrar el esquema de pruebas y crear un escenario pequeno con valores elegidos para calcular a mano los resultados esperados: ventas con stock, kardex, auditoria, concurrencia y anulacion; ciclo de ordenes de compra y KPI-06; los ocho KPI de docs/06-KPI frente a un calculo manual con y sin filtros; agentes y chatbot con un modelo de IA simulado que no llame a Gemini. Agrega un script PowerShell para PRU-S01 a PRU-S12 (sin sesion, roles, campos alterados, otra sucursal, stock, transicion invalida, limitador de inicios de sesion sin bloquear cuentas reales, inyeccion en la busqueda, JWT alterado y /api/health sin datos internos) que pida la clave oculta y deje los datos como estaban. Actualiza docs/10-PRU y docs/08-ARQ. No leas ni modifiques .env ni .env.local, no imprimas valores de variables y no incluyas secretos.
```

---

## 23. Claude - 23/11/2026 - Fase 9: despliegue en Railway y tarea diaria de salud

- **Fase:** 09
- **Rama:** feature/fase-09-despliegue
- **Resultado:** App desplegada en Railway (https://tf-fsi-ceiba-erp-production.up.railway.app) con Node 22/24, puerto 8080 y health check en /api/health. Workflow diario de GitHub Actions que llama a /api/health para que la base de Supabase no se pause. TLS 1.2 forzado en el script de seguridad. Docs 11-DEP, 10-PRU, 00-IDX y 12-MAT actualizados. Verificado: health con base de datos ok, los tres roles ven solo su menú, el chatbot responde y el script de seguridad da 18 de 18 contra la URL pública. Versión v0.9.0; después de la release el servicio pasó a desplegarse desde main y la primera ejecución manual de la tarea diaria respondió HTTP 200.
- **Revision y ajustes:** La configuración como código (railway.json) está obsoleta para servicios nuevos, así que la configuración se hizo en el panel. Se agregó turbopackIgnore a la ruta del certificado de la BD para que compile en el build de producción. El script fallaba en PowerShell 5.1 por TLS y se forzó TLS 1.2. Las variables de entorno las escribí yo directamente en el panel de Railway y la URL pública quedó como variable URL_APP del repositorio (no es un secreto).

### Prompt

```text
Proyecto CeibaERP (Next.js 16, Prisma 7 con adapter-pg, Supabase, Gemini). Fase 9: desplegar en Railway. Necesito:
1. Ajustes al repositorio para que el build de produccion funcione en Railway (engines de Node, puerto, health check en /api/health).
2. Un workflow de GitHub Actions que llame una vez al dia a /api/health de la app desplegada, usando una variable de repositorio URL_APP, para que la base de datos gratuita no se pause.
3. El documento docs/11-DEP-despliegue.md con los pasos de despliegue, las variables de entorno necesarias (solo nombres, sin valores) y como verificar el despliegue.
4. Que el script scripts/pruebas-seguridad-fase08.ps1 funcione contra la URL publica desde PowerShell 5.1.
Restricciones: no leas ni modifiques archivos .env ni .env.local; no me pidas ni escribas secretos (URI de base de datos, contrasenas, JWT_SECRET, API keys), yo los pongo directamente en el panel del proveedor; no ejecutes comandos que impriman valores de variables; la aplicacion usa un usuario de base de datos con minimo privilegio. Entrega los cambios como archivos con rutas relativas a la raiz del repositorio.
```

---

## 24. Claude - 23/11/2026 - Fase 10: especificacion para TestSprite y correccion del DEF-08

- **Fase:** 10
- **Rama:** feature/fase-10-testsprite y hotfix/0.9.1
- **Resultado:** Especificación de la app para TestSprite (docs/testsprite/prd-ceiba-erp.md) sin contraseñas, plan revisado de 15 casos en tres rondas por rol, corrección del margen de productos con coma decimal (formatoMargen) con 2 pruebas unitarias (111 en total), versión v0.9.1 como hotfix y registro de resultados en 10-PRU y 12-MAT.
- **Revision y ajustes:** La primera versión de la especificación decía que el gerente crea catálogos y órdenes; el agente de TestSprite detectó que no y se corrigió con src/lib/permisos.ts (catálogos solo del administrador, órdenes creadas por la bodega). Se cambió el login inválido a un correo inexistente para no activar el bloqueo de 5 intentos. Las ejecuciones se hicieron una por una o por tandas desde la lista de casos para controlar los créditos del plan gratuito.

### Prompt

```text
Proyecto CeibaERP (Next.js 16, Prisma 7, Supabase), desplegado en https://tf-fsi-ceiba-erp-production.up.railway.app. Fase 10: pruebas end-to-end con TestSprite desde su portal web. Necesito:
1. Un documento de especificacion (PRD) en espanol para cargar en TestSprite, con las rutas, los textos exactos de la interfaz, el menu y los permisos por rol (gerente, cajero y bodega de Ceiba Centro), los flujos de dashboard, catalogos, inventario, caja, ventas, ordenes de compra, reportes y chatbot, lo que queda fuera de alcance (agentes de IA, administracion, descargas) y reglas para los datos de prueba (prefijo "TS ").
2. Ayuda para revisar el plan que proponga TestSprite antes de ejecutarlo y para clasificar cada fallo como defecto funcional, problema de ambiente, dato de prueba invalido o falso positivo.
3. La correccion de los defectos reales que aparezcan, con prueba unitaria, y el registro de resultados en docs/10-PRU y docs/12-MAT.
Restricciones: el PRD no lleva contrasenas (las escribo yo en el portal de TestSprite); no leas ni modifiques archivos .env ni .env.local; no me pidas ni escribas secretos; verifica los permisos contra src/lib/permisos.ts. Entrega los cambios como archivos con rutas relativas a la raiz del repositorio.
```

---

## 25. TestSprite - 23/11/2026 - Fase 10: plan y ejecucion de pruebas end-to-end

- **Fase:** 10
- **Rama:** feature/fase-10-testsprite
- **Resultado:** El agente de TestSprite exploró la app desplegada, detectó dos diferencias entre la especificación y la app (permisos de catálogos y de órdenes) y un defecto de formato (margen con punto decimal, DEF-08), y generó un plan de 15 casos. Resultado: 15 de 15 tras corregir el DEF-08 (CAT-01 falló, se corrigió y se volvió a ejecutar solo ese caso).
- **Revision y ajustes:** Las reglas de exploración del primer mensaje (no ejecutar hasta revisar, no enviar formularios) quedaron guardadas en las notas y en project.md y bloquearon las primeras ejecuciones; se borraron a mano en Settings → General → Extra instructions y project.md se corrigió y publicó desde una sesión nueva con un modelo liviano (Claude Haiku), porque cada mensaje en la sesión larga con Claude Opus 5.5 costaba unos 18 créditos. Por el límite de un entorno del plan gratuito, los casos se corrieron en rondas cambiando la cuenta del entorno (bodega, gerente y cajero). Las contraseñas se escribieron solo en el portal. Consumo: unos 0,5 a 0,8 créditos por caso ejecutado.

### Prompt

```text
Quiero probar el frontend de CeibaERP, un ERP web en español ya desplegado:
https://tf-fsi-ceiba-erp-production.up.railway.app/login

Te adjunto la especificación (prd-ceiba-erp.md). Úsala como fuente principal: tiene las rutas, los textos exactos de la interfaz, el menú por rol y lo que queda fuera de alcance.

Cuentas de prueba (las contraseñas te las doy solo en las tarjetas de secretos, nunca en este chat):
- Cuenta principal: gerente@ceiba.test
- Para el caso de caja: cajero.centro@ceiba.test
- Para el caso de recepción de órdenes: bodega.centro@ceiba.test
No uses la cuenta de administrador.

Reglas:
1. Durante la exploración solo navega y lee: no envíes formularios, no registres ventas, no apruebes ni recibas órdenes y no uses el chatbot.
2. No ejecutes los Agentes de IA (/agentes), no entres a Usuarios ni Auditoría salvo para comprobar que el gerente recibe /sin-permiso, y no pruebes descargas de archivos.
3. Lo que creen las pruebas debe llevar el prefijo "TS " en el nombre; no modifiques ni desactives datos de demostración existentes.
4. Como máximo una pregunta al chatbot en todo el plan.
5. Propón un plan de 12 a 15 casos, priorizando: inicio de sesión válido e inválido, menú y bloqueo por rol, dashboard con filtros, crear y validar en Categorías o Proveedores, kardex de inventario, venta en caja, orden de compra (crear y aprobar como gerente, recibir como bodega), detalle de ventas, vista previa de reportes, una pregunta al chatbot y cierre de sesión.
6. No apliques el plan ni inicies ninguna ejecución hasta que yo lo revise y lo confirme.
```

### Mensajes de seguimiento al agente

Respuestas a las cuatro preguntas del agente sobre el primer borrador del plan:

```text
Catálogos: Ninguna de las tres: el error estaba en el PRD, no en la app. Crear, editar y desactivar en Productos, Categorías, Proveedores y Sucursales es exclusivo del administrador; para el gerente y la bodega son de solo lectura, y eso es lo esperado. Te adjunto el PRD corregido; reemplaza el que guardaste. Elimina CAT-02 y cambia CAT-01 por: "CAT-01 Catálogos de solo lectura para el gerente: en Categorías y en Proveedores no aparecen botones de crear, editar ni desactivar; la búsqueda filtra la tabla (Categorías: 'Lácteos'; Proveedores: 'Andina'); en Productos el margen usa coma decimal como el resto de la app (por ejemplo '21,6 %')". Ese último punto es tu hallazgo del punto decimal: lo confirmo como defecto real y debe fallar en esta corrida.

Crear OC: La bodega crea el borrador, el gerente aprueba y la bodega recibe. OC-01 (crear la orden "TS OC <timestamp>" en borrador) va con bodega.centro@ceiba.test. OC-02 (aprobar esa orden TS) va con el gerente. OC-03 cambia a: la bodega de Centro recibe una orden ya APROBADA de Ceiba Centro de los datos de demostración (no la TS); si no hay ninguna, el caso queda Blocked, no Failed.

Cuentas: Como solo hay un entorno, ejecutamos en tres rondas cambiando la cuenta guardada del entorno; las contraseñas te las doy en la tarjeta de secretos cada vez. Ronda 1, bodega.centro@ceiba.test: OC-01 y OC-03. Ronda 2, gerente@ceiba.test: AUTH-01, AUTH-02, AUTH-03, ROL-01, DASH-01, CAT-01, INV-01, VEN-01, OC-02, REP-01 y CHAT-01. Ronda 3, cajero.centro@ceiba.test: CAJA-01 y un caso nuevo CLI-01 "El cajero registra un cliente 'TS Cliente <timestamp>' con documento único y lo encuentra con la búsqueda; con el documento de un cliente existente muestra error de duplicado". Total: 15 casos.

Login malo: Usa el correo inexistente noexiste@ceiba.test con cualquier contraseña, en un solo intento. Nunca uses el correo de una cuenta de prueba para credenciales inválidas: 5 fallos con el mismo correo desde la misma IP en 15 minutos bloquean ese correo.
```

Aclaración de las dudas del plan, verificadas en el código:

```text
Respuestas a tus dudas, verificadas en el código:
- OC-01: el formulario tiene "Observaciones (opcional)"; la sucursal no se elige, se toma de la sesión de la bodega (Ceiba Centro). Puede pedir fecha esperada.
- OC-03: la recepción no pide cantidades; abre un diálogo de confirmación "¿Registrar la recepción de la orden #N?" con el botón "Registrar recepción" y recibe la orden completa. En el kardex la referencia aparece como "Orden de compra #N".
- CLI-01: obligatorios solo documento (solo números, 5 a 20 dígitos) y nombre (mínimo 3 caracteres); correo y teléfono son opcionales.
- CAJA-01: si BEB-001 no tiene al menos 2 unidades en Ceiba Centro, el caso queda Blocked, no Failed.
El plan de 15 casos en 3 rondas queda aprobado así. Antes de ejecutar, confírmame el orden: primero la Ronda 1 con bodega.centro@ceiba.test (te doy la contraseña en la tarjeta de secretos), después la Ronda 2 con el gerente y por último la Ronda 3 con el cajero. Ejecuta solo una ronda a la vez y espera mi OK entre rondas.
```

Corrección de las notas (sesión con Claude Opus 5.5) y de project.md (sesión nueva con Claude Haiku), después de que las primeras ejecuciones quedaran bloqueadas:

```text
Corrige las notas del proyecto: elimina la regla de no iniciar ejecuciones hasta mi confirmación y la de esperar mi OK entre rondas, y aclara que la restricción de solo navegar y leer aplicaba únicamente a la exploración; al ejecutar los casos se siguen sus pasos completos, incluido enviar formularios. No ejecutes nada; solo guarda las notas.
```

```text
En project.md elimina la regla 6 (no aplicar el plan ni iniciar ejecuciones hasta mi confirmación) y cambia la regla 1 para que diga que solo navegar y leer aplicaba a la exploración inicial; al ejecutar los casos se siguen sus pasos completos, incluido enviar formularios. No ejecutes nada ni explores; solo guarda project.md.
```

```text
Envía a TestSprite con ts_commit el project.md que ya corregiste y también las notas del proyecto. Revisa además si alguna otra instrucción guardada (entorno default, instrucciones adicionales de ejecución, notas o casos de prueba) todavía dice que no se ejecute sin revisión o confirmación, o que no se envíen formularios, y elimínala. No ejecutes ni explores nada. Dime exactamente qué archivos o campos cambiaste.
```

---

## 26. Claude - 23/11/2026 - Fases 11 y 12: cierre del repositorio e informe tecnico

- **Fase:** 11 y 12
- **Rama:** feature/fase-11-cierre
- **Resultado:** Historial de prompts revisado y completado como `docs/13-PRM` (prompts sin cambios, formato normalizado, mensajes de seguimiento a TestSprite). Búsqueda de secretos en todo el historial de Git (solo conteos y marcadores; ningún secreto) y verificación del correo noreply en los commits. README final, `docs/capturas/` con 45 capturas comprimidas, cada una con título y descripción (OBL-1 a OBL-8 y adicionales) y el diagrama entidad-relación generado desde `prisma/schema.prisma`; `12-MAT` y `00-IDX` al día. Informe técnico en Word y PDF con formato APA: 18 puntos de la guía en 15 páginas de contenido, 9 figuras, 7 tablas, referencias y anexos con 37 capturas adicionales y las cuentas de demostración.
- **Revision y ajustes:** Se revisaron las 94 capturas una por una antes de publicarlas: ninguna muestra contraseñas, tokens ni claves; se difuminó la dirección del proyecto de Supabase en la verificación SQL y se dejaron fuera las de configuración de infraestructura. La captura de gráficos de la Fase 5 tenía colores de una versión anterior y se reemplazó por una nueva de la app desplegada, tomada después de volver a sembrar la demo; el análisis de KPI del informe usa las cifras de esa captura. La contraseña de demostración no está en el repositorio ni en este historial: se escribe a mano en el Anexo B del informe, que se entrega aparte.

### Prompt

```text
Proyecto CeibaERP (Next.js 16, Prisma 7, Supabase, Gemini), repositorio Agiras2/tf-fsi-ceiba-erp con Gitflow, desplegado en Railway. Fases 11 y 12: cierre del repositorio e informe final del trabajo de Fundamentos de Sistemas de Información (UdeA, 2026-2). Necesito:
1. Revisar mi historial de prompts (lo adjunto), completar lo que falte sin cambiar el texto de los prompts y dejarlo como docs/13-PRM-historial-de-prompts.md con resumen por herramienta y por fase.
2. Buscar secretos en todo el historial de Git sin imprimir ningún valor (solo conteos y si cada coincidencia es un marcador) y verificar que los commits usen mi correo noreply de GitHub.
3. Un README final con descripción, módulos, tecnologías, instalación, variables de entorno (solo nombres), base de datos, ejecución, usuarios de demostración sin contraseña, recorrido de prueba, pruebas y estructura.
4. Revisar mis capturas (las adjunto), descartar las que muestren secretos o datos de infraestructura, comprimir las demás y publicarlas en docs/capturas con título y descripción de lo que demuestra cada una, empezando por las ocho obligatorias de la guía.
5. Actualizar docs/12-MAT y docs/00-IDX.
6. El informe técnico en Word y PDF con el formato APA de mis informes de laboratorio (adjunto uno de ejemplo y la guía): los 18 puntos de la guía en 8 a 15 páginas, con las capturas obligatorias en el cuerpo, un diagrama entidad-relación, tablas de requisitos, tecnologías, KPI, pruebas y riesgos, referencias y anexos con las capturas adicionales y las cuentas de demostración. Integrantes: Andrés Giraldo Arismendy y Santiago Rendón Rivera.
Restricciones: no leas ni modifiques archivos .env ni .env.local; no me pidas ni escribas secretos; no imprimas valores de variables; la contraseña de demostración no va en el repositorio, en el historial ni en el informe que generes (deja un espacio marcado para escribirla yo). Entrega los cambios del repositorio como archivos con rutas relativas a la raíz.
```

