# Documentación de Contextura

## Acerca de este índice

Este directorio (`docs/`) es la fuente única de verdad sobre Contextura como producto, su arquitectura y su operación. Cualquier consumidor que necesite contexto — humano, script o agente — debería leer ficheros de aquí en lugar de duplicar su contenido.

Antes de editar cualquier fichero de `docs/` o de código, lee [principios/index.md](principios/index.md). Los principios son reglas transversales sin las cuales este índice pierde sentido.

Para navegar empieza por la tabla de dominios más abajo y usa los criterios de "leer cuando…" para elegir qué cargar.

## Dominios

### Producto

- [producto.md](producto.md): Qué es Contextura, para quién, plataformas soportadas, alcance futuro
  - Leer para entender el propósito y los límites del producto
  - Leer antes de tomar decisiones de scope

- [features/index.md](features/index.md): Catálogo de features del producto agrupadas por módulos, descritas desde el punto de vista del usuario
  - Leer para saber qué hace la app desde el punto de vista del usuario
  - Leer antes de añadir una feature nueva (para elegir el módulo correcto)

### Desarrollo

- [desarrollo.md](desarrollo.md): Comandos npm, requisitos de runtime, gotchas del entorno de desarrollo
  - Leer antes de arrancar la app por primera vez
  - Leer cuando `electron .` falle o se comporte raro

### Arquitectura

- [backend.md](backend.md): Servidor HTTP ([server.mjs](../server.mjs)), endpoints API, path safety, scanner ([lib/scanner.mjs](../lib/scanner.mjs)) y watcher ([lib/watcher.mjs](../lib/watcher.mjs))
  - Leer al tocar cualquier endpoint `/api/*` o el flujo SSE
  - Leer al cambiar cómo se listan ficheros o cómo se detectan cambios en disco

- [frontend.md](frontend.md): [public/app.js](../public/app.js), Dockview, Toast UI, renderers, detección de cambios sin guardar, persistencia en localStorage
  - Leer al tocar la implementación de la UI, los paneles, la edición o la persistencia del layout (la experiencia del usuario vive en [features/](features/index.md))

- [electron.md](electron.md): Proceso main ([electron/](../electron/)), menú nativo, puente preload, ESM caveats, ubicación de configuración
  - Leer al crear o editar ficheros en `electron/`
  - Leer al investigar problemas de arranque o integración macOS

- [historial.md](historial.md): Implementación técnica del historial — [lib/git-history.mjs](../lib/git-history.mjs) y el `HistoryView` del frontend
  - Leer al tocar la implementación del historial (la experiencia del usuario vive en [features/historial/](features/historial/index.md))

- [design-system.md](design-system.md): Integración con el Entaina Design System vía CDN
  - Leer al tocar estilos globales, variables CSS o la sidebar

### Operación

- [ci.md](ci.md): Pipeline de GitHub Actions — linter, SAST (CodeQL + Electronegativity), `npm audit`, Dependabot, escaneo de secretos
  - Leer al modificar cualquier workflow de `.github/workflows/` o `.github/dependabot.yml`
  - Leer para entender qué valida el pipeline y dónde encontrar los resultados

- [release.md](release.md): `release.sh`, token del Keychain, auto-update, verificación de una release publicada
  - Leer antes de cortar una release
  - Leer para entender el flujo de auto-update en clientes instalados

## Principios (lectura obligatoria al editar)

Reglas transversales que rigen todo lo anterior, divididas en dos niveles. Ver [principios/index.md](principios/index.md) para el índice completo con criterios de "leer cuando…".

**Nivel de producto** (al tocar código, dependencias o alcance):

- [principios/producto/vanilla-zero-build.md](principios/producto/vanilla-zero-build.md) — Vanilla JS/CSS + Node puro, sin build
- [principios/producto/electron-cjs.md](principios/producto/electron-cjs.md) — Proceso main de Electron en CommonJS
- [principios/producto/macos-only.md](principios/producto/macos-only.md) — macOS únicamente

**Nivel de documentación** (al editar cualquier fichero de `docs/`):

- [principios/documentacion/mece.md](principios/documentacion/mece.md) — Exclusividad de dominio
- [principios/documentacion/features.md](principios/documentacion/features.md) — Capa de features vs capa de arquitectura
- [principios/documentacion/independencia-conocimiento.md](principios/documentacion/independencia-conocimiento.md) — `docs/` es independiente de las herramientas
