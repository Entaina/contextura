# Electron

El directorio [electron/](../electron/) envuelve el backend como aplicación nativa de macOS. Todos los ficheros del proceso main son CommonJS por una razón técnica concreta — ver [principios/producto/electron-cjs.md](principios/producto/electron-cjs.md).

Este documento describe la implementación. Las features de integración nativa — menú, atajos, ventana, configuración persistente, auto-update y la elección de la carpeta raíz — viven desde el punto de vista del usuario en [features/plataforma/](features/plataforma/index.md) y [features/carpeta-raiz/](features/carpeta-raiz/index.md).

## Flujo de arranque

`npm run desktop` lanza `electron/main.cjs`, que:

1. Lee la configuración persistida (`rootPath`, `windowBounds`).
2. Llama a `startServer({ rootPath, port: 0, userDataPath })` vía `await import('../server.mjs')`. El puerto 0 hace que Node elija un puerto libre. `userDataPath` apunta al directorio de datos de la app para que el servidor pueda persistir conversaciones de chat (ver [chat.md](chat.md)).
3. Crea un `BrowserWindow` y carga el `http://127.0.0.1:<port>` devuelto.
4. Fija `app.setName('Contextura')` para que el menú y el Dock usen el nombre correcto.

El `rootPath` es elegido por el usuario y puede cambiar en cualquier momento desde el menú. Para que eso funcione limpiamente el servidor expone `stop()` y Electron lo invoca antes de arrancar uno nuevo con el `rootPath` nuevo (ver [backend.md](backend.md)).

## Ficheros

- **`electron/main.cjs`** — Proceso main: ciclo de vida de la app, `BrowserWindow`, menú nativo, flujo del folder picker, swap del servidor cuando cambia el `rootPath`.
- **`electron/preload.cjs`** — Puente con aislamiento de contexto. Expone `window.electronAPI` en el renderer con:
  - `openFolder` — dispara el diálogo nativo de selección de carpeta.
  - `getRootPath` — pregunta al proceso main cuál es el `rootPath` actual.
  - `getVersion` — versión del bundle de la app.
  - `onMenuAction` — suscribe el renderer a eventos del menú nativo.
- **`electron/config.cjs`** — Persiste `{ rootPath, windowBounds }` en `app.getPath('userData')/config.json`.
- **`electron/updater.cjs`** — Wrapper sobre `electron-updater`. No-op cuando `!app.isPackaged`. El flujo que experimenta el usuario está descrito en [features/plataforma/auto-update.md](features/plataforma/auto-update.md); el flujo de publicación y el detalle operativo de la actualización están en [release.md](release.md).
- **`electron-builder.yml`** — Config del builder. Produce un DMG sin firmar (arm64 + x64) en `dist/`. `publish: github` apuntando a `Entaina/contextura`.
- **`assets/icon.icns`** — Icono de la app. Generado por `scripts/build-icon.sh` desde `assets/source/brand-icon.png` (logo oficial Entaina) sobre fondo amarillo Golden Tainoi 200 (#f8cf73, pilar People del Design System).
- **`assets/source/brand-icon.png`** — Imagen fuente del icono. Copia idéntica a `design-system.entaina.ai/brand/icon.png`, versionada aquí para que el repo sea autocontenido. `assets/source/Pi_01.png` se conserva como branding alternativo (mascota).

## Acciones del menú

Los clicks del menú nativo disparan `ipcRenderer.send('menu:action', <action>)`, que el frontend maneja en [public/app.js](../public/app.js):

- `new-file` → dispara el botón "+" de la sidebar.
- `save` → llama a `saveActiveFile()`.
- `toggle-sidebar` → `toggleSidebar()`.
- `toggle-history` → alterna `_enterHistoryMode` / `_exitHistoryMode` en el `EditorPanelRenderer` activo. Ver [historial.md](historial.md).
- `toggle-chat` → abre el pane contextual con la pestaña de chat, o lo colapsa si ya está visible con el chat activo. Ver [chat.md](chat.md).

`Open Folder…` se gestiona directamente en `main.cjs` sin delegar al renderer: diálogo → guardar config → `swapServer` → `win.loadURL`. El flujo resultante que experimenta el usuario está en [features/carpeta-raiz/swap-carpeta.md](features/carpeta-raiz/swap-carpeta.md).

## Ubicación de la configuración

```
~/Library/Application Support/Contextura/config.json
```

```json
{
  "rootPath": "/absolute/path/to/any/folder",
  "windowBounds": { "width": 1400, "height": 900 }
}
```

Además, el subdirectorio `chats/` dentro del mismo directorio de datos almacena las conversaciones del chat integrado como ficheros JSON individuales (ver [chat.md](chat.md)).

Borra el fichero para resetear la app a un estado limpio (el siguiente arranque mostrará el folder picker). El lado de usuario de esta persistencia está en [features/plataforma/config-persistente.md](features/plataforma/config-persistente.md) y [features/plataforma/window-bounds.md](features/plataforma/window-bounds.md).

> **Nota**: puede haber un directorio obsoleto `~/Library/Application Support/Context Viewer/` de antes del rename. Se puede borrar sin riesgo.

## Cómo se cumple la restricción CJS

El porqué técnico y el error exacto que obliga a esta restricción viven en [principios/producto/electron-cjs.md](principios/producto/electron-cjs.md). En la implementación actual del proceso main la restricción se cumple así:

- Los ficheros del proceso main listados arriba son todos `.cjs` con `require()` / `module.exports`.
- El servidor HTTP ([server.mjs](../server.mjs), descrito en [backend.md](backend.md)) es ESM. Se carga desde `main.cjs` vía `await import('../server.mjs')` dentro de `app.whenReady()`, no con un `import` estático — así el loader ESM solo entra después de que Electron haya inicializado.
- El watcher del backend carga su dependencia nativa (chokidar) vía `createRequire`. La descripción completa de ese truco y por qué está en backend y no en electron/ vive en [backend.md](backend.md).
