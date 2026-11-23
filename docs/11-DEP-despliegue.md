# 11-DEP — Despliegue y mantenimiento

**URL pública:** https://tf-fsi-ceiba-erp-production.up.railway.app

Cómo se publica CeibaERP, qué variables necesita, cómo se verifica después de cada despliegue y cómo se mantiene activo. Complementa `08-ARQ` (arquitectura y conexión con la base de datos) y `09-SEG` (manejo de secretos).

---

## 1. Arquitectura de despliegue

| Componente | Servicio | Región | Notas |
|---|---|---|---|
| Aplicación (Next.js, servidor Node persistente) | Railway | US West (Oregon) | Se construye desde la rama `main` de GitHub |
| Base de datos (PostgreSQL) | Supabase, plan gratuito | `aws-0-us-west-2` (Oregon) | La app usa el *session pooler* (puerto 5432) con el rol `ceiba_app` |
| Modelo de IA | Gemini (Google AI Studio) | — | Clave por proyecto; modelos de respaldo configurables |
| Tarea de mantenimiento | GitHub Actions | — | Consulta diaria de `/api/health` (sección 6) |

La aplicación y la base de datos están en la misma región para que cada consulta tarde lo menos posible.

## 2. Preparación del repositorio

- **Construcción:** Railway detecta Next.js y ejecuta `npm ci` (que corre `prisma generate` sin conectarse a la base de datos), `npm run build` y `npm run start`. `next start` escucha en el puerto que indica la variable `PORT` de Railway.
- **Versión de Node:** `package.json` fija `"engines": { "node": "22.x || 24.x" }`.
- **Certificado de la base de datos:** `certs/supabase-ca.crt` (certificado raíz público de Supabase) va en el repositorio; así la conexión desde Railway verifica el certificado del servidor (`08-ARQ` §4).
- **Configuración en el panel:** Railway dejó de recomendar `railway.json` para servicios nuevos, así que la ruta de salud, la región y la política de reinicio se configuran en el panel del servicio (sección 3).
- **Migraciones:** no se ejecutan en Railway. Se aplican desde el equipo del desarrollador con `DIRECT_URL` (rol `prisma`), que nunca se carga en Railway; así la aplicación desplegada no puede alterar el esquema.

## 3. Pasos en Railway

1. **New Project → Deploy from GitHub repo →** `Agiras2/tf-fsi-ceiba-erp`, rama `main`.
2. **Variables** (sección 4): se escriben directamente en el panel del servicio.
3. **Settings → Deploy:** región *US West (Oregon)*; *Healthcheck Path* `/api/health`; *Restart Policy* `On Failure`.
4. **Settings → Networking → Generate Domain** (puerto 8080, el que Railway entrega en `PORT`): genera la URL pública `https://tf-fsi-ceiba-erp-production.up.railway.app`.
5. Railway despliega automáticamente cada *push* a `main` (es decir, cada *release*).

**Volver a una versión anterior:** en *Deployments*, elegir un despliegue anterior y usar *Redeploy*.

## 4. Variables de entorno en Railway

| Variable | Valor | Notas |
|---|---|---|
| `DATABASE_URL` | Cadena del *session pooler* con el rol `ceiba_app` | La misma del `.env` local de la demo (`schema=public` por defecto) |
| `JWT_SECRET` | Cadena aleatoria de 32 o más caracteres | Distinta de la local; cambiarla cierra todas las sesiones |
| `GEMINI_API_KEY` | Clave de Google AI Studio | Nunca se escribe en el repositorio ni en el chat |
| `GEMINI_MODEL` | `gemini-3.8-flash` | Modelo principal (`07-IAG` §2) |
| `GEMINI_MODEL_RESPALDO` | Lista separada por comas, en orden de preferencia | Ver `07-IAG` §8 |
| `APP_TIMEZONE` | `America/Bogota` | |

**No se cargan en Railway:** `DIRECT_URL`, `DATABASE_URL_TEST`, `DIRECT_URL_TEST` ni `SEED_DEMO_PASSWORD`. Los valores de las variables no se imprimen con ningún comando (`09-SEG` §4).

## 5. Verificación después de desplegar

1. `https://tf-fsi-ceiba-erp-production.up.railway.app/api/health` responde `{"estado":"ok","baseDeDatos":"ok",...}`.
2. Inicio de sesión con los usuarios de demostración de cada rol y recorrido de los módulos.
3. `scripts/pruebas-seguridad-fase08.ps1 -Base https://tf-fsi-ceiba-erp-production.up.railway.app`: PRU-S01 a PRU-S12 contra la app desplegada.
4. Una pregunta al chatbot y la revisión de la etiqueta de IA.
5. Los encabezados de seguridad (`09-SEG` §7) en la respuesta de cualquier página.

**Resultado del primer despliegue (23/11/2026).** Servicio en línea en Railway desde la rama de la fase; `/api/health` con base de datos `ok`; inicio de sesión como gerente, cajero y bodega, cada uno con solo su menú; el chatbot respondió con el modelo de respaldo, y el script de seguridad dio 18 de 18 contra la URL pública (incluida la cookie de sesión segura sobre HTTPS). Después de la *release* v0.9.0 el servicio pasó a desplegarse desde `main`.

## 6. Mantenimiento

- **Pausa de Supabase:** el plan gratuito pausa un proyecto tras varios días sin actividad. El flujo `.github/workflows/mantener-activo.yml` consulta `/api/health` todos los días a las 08:17 (hora de Colombia), con tres intentos. Esa ruta ejecuta `SELECT 1` en la base de datos, de modo que la mantiene activa y, si algo falla, el flujo queda en rojo en la pestaña *Actions* del repositorio. La URL se guarda como variable del repositorio `URL_APP` (no es un secreto). También puede ejecutarse a mano con *Run workflow*.
- **Datos de demostración:** `npm run db:seed` (desde el equipo del desarrollador) recarga la demo con 90 días de historia que terminan el día en que se ejecuta. Se vuelve a ejecutar poco antes de la entrega para que el periodo por defecto del dashboard (últimos 30 días) tenga datos completos. Borra todo lo que haya en el esquema `public`.
- **Periodo de prueba de Railway:** si vence, la URL pública deja de responder; el README explica cómo ejecutar la aplicación localmente contra la misma base de datos.
- **Cuota de Gemini:** si se agota, el chatbot y los agentes responden 503 con un mensaje claro y el resto del sistema sigue funcionando (`07-IAG` §8).

## 7. Riesgos

| Riesgo | Impacto | Mitigación |
|---|---|---|
| Vence el periodo de prueba de Railway | La URL pública deja de funcionar | Ejecución local documentada en el README |
| Supabase pausa el proyecto | La app responde 503 en `/api/health` | Tarea diaria de GitHub Actions |
| Cuota diaria de Gemini agotada | Chatbot y agentes no disponibles | Modelos de respaldo; 503 controlado; el resto del ERP sigue operando |
| Fuga de un secreto | Acceso indebido | Secretos solo en `.env` local y en el panel de Railway; búsqueda de secretos en el historial antes de publicar (Fase 11) |
