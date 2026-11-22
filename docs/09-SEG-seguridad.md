# 09-SEG — Seguridad

---

## 1. Autenticación

| Control | Implementación |
|---|---|
| Contraseñas | Hash bcrypt con factor de costo 12; nunca se devuelven ni se registran |
| Política de contraseña | Mínimo 10 caracteres, con letras y números |
| Sesión | JWT firmado con HS256 (`JWT_SECRET`) con `sub`, `rol`, `sucursalId` y expiración de 8 h |
| Cookie | `httpOnly`, `secure` en producción, `sameSite=lax`, `path=/` |
| Mensajes | El inicio de sesión fallido responde "Correo o contraseña incorrectos", sin indicar cuál dato falló |
| Fuerza bruta | Máximo 5 intentos fallidos por correo e IP en 15 minutos; luego 429. Cada intento fallido se audita |
| Usuarios inactivos | No pueden iniciar sesión; una sesión vigente de un usuario desactivado se rechaza al verificarlo en la BD |

## 2. Autorización

- **Doble verificación:** el proxy de Next.js redirige a `/login` las rutas de la interfaz sin sesión; además, **cada** Route Handler verifica la sesión y el rol con una función común (`requerirRol([...])`). La interfaz oculta opciones, pero la protección real está en el servidor.
- **Alcance por sucursal (RN-05):** para BOD y CAJ, la sucursal se toma del token y se aplica en las consultas. Un recurso de otra sucursal responde 404, para no revelar su existencia.
- **Matriz de permisos:** `03-NEG` §4.1 y columna de roles de `04-REQ` §4.

## 3. Validación de entradas e integridad

- Todos los cuerpos y parámetros se validan con **Zod en modo estricto**: los campos no declarados se rechazan con 400. Esto impide enviar precios, totales, estados o la sucursal desde el cliente (RN-03).
- Montos, cantidades e identificadores con tipos y rangos explícitos; textos con longitud máxima.
- Prisma usa consultas parametrizadas; las consultas SQL de KPI usan `$queryRaw` con plantillas parametrizadas, **nunca** concatenación de texto.
- Transacciones y restricciones `CHECK` en la BD (`05-DAT` §4) como última barrera.

## 4. Gestión de secretos

- Los secretos solo existen en el `.env` local (excluido por `.gitignore`) y en las variables de Railway. El repositorio incluye únicamente `.env.example`.
- Los secretos nunca se escriben en chats con asistentes de IA ni en prompts. Los agentes de código no leen ni modifican archivos `.env`.
- No se ejecutan comandos que impriman valores de variables (por ejemplo, `railway variable list`).
- Antes de cada commit: `git status --short | Select-String "\.env"`. Antes de la entrega: búsqueda de secretos en todo el historial (Fase 11).
- Las contraseñas de los usuarios de demostración vienen de `SEED_DEMO_PASSWORD` y se entregan solo en el informe.

## 5. Base de datos

| Control | Implementación |
|---|---|
| Mínimo privilegio | La aplicación usa `ceiba_app`, que solo tiene `SELECT`, `INSERT`, `UPDATE` y `DELETE` sobre las tablas y uso de secuencias; no puede crear, alterar ni eliminar tablas |
| Separación de funciones | Las migraciones usan el rol `prisma`, cuya cadena solo existe en el equipo del desarrollador |
| Superficie expuesta | Data API (REST/GraphQL) de Supabase **desactivada**: la BD solo se alcanza con credenciales de Postgres |
| Cifrado en tránsito | Conexiones TLS hacia el *pooler* de Supabase |
| Copias | Exportación con `pg_dump` antes de la entrega, porque el plan gratuito no incluye copias de seguridad |

## 6. Seguridad de la IA

| Riesgo | Mitigación |
|---|---|
| El modelo inventa datos | Instrucciones de usar solo herramientas; respuestas con fuentes visibles; cantidades de reposición calculadas en código |
| Acceso indebido a datos por el chatbot | Herramientas filtradas por rol; sucursal impuesta por el servidor |
| Inyección de instrucciones en los datos o en la pregunta | Herramientas de solo lectura; instrucción de tratar el contenido de las herramientas como datos; salidas de los agentes validadas con Zod; ninguna acción se ejecuta por decisión exclusiva del modelo |
| Exposición de información sensible al proveedor de IA | Solo se envían datos ficticios del negocio; nunca contraseñas, hashes ni secretos |
| Abuso del servicio | Límite de longitud de los mensajes, máximo de rondas de herramientas y manejo del 429 |
| Decisiones automáticas | Órdenes en BORRADOR y recomendaciones PENDIENTES hasta la decisión del gerente |

## 7. Protección de la aplicación web

- Encabezados de seguridad en `next.config`: `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: strict-origin-when-cross-origin` y una política de contenido básica.
- La cookie `sameSite=lax` y las operaciones de escritura exclusivamente por `POST`, `PATCH` o `DELETE` con cuerpo JSON mitigan CSRF.
- React escapa el contenido por defecto; no se usa `dangerouslySetInnerHTML`. Las respuestas del chatbot se muestran como texto o Markdown sanitizado.
- Los errores 500 devuelven un mensaje genérico; el detalle solo va al registro del servidor.

## 8. Trazabilidad

Tabla `auditoria` con las operaciones de RN-21, y tablas `ejecucion_agente` y `mensaje_chat` para la IA. Solo el administrador consulta la auditoría.

## 9. Riesgos y limitaciones

| Riesgo o limitación | Impacto | Tratamiento |
|---|---|---|
| Cuotas del nivel gratuito de Gemini | El chatbot o los agentes no responden temporalmente | Mensaje 503 comprensible; el ERP sigue operando; el Agente 1 muestra el cálculo sin IA |
| Pausa del proyecto gratuito de Supabase por inactividad | La app deja de responder | Tarea diaria de GitHub Actions sobre `/api/health` |
| Vencimiento del periodo de prueba de Railway | La URL pública deja de funcionar | Instrucciones de ejecución local en el README |
| Limitador de intentos en memoria | Se reinicia con el servidor | Aceptable para un prototipo con una sola instancia |
| JWT sin revocación inmediata | Una sesión robada vale hasta 8 h | Verificación de usuario activo en cada petición sensible; expiración corta |
| Respuestas de IA probabilísticas | Posibles imprecisiones en las explicaciones | Fuentes visibles, contraste con el dashboard y validación humana |
| Vulnerabilidad moderada reportada por `npm audit` en `minimatch` (GHSA-g3hv-75wg-m249), dependencia de la CLI de `shadcn` | Solo la usa la CLI que genera componentes durante el desarrollo; la aplicación importa únicamente su hoja de estilos | Se acepta y documenta; la corrección automática instalaría una versión antigua e incompatible de shadcn |
| Vulnerabilidad reportada por `npm audit` en `effect` (ReDoS, GHSA-7589-6fvf-x4pw), dependencia de `@prisma/config` | Afecta el análisis de la configuración de Prisma CLI, no las rutas que procesan datos de usuarios | Se acepta y documenta. La corrección automática (`npm audit fix --force`) degradaría Prisma a 6.12 y rompería la arquitectura; se revisará al publicarse una versión estable corregida |
