# CI — Validaciones automáticas

Contextura corre un pipeline de GitHub Actions que valida cada cambio antes de que llegue a `main`. Su objetivo es detectar regresiones de calidad y riesgos de seguridad de forma consistente, sin depender de que un humano recuerde ejecutar comandos locales.

Este fichero describe **qué** se valida y **por qué**. El detalle de herramientas, versiones y triggers exactos vive en [.github/workflows/](../.github/workflows/); tratarlo como la fuente de verdad operativa.

## Capas de validación

### 1. Linter

Todo el código JavaScript pasa por **neostandard** — una configuración de ESLint equivalente a `standard` (sin punto y coma, comillas simples, `promise/param-names`, etc.). Se aplican overrides por carpeta para respetar la dualidad del proyecto: CommonJS en [electron/](../electron/), ESM + Node en [server.mjs](../server.mjs) y [lib/](../lib/), ESM + browser en [public/](../public/).

El linter también se ejecuta localmente — ver los comandos en [desarrollo.md](desarrollo.md).

### 2. SAST (análisis estático de seguridad)

Dos herramientas complementarias:

- **CodeQL** con las queries `security-and-quality` cubre el análisis general de JavaScript — inyecciones, uso inseguro de APIs, patrones de riesgo. Es el mismo motor que GitHub Security usa para sus alertas nativas.
- **Electronegativity** (Doyensec) revisa riesgos específicos de Electron: `nodeIntegration`, `contextIsolation`, configuración de `webSecurity`, uso del canal IPC entre preload y main. Cubre la superficie que CodeQL no entiende porque no conoce el modelo de procesos de Electron.

Los hallazgos de ambas se publican como SARIF en la pestaña **Security → Code scanning alerts** del repositorio.

### 3. Dependencias

- **npm audit** se ejecuta en cada push y pull request para detectar CVEs conocidas en el árbol de dependencias. El umbral actual es `high`: el pipeline falla ante cualquier advisory de severidad alta o crítica.
- **Dependabot** abre pull requests semanales con las actualizaciones disponibles, agrupando el stack `electron*` en un único PR y el resto de devDependencies en otro para reducir el ruido de revisión.

### 4. Secretos

**TruffleHog** escanea el historial del repo en cada push y pull request buscando secretos (tokens, claves API, credenciales). Corre con `--only-verified`, que valida activamente cada hallazgo contra el servicio origen antes de emitirlo, filtrando casi todo el ruido de falsos positivos.

## Cuándo se ejecuta

- Cada push a `main`.
- Cada pull request cuyo target sea `main`.
- Un cron semanal (escalonado por workflow) para detectar CVEs y hallazgos nuevos en código que no ha cambiado recientemente.
- Disparo manual desde **Actions → Run workflow** sobre cualquier rama, útil para iterar sobre el pipeline desde una rama de trabajo sin abrir un PR.

## Consultar resultados

- **Alerts persistentes** (SAST, secretos): pestaña **Security** del repositorio.
- **Logs por ejecución**: pestaña **Actions**, un run por workflow.
- **Checks por PR**: sección "Checks" dentro del pull request correspondiente.

## Principios aplicables

Al editar el pipeline o añadir nuevas validaciones:

- [principios/producto/vanilla-zero-build.md](principios/producto/vanilla-zero-build.md) — las herramientas de CI no pueden introducir un paso de build en el código de producto; viven solo en `devDependencies` o como acciones externas.
- [principios/producto/macos-only.md](principios/producto/macos-only.md) — evitar matrices cross-platform en el pipeline si no aportan valor para un producto macOS-only.
