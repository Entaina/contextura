# Desarrollo

## Comandos

```bash
npm install                 # Instala dependencias (electron, electron-builder, chokidar, etc.)
npm run desktop             # Arranca la app nativa Electron en modo desarrollo
npm run dist                # Construye el DMG para macOS en dist/ (sin publicar)
npm run lint                # Lint sobre todo el árbol (neostandard)
npm run lint:fix            # Aplica las correcciones automáticas de neostandard
npm test                    # Unit + integración + e2e (todo el árbol de tests)
npm run test:unit           # Solo unit tests con node:test
npm run test:integration    # Solo tests de integración HTTP contra un server temporal
npm run test:e2e            # Solo e2e con Playwright contra la app Electron real
npm run test:ci             # Unit + integración (sin e2e) — el mismo comando que corre CI
./scripts/build-icon.sh     # Regenera assets/icon.icns desde assets/source/Pi_01.png
./scripts/release.sh patch  # Release completa: bump de versión, build, publicación a GitHub
```

El mismo linter y los tests corren automáticamente en CI junto con análisis estático de seguridad, auditoría de dependencias y escaneo de secretos — ver [ci.md](ci.md).

## Pre-commit hook

`npm install` cablea un hook `pre-commit` vía [lefthook](https://lefthook.dev): al hacer `git commit`, lefthook corre `eslint` sobre los ficheros JS/MJS/CJS staged y aborta el commit si hay errores. La configuración vive en [lefthook.yml](../lefthook.yml). Si el hook bloquea, corre `npm run lint:fix` y reintenta; para saltarlo de forma puntual, `git commit --no-verify`.

El detalle de qué hace `release.sh` y cómo configurar el token está en [release.md](release.md).

## Punto de entrada

`npm run desktop` arranca [electron/main.cjs](../electron/main.cjs), que a su vez carga el backend en proceso vía `await import('../server.mjs')`. Ver [electron.md](electron.md) para el flujo completo del arranque y [backend.md](backend.md) para la API del servidor.

## Requisitos de runtime

- **macOS** con `git` en el `PATH`. Electron ejecuta `git` vía `child_process.execFile` para el historial y los diffs, así que las Xcode Command Line Tools son suficientes.
- **Acceso a internet en el primer arranque**: los assets del Design System se cargan desde CDN y se cachean localmente. Los arranques en frío sin red no renderizan los estilos correctamente. Detalle en [design-system.md](design-system.md).

## Gotcha: `ELECTRON_RUN_AS_NODE`

Si invocas `electron .` desde un entorno que tiene `ELECTRON_RUN_AS_NODE=1` puesto (algunos sandboxes de CI y de agentes lo hacen), el binario corre como Node normal y `require('electron')` devuelve undefined. Arranca con `env -u ELECTRON_RUN_AS_NODE electron .` o elimina la variable del entorno antes del comando.

## Principios aplicables al desarrollo

Antes de tocar código del proyecto, lee:

- [principios/producto/vanilla-zero-build.md](principios/producto/vanilla-zero-build.md) — por qué no hay paso de build y qué implica al añadir dependencias.
- [principios/producto/electron-cjs.md](principios/producto/electron-cjs.md) — por qué todo lo del proceso main de Electron es CommonJS.
- [principios/documentacion/mece.md](principios/documentacion/mece.md) — cómo estructurar documentación nueva sin duplicar.
