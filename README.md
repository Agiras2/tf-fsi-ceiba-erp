# CeibaERP

ERP inteligente para **Supermercados Ceiba S.A.S.**, una cadena de supermercados **ficticia** con cuatro sucursales en el Valle de Aburrá. Integra ventas, inventario por sucursal, compras a proveedores y catálogos en una sola base de datos, y agrega un dashboard de indicadores, un chatbot y dos agentes de inteligencia artificial que proponen acciones con validación humana.

Trabajo final de semestre · Fundamentos de Sistemas de Información · Facultad de Ingeniería · Universidad de Antioquia · 2026-2.

> **Estado:** en desarrollo. Ver el avance por fases en [`docs/01-PLN-plan-de-accion.md`](docs/01-PLN-plan-de-accion.md).

---

## Tecnologías

Next.js 16 (App Router) · React 19 · TypeScript · Tailwind CSS 4 + shadcn/ui · Recharts · Zod · PostgreSQL (Supabase) · Prisma ORM 7 · Google Gemini · Vitest · Railway.

Detalle y justificación: [`docs/08-ARQ-arquitectura-y-tecnologias.md`](docs/08-ARQ-arquitectura-y-tecnologias.md).

## Requisitos previos

- Node.js 24 y npm.
- Un proyecto de PostgreSQL (se usó Supabase) con dos roles: `prisma` para las migraciones y `ceiba_app` con privilegios solo de datos. Ver `docs/09-SEG-seguridad.md`, sección 5.
- Una clave de la API de Google Gemini (Google AI Studio).

## Instalación local

```bash
git clone https://github.com/Agiras2/tf-fsi-ceiba-erp.git
cd tf-fsi-ceiba-erp
npm install          # también genera el cliente de Prisma
```

Copie `.env.example` como `.env` y complete los valores. **El archivo `.env` nunca se sube al repositorio.**

| Variable | Uso |
|---|---|
| `DATABASE_URL` | Conexión de la aplicación (rol `ceiba_app`) |
| `DIRECT_URL` | Migraciones con Prisma CLI (rol `prisma`), solo local |
| `DATABASE_URL_TEST`, `DIRECT_URL_TEST` | Esquema `test` para pruebas de integración |
| `JWT_SECRET` | Firma de las sesiones (32 caracteres o más) |
| `GEMINI_API_KEY`, `GEMINI_MODEL` | Inteligencia artificial |
| `SEED_DEMO_PASSWORD` | Contraseña de los usuarios de demostración |
| `APP_TIMEZONE` | `America/Bogota` |

## Base de datos

```bash
npm run db:migrar      # aplica las migraciones (prisma migrate deploy)
npm run db:seed        # carga 90 días de datos ficticios (BORRA los datos existentes)
npm run db:verificar   # comprueba conexión, tablas, restricciones y mínimo privilegio
```

## Ejecución

```bash
npm run dev            # http://localhost:3000
```

Para producción: `npm run build` y `npm start`.

## Usuarios de demostración

Todos usan la contraseña definida en `SEED_DEMO_PASSWORD`, que se entrega en el informe técnico y no se publica en el repositorio.

| Rol | Correo |
|---|---|
| Administrador | `admin@ceiba.test` |
| Gerente | `gerente@ceiba.test` |
| Bodega | `bodega.centro@ceiba.test`, `bodega.laureles@ceiba.test`, `bodega.envigado@ceiba.test`, `bodega.bello@ceiba.test` |
| Cajero | `cajero.centro@ceiba.test`, `cajero.laureles@ceiba.test`, `cajero.envigado@ceiba.test`, `cajero.bello@ceiba.test` |

## Pruebas y calidad

```bash
npm test               # pruebas unitarias (Vitest)
npm run lint           # ESLint
npm run typecheck      # verificación de tipos de TypeScript
```

Plan de pruebas: [`docs/10-PRU-plan-de-pruebas.md`](docs/10-PRU-plan-de-pruebas.md).

## Estructura

```text
docs/        Documentación del proyecto (índice en docs/00-IDX-indice.md)
prisma/      Esquema, migraciones, restricciones SQL y datos de demostración
scripts/     Utilidades (verificación de la base de datos)
src/app/     Páginas y API (Route Handlers)
src/server/  Lógica del servidor: conexión, autenticación, validación, servicios e IA
src/lib/     Utilidades compartidas (navegación por rol, formato)
tests/       Pruebas automatizadas
```

## Documentación

El índice completo está en [`docs/00-IDX-indice.md`](docs/00-IDX-indice.md): negocio y flujos, requisitos, modelo de datos, KPI, chatbot y agentes, arquitectura, seguridad, pruebas, despliegue y matriz de cumplimiento.

## Aviso

Todos los datos (organización, personas, documentos, proveedores y transacciones) son ficticios y se generan con el script de demostración. Proyecto académico sin fines comerciales.
