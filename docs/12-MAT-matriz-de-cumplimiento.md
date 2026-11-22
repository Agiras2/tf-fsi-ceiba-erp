# 12-MAT — Matriz de cumplimiento de la guía

Relaciona cada exigencia de la guía del trabajo final con la forma en que CeibaERP la cumple, la fase en que se implementa y la evidencia que lo demuestra. Se actualiza al cerrar cada fase.

**Estados:** ⏳ pendiente · 🟡 en curso · ✅ cumplido y evidenciado.

La columna **Requisitos** remite a `04-REQ` y a los demás documentos de diseño. Que una exigencia tenga requisitos asociados significa que está especificada (Fase 1); pasa a ✅ cuando está implementada y evidenciada.

---

## 1. Requisitos mínimos del sistema (guía, sección 4)

| ID | Exigencia | Cómo se cumple | Fase | Evidencia | Requisitos | Estado |
|---|---|---|---|---|---|---|
| G4-01 | CRUD de información | Catálogos, inventario, ventas y órdenes de compra | 3, 4 | OBL-2, OBL-3 | RF-06–RF-10, RF-12–RF-22 | 🟡 |
| G4-02 | Persistencia en base de datos | PostgreSQL en Supabase con Prisma | 2 | Migración, *seed*, captura de tablas | RF-43, `05-DAT` | ✅ |
| G4-03 | IA para una función concreta del negocio | Reposición priorizada por cobertura frente al tiempo de entrega; análisis comercial | 7 | OBL-6, OBL-7 | RF-36, RF-37, RN-17 | ⏳ |
| G4-04 | Chatbot funcional | Chatbot con llamadas a funciones sobre datos reales | 6 | OBL-5 | RF-31–RF-35 | ⏳ |
| G4-05 | Al menos dos agentes con responsabilidades diferentes | Analista de inventario y analista comercial | 7 | OBL-6, OBL-7 | RF-36–RF-41 | ⏳ |
| G4-06 | Dashboard con mínimo seis KPI | Ocho KPI calculados por consultas | 5 | OBL-1, OBL-8 | RF-24–RF-29, `06-KPI` | ⏳ |
| G4-07 | Interacción del usuario con los módulos principales | Interfaz por rol | 2–7 | Capturas por módulo | RNF-01 | 🟡 |
| G4-08 | Validaciones, manejo de errores y pruebas básicas | Zod, códigos HTTP, Vitest, PowerShell | 3–8 | Resultados de pruebas | RNF-03, RNF-06, `10-PRU` | 🟡 |
| G4-09 | Repositorio GitHub con documentación para ejecutar | README, `docs/`, `.env.example` | 11 | URL del repositorio | RNF-10 | ⏳ |
| G4-10 | No ser una interfaz estática con datos simulados | Todos los procesos se ejecutan contra la base de datos | 2–7 | Flujo completo (OBL-4) | RF-16–RF-22 | 🟡 |

## 2. Requerimientos funcionales por módulo (guía, sección 6)

| ID | Módulo | Exigencia | Cómo se cumple | Fase | Requisitos | Estado |
|---|---|---|---|---|---|---|
| G6-01 | Gestión empresarial | Crear, consultar, actualizar y eliminar | CRUD de catálogos y usuarios | 3 | RF-03, RF-06–RF-10 | 🟡 |
| G6-02 | Gestión de procesos | Al menos un flujo de negocio completo | Ciclo de abastecimiento inteligente (`03-NEG` §6) | 4, 7 | RF-16–RF-22, RF-36–RF-37 | 🟡 |
| G6-03 | Base de datos | Almacenar y recuperar información | Prisma + PostgreSQL | 2 | RF-43, RNF-03 | ✅ |
| G6-04 | Inteligencia artificial | Resolver una necesidad concreta | Agente de reposición | 7 | RF-36–RF-37 | ⏳ |
| G6-05 | Chatbot | Responder sobre el negocio y el sistema | Herramientas de solo lectura | 6 | RF-31–RF-35 | ⏳ |
| G6-06 | Agentes inteligentes | Dos tareas diferenciadas e integradas | Informe ejecutivo que coordina ambos agentes | 7 | RF-39 | ⏳ |
| G6-07 | Dashboard | Seis KPI calculados a partir de datos | `06-KPI` | 5 | RF-24 | ⏳ |
| G6-08 | Reportes | Consultar o exportar un reporte | Exportación CSV | 5 | RF-30 | ⏳ |
| G6-09 | Validación y pruebas | Comprobar funcionalidades y manejar errores | `10-PRU` | 8, 10 | RNF-06, `10-PRU` | ⏳ |

## 3. Chatbot y agentes (guía, sección 7)

| ID | Exigencia | Cómo se cumple | Fase | Requisitos | Estado |
|---|---|---|---|---|---|
| G7-01 | No basta un campo de texto con preguntas genéricas al modelo | El modelo solo responde a partir de herramientas que consultan la BD | 6 | RF-31, `07-IAG` §1 | ⏳ |
| G7-02 | Chatbot consulta datos reales o funciones de negocio | Herramientas compartidas con el dashboard | 6 | RF-31, `07-IAG` §3 | ⏳ |
| G7-03 | Chatbot indica cuando no tiene información | Instrucción de sistema y prueba específica | 6, 8 | RF-33 | ⏳ |
| G7-04 | Agente de inventario: existencias, bajo mínimo, reposición, criterios | Agente 1 | 7 | RF-36, RF-37, `07-IAG` §5 | ⏳ |
| G7-05 | Agente comercial: ventas, tendencias, acciones, contraste con dashboard | Agente 2 | 7 | RF-38, `07-IAG` §6 | ⏳ |
| G7-06 | Mecanismos de interacción definidos entre agentes | El Agente 2 consume la salida registrada del Agente 1 | 7 | RF-39, `07-IAG` §7 | ⏳ |

## 4. Dashboard y KPI (guía, sección 8)

| ID | Exigencia | Fase | Requisitos | Estado |
|---|---|---|---|---|
| G8-01 | Cada KPI con nombre, definición, fórmula, periodo y fuente | 1, 5 | `06-KPI` §2 | ⏳ |
| G8-02 | Tarjetas con los valores de los KPI | 5 | RF-24 | ⏳ |
| G8-03 | Dos o más visualizaciones gráficas | 5 | RF-25 | ⏳ |
| G8-04 | Filtros pertinentes (periodo, sucursal, producto o estado) | 5 | RF-26 | ⏳ |
| G8-05 | Interpretación breve de los resultados | 5 | RF-27 | ⏳ |
| G8-06 | Explicación de cómo los agentes o el chatbot usan los datos del dashboard | 5, 7 | RF-29, `06-KPI` §5 | ⏳ |

## 5. Requerimientos no funcionales (guía, sección 10)

| ID | Atributo | Cómo se cumple | Requisitos | Estado |
|---|---|---|---|---|
| G10-01 | Usabilidad | Navegación consistente por rol, componentes shadcn/ui | RNF-01 | ⏳ |
| G10-02 | Seguridad | Validación de entradas, autorización en servidor, secretos fuera del repo, usuario de BD de mínimo privilegio | RNF-02, `09-SEG` | 🟡 |
| G10-03 | Integridad | Transacciones, reglas de negocio y estados controlados | RNF-03 | 🟡 |
| G10-04 | Mantenibilidad | Código modular por capas (`08-ARQ`) | RNF-04, `08-ARQ` | 🟡 |
| G10-05 | Trazabilidad | Auditoría de operaciones y registro de ejecuciones de agentes | RNF-05, RF-04 | 🟡 |
| G10-06 | Confiabilidad | Manejo de errores con mensajes comprensibles | RNF-06 | 🟡 |
| G10-07 | Privacidad | Datos ficticios, sin secretos en el repositorio | RNF-07 | ✅ |
| G10-08 | Transparencia de IA | Etiqueta en respuestas de IA y recomendaciones con validación humana | RNF-08, RF-34 | ⏳ |

## 6. Entregables (guía, sección 11)

| ID | Entregable | Componentes | Fase | Estado |
|---|---|---|---|---|
| G11-01 | Aplicación funcional | Módulos, datos, flujo, chatbot, agentes, dashboard, errores | 2–9 | ⏳ |
| G11-02 | Repositorio GitHub | Código, estructura, README, dependencias, script de BD, datos ficticios, `.env.example`, historial de prompts | 11 | ⏳ |
| G11-03 | Mínimo ocho capturas con título y descripción | OBL-1 a OBL-8 más capturas adicionales | 3–10 | ⏳ |
| G11-04 | Informe técnico en PDF (8–15 páginas, 18 puntos) | Ver sección 7 | 12 | ⏳ |
| G11-05 | Demostración funcional verificable | Capturas + repositorio + instrucciones | 11 | ⏳ |

## 7. Puntos del informe (guía, entregable 4)

| N.º | Punto | Fuente principal | Estado |
|---|---|---|---|
| 1 | Portada (proyecto, asignatura, integrantes, fecha) | — | ⏳ |
| 2 | Resumen ejecutivo | Todos | ⏳ |
| 3 | Organización ficticia y problema | `03-NEG` §1–2 | ⏳ |
| 4 | Justificación del sistema seleccionado | `03-NEG` §3.1 | ⏳ |
| 5 | Objetivo general y específicos | Guía §2–3 | ⏳ |
| 6 | Requerimientos funcionales y no funcionales | `04-REQ` | ⏳ |
| 7 | Tecnologías y justificación | `08-ARQ` | ⏳ |
| 8 | Modelo de datos o diagrama ER | `05-DAT` | ⏳ |
| 9 | Módulos implementados | `03-NEG` §5 | ⏳ |
| 10 | Diseño y funcionamiento del chatbot | `07-IAG` | ⏳ |
| 11 | KPI: definición, fórmulas y análisis | `06-KPI` | ⏳ |
| 12 | Evidencias gráficas | Capturas | ⏳ |
| 13 | Pruebas y resultados | `10-PRU` | ⏳ |
| 14 | Uso de herramientas de IA en el desarrollo | `13-PRM` | ⏳ |
| 15 | Limitaciones, riesgos y seguridad | `09-SEG` | ⏳ |
| 16 | Conclusiones y mejoras | — | ⏳ |
| 17 | Enlace al repositorio | README | ⏳ |
| 18 | Instrucciones de ejecución y prueba | `11-DEP`, README | ⏳ |
