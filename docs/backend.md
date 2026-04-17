# Backend

El backend es un servidor HTTP Node.js puro (sin Express) que vive en [server.mjs](../server.mjs), complementado por dos módulos de soporte en [lib/](../lib/). Se arranca en proceso desde Electron — ver [electron.md](electron.md) para el flujo de arranque.

Este documento describe la implementación. Las features de cara al usuario que este backend habilita — el árbol de ficheros de la barra lateral y la recarga automática cuando cambian ficheros en disco — están en [features/navegacion/arbol-ficheros.md](features/navegacion/arbol-ficheros.md) y [features/live-reload.md](features/live-reload.md).

## `server.mjs`

- Servidor HTTP Node.js puro, exporta `startServer({ rootPath, port, host, userDataPath })`.
- El proceso main de Electron lo invoca vía `await import()` dinámico.
- Devuelve `{ port, url, rootPath, stop }`. Electron llama a `stop()` antes de cambiar el `rootPath` (flujo de File → Open Folder…).
- `userDataPath` es el directorio de datos de Electron (`~/Library/Application Support/Contextura`), necesario para la persistencia de conversaciones de chat (ver [chat.md](chat.md)).
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
| GET | `/api/chat/status` | Estado de disponibilidad del CLI de chat |
| POST | `/api/chat` | Streaming SSE de chat (subproceso CLI) |
| POST | `/api/chat/cancel` | Cancela una respuesta de chat activa |
| GET | `/api/chat/commands` | Lista slash commands del proyecto, usuario, skills y plugins |
| GET | `/api/chat/conversations` | Lista conversaciones guardadas (metadata) |
| POST | `/api/chat/conversations` | Crea una conversación |
| GET | `/api/chat/conversations/:id` | Carga una conversación con mensajes |
| PUT | `/api/chat/conversations/:id` | Guarda/actualiza una conversación |
| DELETE | `/api/chat/conversations/:id` | Elimina una conversación |

Los endpoints de historial y diff están respaldados por [historial.md](historial.md), los de chat por [chat.md](chat.md), y el SSE de live reload por el watcher descrito más abajo.

## Path safety

Cualquier operación de fichero que recibe un path del cliente pasa por `safePath()`, que valida que la ruta resultante queda dentro de `ROOT_PATH`. Esto blinda el servidor contra traversals tipo `../../etc/passwd`. No hay otros escapes: si un path no empieza por `ROOT_PATH` tras resolver symlinks, la petición se rechaza antes de tocar el disco.

## File Scanner — `lib/scanner.mjs`

- Construye el árbol recursivo de ficheros `.md` servido por `/api/tree`. El contrato que esta estructura hace al usuario está en [features/navegacion/arbol-ficheros.md](features/navegacion/arbol-ficheros.md).
- Respeta las exclusiones declaradas en un `.indexignore` del `rootPath`. Si el fichero no existe, cae a una lista hardcodeada: `.git`, `.claude`, `.obsidian`, `node_modules`, `tools`, `Archive`.
- Genera el índice de filenames que `/api/index` expone para que el frontend pueda resolver wikilinks tipo `[[nombre]]` sin conocer rutas absolutas.

## File Watcher — `lib/watcher.mjs`

- Usa chokidar para observar los cambios en ficheros `.md` dentro del `rootPath`.
- Emite los cambios vía SSE al endpoint `/sse` para disparar la recarga automática en el cliente. Las garantías que esta recarga hace al usuario viven en [features/live-reload.md](features/live-reload.md).
- Expone `closeAllConnections()`, que el puente Electron invoca para cerrar limpiamente todas las conexiones SSE cuando el usuario cambia de carpeta (`stop()` en la sección de `server.mjs`).

Una nota de implementación: `watcher.mjs` carga chokidar vía `createRequire` en vez de con un `import` ESM. No es cosmético — es parte de la estrategia para esquivar los ESM caveats de Electron 33. Ver [principios/producto/electron-cjs.md](principios/producto/electron-cjs.md) y [electron.md](electron.md).

## Chat Relay — `lib/chat-relay.mjs`

Gestiona subprocesos `claude -p` para el chat integrado. En lugar de llamar a la API de Anthropic directamente, lanza el CLI de Claude Code como child process con `--output-format stream-json`, lo que permite usar la suscripción Pro/Max del usuario. Incluye resolución del binario (PATH + ubicaciones conocidas en macOS + fallback al login shell), detección de autenticación, y una clase `ChatSession` basada en `EventEmitter` que parsea el stream de stdout y emite eventos tipados (text, thinking, tool_start/delta/end, tool_result, result, error). La documentación completa del relay está en [chat.md](chat.md).

## Chat Store — `lib/chat-store.mjs`

Persistencia de conversaciones de chat como ficheros JSON individuales en `{userDataPath}/chats/`. Expone CRUD puro (`init`, `list`, `create`, `load`, `save`, `remove`) sin dependencia de Electron — recibe el directorio base en `init()` y opera con `node:fs` síncrono. La documentación completa del store está en [chat.md](chat.md).
