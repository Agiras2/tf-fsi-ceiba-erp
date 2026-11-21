# 02-GIT — Convenciones de Git y Gitflow

Repositorio: <https://github.com/Agiras2/tf-fsi-ceiba-erp>

---

## 1. Ramas

| Rama | Propósito | Se crea desde | Se integra en |
|---|---|---|---|
| `main` | Versiones estables publicadas, cada una con etiqueta | — | — |
| `develop` | Integración del trabajo en curso | `main` | `release/*` |
| `feature/*` | Una funcionalidad o un bloque de una fase | `develop` | `develop` |
| `release/*` | Preparación de una versión (ajustes finales, versión en `package.json`) | `develop` | `main` y `develop` |
| `hotfix/*` | Corrección urgente sobre una versión publicada | `main` | `main` y `develop` |

### Nombres de rama

```
feature/fase-NN-descripcion-corta
release/X.Y.Z
hotfix/X.Y.Z
```

Ejemplos: `feature/fase-03-crud-productos`, `feature/fase-07-agente-inventario`, `release/0.3.0`, `hotfix/0.3.1`.

---

## 2. Mensajes de commit

Formato basado en *Conventional Commits*, en español y **sin tildes** para evitar problemas de codificación en PowerShell 5.1:

```
tipo(alcance): descripcion en imperativo y minusculas
```

| Tipo | Uso |
|---|---|
| `feat` | Nueva funcionalidad |
| `fix` | Corrección de un defecto |
| `docs` | Documentación |
| `test` | Pruebas |
| `refactor` | Cambio interno sin alterar el comportamiento |
| `chore` | Configuración, dependencias y tareas de mantenimiento |
| `style` | Formato, sin cambio de lógica |
| `merge` | Integración de ramas con `--no-ff` |

Alcances sugeridos: `auth`, `catalogos`, `inventario`, `ventas`, `compras`, `dashboard`, `reportes`, `chatbot`, `agentes`, `db`, `deploy`.

Ejemplos:

```
feat(ventas): registra venta con descuento transaccional de stock
fix(compras): rechaza recepcion de orden no aprobada
docs(req): agrega reglas de negocio de inventario
```

**Regla del proyecto:** los mensajes de commit **no** llevan líneas de atribución. La autoría se indica dentro de los archivos de código.

---

## 3. Versiones y etiquetas

Se usa versionado semántico (`MAJOR.MINOR.PATCH`) con etiquetas anotadas `vX.Y.Z` sobre `main`.

| Versión | Contenido |
|---|---|
| `v0.1.0` | Documentación de requisitos y diseño (fases 0 y 1) |
| `v0.2.0` | Proyecto base: BD, *seed*, autenticación y roles |
| `v0.3.0` | Módulos de gestión (CRUD) |
| `v0.4.0` | Procesos de negocio: ventas, compras e inventario |
| `v0.5.0` | Dashboard de KPI y reportes |
| `v0.6.0` | Chatbot empresarial |
| `v0.7.0` | Agentes inteligentes e interacción |
| `v0.8.0` | Pruebas automatizadas y de seguridad |
| `v0.9.0` | Despliegue |
| `v1.0.0` | Entrega final |

---

## 4. Comandos del flujo (PowerShell 5.1)

Gitflow se aplica con comandos de Git estándar, sin extensiones adicionales.

### Iniciar una funcionalidad

```powershell
git checkout develop
git pull origin develop
git checkout -b feature/fase-NN-descripcion
```

### Antes de cada commit (obligatorio)

```powershell
git status --short | Select-String "\.env"   # solo puede aparecer .env.example
git status --short
```

### Cerrar una funcionalidad

```powershell
git checkout develop
git merge --no-ff feature/fase-NN-descripcion -m "merge: feature/fase-NN-descripcion en develop"
git push origin develop
git branch -d feature/fase-NN-descripcion
```

### Publicar una versión

```powershell
git checkout develop
git checkout -b release/X.Y.Z
# ajustes finales (version en package.json, README) y commit
git checkout main
git merge --no-ff release/X.Y.Z -m "merge: release/X.Y.Z en main"
git tag -a vX.Y.Z -m "CeibaERP vX.Y.Z"
git checkout develop
git merge --no-ff release/X.Y.Z -m "merge: release/X.Y.Z en develop"
git push origin main develop --follow-tags
git branch -d release/X.Y.Z
```

### Corrección urgente

```powershell
git checkout main
git checkout -b hotfix/X.Y.Z
# correccion y commit
git checkout main
git merge --no-ff hotfix/X.Y.Z -m "merge: hotfix/X.Y.Z en main"
git tag -a vX.Y.Z -m "CeibaERP vX.Y.Z"
git checkout develop
git merge --no-ff hotfix/X.Y.Z -m "merge: hotfix/X.Y.Z en develop"
git push origin main develop --follow-tags
git branch -d hotfix/X.Y.Z
```

### Ver el historial

```powershell
git log --oneline --graph --all --decorate
```

---

## 5. Identidad y privacidad

- El repositorio usa el correo *noreply* de GitHub (`ID+Agiras2@users.noreply.github.com`), configurado a nivel local del repositorio.
- Antes de publicar la versión final se revisa el historial completo en busca de secretos (Fase 11).
