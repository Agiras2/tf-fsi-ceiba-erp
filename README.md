# CeibaERP

ERP inteligente para **Supermercados Ceiba S.A.S.**, una cadena de supermercados **ficticia** con cuatro sucursales en el Valle de Aburrá. Integra ventas, inventario por sucursal, compras a proveedores y catálogos en una sola base de datos, y sobre esos datos agrega un dashboard con ocho KPI, un chatbot y dos agentes de inteligencia artificial que proponen acciones con validación humana.

Trabajo final de semestre · Fundamentos de Sistemas de Información · Facultad de Ingeniería · Universidad de Antioquia · 2026-2.
Integrantes: Santiago Rendón Rivera y Andrés Giraldo Arismendy.

- **Aplicación desplegada:** https://tf-fsi-ceiba-erp-production.up.railway.app
- **Capturas con título y descripción:** [`docs/capturas/`](docs/capturas/README.md)
- **Documentación completa:** [`docs/00-IDX-indice.md`](docs/00-IDX-indice.md)

---

## Qué hace

| Módulo | Funcionalidad |
|---|---|
| Autenticación y usuarios | Inicio de sesión con JWT en cookie httpOnly, cuatro roles (administrador, gerente, bodega y cajero), menú y permisos por rol verificados en el servidor, límite de intentos |
| Catálogos | Productos, categorías, proveedores (con tiempo de entrega), sucursales y clientes, con validación y desactivación lógica |
| Inventario | Existencias por producto y sucursal con estado (agotado, bajo mínimo, normal, sobrestock), ajustes con motivo y kardex |
| Ventas | Caja con varios productos; precios, totales y descuento de stock calculados en el servidor en una sola transacción; anulación con restitución |
| Compras | Órdenes BORRADOR → APROBADA → RECIBIDA / CANCELADA, con cumplimiento del proveedor |
| Dashboard y reportes | Ocho KPI con semáforo, cuatro gráficos, filtros de periodo, sucursal y categoría, interpretación por reglas y reportes CSV |
| Chatbot | Preguntas en lenguaje natural respondidas con datos reales mediante 12 herramientas de solo lectura (Google Gemini con *function calling*) |
| Agentes de IA | Agente 1, analista de inventario: prioriza la reposición y el sistema crea órdenes en borrador. Agente 2, analista comercial: usa la salida del Agente 1 y propone recomendaciones que el gerente acepta o descarta |
| Auditoría | Registro de inicios de sesión, cambios, ajustes, ventas, órdenes y decisiones |

El flujo principal es el **ciclo de abastecimiento inteligente**: venta → descuento de stock → alerta en el dashboard → Agente 1 → orden en borrador → aprobación del gerente → recepción en bodega → dashboard actualizado ([`docs/03-NEG`](docs/03-NEG-negocio-y-flujo.md) §6).

## Tecnologías

Next.js 16 (App Router) · React 19 · TypeScript · Tailwind CSS 4 + shadcn/ui · Recharts · Zod · PostgreSQL en Supabase · Prisma ORM 7 · Google Gemini (`@google/genai`) · Vitest · PowerShell 5.1 · TestSprite · Railway · GitHub Actions.

Detalle y justificación: [`docs/08-ARQ-arquitectura-y-tecnologias.md`](docs/08-ARQ-arquitectura-y-tecnologias.md).

## Requisitos previos

- Node.js 22 o 24 y npm.
- Un proyecto de PostgreSQL (se usó Supabase) con dos roles: `prisma` para las migraciones y `ceiba_app` con privilegios solo de datos ([`docs/09-SEG`](docs/09-SEG-seguridad.md) §5 y [`docs/11-DEP`](docs/11-DEP-despliegue.md)).
- Una clave de la API de Google Gemini (Google AI Studio). Sin ella el ERP funciona, pero el chatbot y los agentes responden que la IA no está disponible.

## Instalación local

```bash
git clone https://github.com/Agiras2/tf-fsi-ceiba-erp.git
cd tf-fsi-ceiba-erp
npm install          # también genera el cliente de Prisma
```

Copie `.env.example` como `.env` y complete los valores. **El archivo `.env` nunca se sube al repositorio.**

| Variable | Uso |
|---|---|
| `DATABASE_URL` | Conexión de la aplicación y del *seed* (rol `ceiba_app`) |
| `DIRECT_URL` | Migraciones con Prisma CLI (rol `prisma`), solo en el equipo del desarrollador |
| `DATABASE_URL_TEST`, `DIRECT_URL_TEST` | Esquema `test` para las pruebas de integración |
| `JWT_SECRET` | Firma de las sesiones (32 caracteres o más) |
| `GEMINI_API_KEY`, `GEMINI_MODEL` | Inteligencia artificial |
| `GEMINI_MODEL_RESPALDO` | Opcional: modelos de respaldo separados por comas |
| `SEED_DEMO_PASSWORD` | Contraseña de los usuarios de demostración (10 o más caracteres con letras y números) |
| `APP_TIMEZONE` | `America/Bogota` |

## Base de datos

```bash
npm run db:migrar      # aplica las migraciones (prisma migrate deploy, con DIRECT_URL)
npm run db:seed        # carga 90 días de datos ficticios (BORRA los datos existentes)
npm run db:verificar   # comprueba conexión, tablas, restricciones, zona UTC y mínimo privilegio
```

El esquema está en `prisma/schema.prisma`, la migración inicial y las restricciones CHECK en `prisma/migrations/` y `prisma/sql/`, y los datos de demostración en `prisma/seed.ts` y `prisma/seed-datos.ts`.

**Sobre las fechas de la demostración.** El *seed* genera 90 días de operación que terminan el día en que se ejecuta, y el dashboard muestra por defecto los últimos 30 días completos hasta ayer. Si se consulta varios días después de la última carga, los días más recientes aparecen sin ventas; basta volver a ejecutar `npm run db:seed` o elegir otro periodo en los filtros.

## Ejecución

```bash
npm run dev            # http://localhost:3000
```

Para producción: `npm run build` y `npm start`. El despliegue en Railway, la tarea diaria de GitHub Actions y la verificación están en [`docs/11-DEP-despliegue.md`](docs/11-DEP-despliegue.md).

## Usuarios de demostración

Todos usan la contraseña definida en `SEED_DEMO_PASSWORD`. La contraseña de la aplicación desplegada **se entrega en el informe técnico** y no se publica en el repositorio.

| Rol | Correo | Qué puede hacer |
|---|---|---|
| Administrador | `admin@ceiba.test` | Catálogos, usuarios, auditoría, dashboard y consulta de todo |
| Gerente | `gerente@ceiba.test` | Dashboard, reportes, ventas (anular), aprobar órdenes, agentes y recomendaciones |
| Bodega | `bodega.centro@ceiba.test`, `bodega.laureles@ceiba.test`, `bodega.envigado@ceiba.test`, `bodega.bello@ceiba.test` | Inventario y ajustes, crear y recibir órdenes de su sucursal |
| Cajero | `cajero.centro@ceiba.test`, `cajero.laureles@ceiba.test`, `cajero.envigado@ceiba.test`, `cajero.bello@ceiba.test` | Caja y ventas de su sucursal, clientes |

Todos tienen acceso al chatbot, limitado a los datos que su rol puede ver.

### Recorrido sugerido para probar

1. Como **cajero de Bello**, registre en Caja una venta que agote un producto.
2. Como **gerente**, vea la alerta en el Dashboard y, en Agentes de IA, ejecute el **Informe ejecutivo** de Ceiba Bello: el Agente 1 crea una orden en borrador y el Agente 2 propone recomendaciones.
3. Como **gerente**, apruebe la orden en Órdenes de compra y acepte o descarte una recomendación.
4. Como **bodega de Bello**, reciba la orden y revise el kardex.
5. Pregunte al **Asistente** «¿Qué productos están en riesgo de agotamiento?» y contraste la respuesta con el dashboard.

## Pruebas

```bash
npm test                   # 111 pruebas unitarias (Vitest)
npm run test:integracion   # 20 pruebas de integración contra el esquema test (requiere DATABASE_URL_TEST)
npm run typecheck          # verificación de tipos
npm run lint               # ESLint
```

Scripts de PowerShell 5.1 (piden la contraseña de demostración de forma oculta):

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\pruebas-seguridad-fase08.ps1                    # PRU-S01 a PRU-S12 (local)
powershell -ExecutionPolicy Bypass -File .\scripts\pruebas-seguridad-fase08.ps1 -Base https://tf-fsi-ceiba-erp-production.up.railway.app
powershell -ExecutionPolicy Bypass -File .\scripts\pruebas-chat-fase06.ps1                         # chatbot con Gemini real
powershell -ExecutionPolicy Bypass -File .\scripts\pruebas-agentes-fase07.ps1                      # agentes con Gemini real
```

Los KPI se verifican con `scripts/verificar-kpi.sql` en el editor SQL de Supabase. Las pruebas end-to-end se hicieron con TestSprite sobre la aplicación desplegada (15 de 15). Resultados y defectos: [`docs/10-PRU-plan-de-pruebas.md`](docs/10-PRU-plan-de-pruebas.md).

## Estructura

```text
.github/workflows/  Tarea diaria que consulta /api/health
docs/               Documentación (índice en docs/00-IDX-indice.md), capturas y material de TestSprite
prisma/             Esquema, migraciones, restricciones SQL y datos de demostración
scripts/            Verificación de la BD y de los KPI, y pruebas en PowerShell
src/app/            Páginas por módulo y API (Route Handlers)
src/server/         Conexión, autenticación, servicios de negocio, KPI e IA (modelo, herramientas, agentes)
src/lib/            Esquemas Zod, permisos, navegación, fórmulas de KPI y formatos compartidos
src/components/     Componentes de interfaz (shadcn/ui) y comunes
tests/              Pruebas unitarias y de integración
```

## Uso de herramientas de IA

El desarrollo se hizo con Claude (diseño, documentación y la mayor parte del código), GitHub Copilot en modo agente (varias pantallas a partir de un módulo de referencia) y TestSprite (pruebas end-to-end). Cada prompt, su resultado y la revisión hecha están en [`docs/13-PRM-historial-de-prompts.md`](docs/13-PRM-historial-de-prompts.md).

## Aviso

Todos los datos (organización, personas, documentos, proveedores y transacciones) son ficticios y se generan con el script de demostración. El repositorio no contiene claves de API ni contraseñas. Proyecto académico sin fines comerciales.
