# CeibaERP — Índice de documentación

Sistema de planificación de recursos empresariales (ERP) inteligente para **Supermercados Ceiba S.A.S.**, organización ficticia.

Trabajo final de semestre — Fundamentos de Sistemas de Información · Facultad de Ingeniería · Universidad de Antioquia · Semestre 2026-2.

---

## Convención de nombres

Todos los documentos siguen el patrón:

```
NN-COD-nombre-en-minusculas.md
```

| Parte | Significado | Ejemplo |
|---|---|---|
| `NN` | Orden de lectura | `04` |
| `COD` | Código de tres letras del documento | `REQ` |
| `nombre` | Descripción breve en kebab-case | `requisitos` |

El código se usa también para referenciar elementos internos de cada documento. Por ejemplo:

- `REQ-RF-05`: requisito funcional 5 del documento de requisitos.
- `REQ-RN-03`: regla de negocio 3.
- `KPI-04`: cuarto indicador del documento de KPI.
- `IAG-AG-01`: agente 1 del documento de IA y agentes.

---

## Documentos

| N.º | Código | Documento | Contenido | Estado |
|---|---|---|---|---|
| 00 | IDX | [00-IDX-indice.md](00-IDX-indice.md) | Este índice y la convención de nombres | ✅ |
| 01 | PLN | [01-PLN-plan-de-accion.md](01-PLN-plan-de-accion.md) | Fases, entregables, criterios de aceptación, capturas y versiones | ✅ |
| 02 | GIT | [02-GIT-convenciones-gitflow.md](02-GIT-convenciones-gitflow.md) | Ramas, commits, etiquetas y comandos del flujo de trabajo | ✅ |
| 03 | NEG | [03-NEG-negocio-y-flujo.md](03-NEG-negocio-y-flujo.md) | Organización, problema, justificación del ERP, roles, módulos y flujos de negocio | ✅ |
| 04 | REQ | [04-REQ-requisitos.md](04-REQ-requisitos.md) | Requisitos funcionales y no funcionales, reglas de negocio, endpoints y fuera de alcance | ✅ |
| 05 | DAT | [05-DAT-modelo-de-datos.md](05-DAT-modelo-de-datos.md) | Entidades, diagrama entidad-relación, diccionario de datos y datos de demostración | ✅ |
| 06 | KPI | [06-KPI-indicadores.md](06-KPI-indicadores.md) | Ficha de cada KPI: definición, fórmula, periodo, fuente y consulta | ✅ |
| 07 | IAG | [07-IAG-chatbot-y-agentes.md](07-IAG-chatbot-y-agentes.md) | Herramientas, instrucciones de sistema, interacción, trazabilidad y transparencia de IA | ✅ |
| 08 | ARQ | [08-ARQ-arquitectura-y-tecnologias.md](08-ARQ-arquitectura-y-tecnologias.md) | Capas, estructura de carpetas, tecnologías y su justificación | ✅ |
| 09 | SEG | [09-SEG-seguridad.md](09-SEG-seguridad.md) | Autenticación, autorización, credenciales y privilegios en la base de datos | ✅ |
| 10 | PRU | [10-PRU-plan-de-pruebas.md](10-PRU-plan-de-pruebas.md) | Pruebas automatizadas, de seguridad, del chatbot y con TestSprite | ✅ |
| 11 | DEP | [11-DEP-despliegue.md](11-DEP-despliegue.md) | Supabase, Railway, variables de entorno, verificación y mantenimiento | 🟡 Se completa con la URL pública |
| 12 | MAT | [12-MAT-matriz-de-cumplimiento.md](12-MAT-matriz-de-cumplimiento.md) | Cada exigencia de la guía → cómo se cumple → fase → evidencia | 🟡 Se actualiza en cada fase |
| 13 | PRM | `13-PRM-historial-de-prompts.md` | Prompts usados con GitHub Copilot y Claude durante el desarrollo | ⏳ Fase 11 |

**Leyenda:** ✅ listo · 🟡 en construcción · ⏳ pendiente (fase en que se elabora).

---

## Orden de lectura recomendado

1. **03-NEG**: qué es CeibaERP y qué problema resuelve.
2. **04-REQ** y **05-DAT**: qué debe hacer el sistema y con qué datos.
3. **06-KPI** y **07-IAG**: la analítica y la inteligencia artificial.
4. **08-ARQ**, **09-SEG** y **10-PRU**: cómo está construido, protegido y probado.
5. **11-DEP**: cómo ejecutarlo y desplegarlo.
6. **12-MAT**: verificación de que se cumple todo lo exigido.
