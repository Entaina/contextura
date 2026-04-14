# Backend

El backend es un servidor HTTP Node.js puro (sin Express) que vive en [server.mjs](../server.mjs), complementado por dos módulos de soporte en [lib/](../lib/). Se arranca en proceso desde Electron — ver [electron.md](electron.md) para el flujo de arranque.

## `server.mjs`

- Servidor HTTP Node.js puro, exporta `startServer({ rootPath, port, host })`.
- El proceso main de Electron lo invoca vía `await import()` dinámico.
- Devuelve `{ port, url, rootPath, stop }`. Electron llama a `stop()` antes de cambiar el `rootPath` (flujo de File → Open Folder…).
- Sirve los ficheros estáticos de [public/](../public/).

### Endpoints HTTP

| Método | Ruta | Descripción |
|---|---|---|
| GET | `/api/tree` | Devuelve el árbol recursivo de ficheros `.md` |
| GET | `/api/file?path=<path>` | Lee el contenido de un fichero |
| PUT | `/api/file?path=<path>` | Escribe el contenido de un fichero (solo `.md`) |
| GET | `/api/index` | Devuelve el mapa filename → path usado para resolver wikilinks |
| GET | `/api/root` | Devuelve el `rootPath` al que está enlazado el servidor (lo usa el puente Electron) |
| GET | `/api/history` | Historial git + estado de cambios sin commitear de un fichero |
| GET | `/api/content` | Contenido en crudo en una revisión concreta |
| GET | `/api/diff` | Diff unificado entre dos revisiones |
| GET | `/sse` | Server-Sent Events para el live reload cuando los ficheros cambian |

Los endpoints de historial y diff están respaldados por [historial.md](historial.md), y el SSE de live reload por el watcher descrito más abajo.

## Path safety

Cualquier operación de fichero que recibe un path del cliente pasa por `safePath()`, que valida que la ruta resultante queda dentro de `ROOT_PATH`. Esto blinda el servidor contra traversals tipo `../../etc/passwd`. No hay otros escapes: si un path no empieza por `ROOT_PATH` tras resolver symlinks, la petición se rechaza antes de tocar el disco.

## File Scanner — `lib/scanner.mjs`

- Construye el árbol recursivo de ficheros `.md` servido por `/api/tree`.
- Respeta las exclusiones declaradas en un `.indexignore` del `rootPath`. Si el fichero no existe, cae a una lista hardcodeada: `.git`, `.claude`, `.obsidian`, `node_modules`, `tools`, `Archive`.
- Genera el índice de filenames que `/api/index` expone para que el frontend pueda resolver wikilinks tipo `[[nombre]]` sin conocer rutas absolutas.

## File Watcher — `lib/watcher.mjs`

- Usa chokidar para observar los cambios en ficheros `.md` dentro del `rootPath`.
- Emite los cambios vía SSE al endpoint `/sse` para disparar el live reload en el cliente.
- Expone `closeAllConnections()`, que el puente Electron invoca para cerrar limpiamente todas las conexiones SSE cuando el usuario cambia de carpeta (`stop()` en la sección de `server.mjs`).

Una nota de implementación: `watcher.mjs` carga chokidar vía `createRequire` en vez de con un `import` ESM. No es cosmético — es parte de la estrategia para esquivar los ESM caveats de Electron 33. Ver [principios/producto/electron-cjs.md](principios/producto/electron-cjs.md) y [electron.md](electron.md).
