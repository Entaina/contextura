# Chat

Este documento describe la implementación técnica del chat integrado. La experiencia del usuario — conversaciones, opciones de modelo/esfuerzo/modo, comandos rápidos y la estructura del pane contextual con pestañas — vive en [features/chat/](features/chat/index.md).

El chat se implementa en tres capas: un relay de subproceso que envuelve el CLI de Claude, un almacén de conversaciones en disco, y un conjunto de componentes de UI en el pane contextual derecho. El servidor HTTP ([server.mjs](../server.mjs), descrito en [backend.md](backend.md)) expone los endpoints que conectan estas capas.

## Backend — `lib/chat-relay.mjs`

Gestiona subprocesos `claude -p` para el chat. En lugar de llamar a la API de Anthropic directamente, lanza el CLI de Claude Code como child process con `--output-format stream-json`. Esto permite usar la suscripción Pro/Max del usuario sin necesidad de API key. Si `ANTHROPIC_API_KEY` existe en el entorno, el CLI la prefiere y factura por API — el módulo detecta esto para avisar al usuario.

### Resolución del binario

Electron lanzado desde el Finder no hereda el PATH del shell, así que `resolveClaudeBinary()` busca en orden:

1. `which claude` con el PATH actual.
2. Ubicaciones conocidas en macOS: `/usr/local/bin/claude`, `~/.claude/local/claude`, `~/.npm-global/bin/claude`.
3. Fallback al login shell: `zsh -lc 'which claude'`.

El resultado se cachea en memoria para evitar búsquedas repetidas.

### `getStatus()`

Devuelve `{ available, authenticated, hasApiKey }`. Verifica si el binario está disponible, si el usuario está autenticado (ejecuta `claude auth status`) y si hay una `ANTHROPIC_API_KEY` en el entorno. Este estado alimenta el endpoint `GET /api/chat/status` descrito en [backend.md](backend.md).

### `ChatSession` (EventEmitter)

Clase central que gestiona el ciclo de vida de un subproceso `claude -p`. Se crea vía `createSession()` con los parámetros:

- `rootPath` — directorio de trabajo del subproceso (carpeta raíz del proyecto).
- `message` — mensaje del usuario.
- `context` — contexto del editor para `--append-system-prompt`.
- `sessionId` — (opcional) reanuda una sesión existente con `--resume`.
- `model`, `effort`, `permissionMode` — (opcionales) sobrescriben los defaults del CLI.

El subproceso se lanza con los flags `--output-format stream-json --verbose --include-partial-messages` y, opcionalmente, `--model`, `--effort`, `--permission-mode`, `--append-system-prompt` y `--resume`.

**Eventos emitidos:**

| Evento | Payload | Cuándo |
|---|---|---|
| `text` | `string` | Token parcial de texto |
| `thinking` | `string` | Token parcial de pensamiento |
| `tool_start` | `{ name, toolUseId }` | Inicio de invocación de herramienta |
| `tool_delta` | `{ toolUseId, json }` | JSON acumulado del input de herramienta |
| `tool_end` | `{ toolUseId }` | Fin del bloque de herramienta |
| `tool_result` | `{ toolUseId, content }` | Resultado de la ejecución de herramienta |
| `result` | `{ sessionId, text }` | Resultado final (incluye el `sessionId` para reanudación) |
| `error` | `Error` | Error fatal |
| `close` | `code` | El proceso ha terminado |

El parseo del stdout funciona línea a línea: cada línea es un objeto JSON del formato `stream-json` del CLI. Un buffer interno retiene líneas incompletas. Los content blocks activos (thinking, tool_use, text) se rastrean por índice en un `Map` para acumular deltas parciales.

### `buildSystemPrompt(context)`

Construye el system prompt que se inyecta vía `--append-system-prompt` a partir del contexto del editor:

- Rol fijo ("assistant integrated into Contextura").
- Fichero activo (path).
- Contenido del fichero (truncado a 50 KB).
- Texto seleccionado.
- Lista de ficheros abiertos con estado sucio.
- Estado de git.

### Cancelación y destrucción

- `cancel()` envía SIGINT al subproceso, que interrumpe la respuesta en curso.
- `destroy()` envía SIGTERM y, si no ha terminado en 2 s, SIGKILL.

## Backend — `lib/chat-store.mjs`

Persistencia de conversaciones como ficheros JSON individuales en el directorio de datos de la app. El módulo expone CRUD puro sin dependencia de Electron — recibe el `basePath` en `init()` y usa `node:fs` síncrono.

### Inicialización

`init(userDataPath)` recibe el directorio de datos de Electron (típicamente `~/Library/Application Support/Contextura`), crea el subdirectorio `chats/` si no existe, y lo usa como raíz para todas las operaciones.

### Esquema de una conversación

```json
{
  "id": "uuid",
  "sessionId": "claude-session-id-or-null",
  "title": "string",
  "createdAt": "ISO-8601",
  "updatedAt": "ISO-8601",
  "messages": [{ "role": "user|assistant", "content": "string" }]
}
```

`sessionId` mapea al `session_id` del CLI de Claude para reanudar conversaciones con `--resume`. Los mensajes se almacenan como copia local para renderizar sin relanzar el subproceso.

### Operaciones

| Función | Qué hace |
|---|---|
| `init(userDataPath)` | Inicializa el store con el directorio base |
| `list()` | Lista metadata de todas las conversaciones, ordenadas por `updatedAt` DESC |
| `create(title?)` | Crea una conversación con UUID y la persiste |
| `load(id)` | Carga una conversación completa con mensajes |
| `save(conversation)` | Sobrescribe una conversación existente (actualiza `updatedAt`) |
| `remove(id)` | Elimina el fichero de conversación |

La validación de `id` contra path traversal usa una regex `[\w-]+` para prevenir accesos fuera del directorio de chats.

## Backend — Endpoints HTTP

Los endpoints del chat viven en [server.mjs](../server.mjs) junto al resto de endpoints descritos en [backend.md](backend.md). Aquí se describe su comportamiento en detalle:

| Método | Ruta | Descripción |
|---|---|---|
| GET | `/api/chat/status` | Estado del CLI: `{ available, authenticated, hasApiKey }` |
| POST | `/api/chat` | Streaming SSE del chat (ver abajo) |
| POST | `/api/chat/cancel` | Cancela una respuesta activa por `sessionId` |
| GET | `/api/chat/commands` | Lista slash commands del proyecto, usuario, skills y plugins |
| GET | `/api/chat/conversations` | Lista conversaciones (metadata) |
| POST | `/api/chat/conversations` | Crea una conversación |
| GET | `/api/chat/conversations/:id` | Carga una conversación con mensajes |
| PUT | `/api/chat/conversations/:id` | Guarda/actualiza una conversación |
| DELETE | `/api/chat/conversations/:id` | Elimina una conversación |

### `POST /api/chat` — Streaming

Acepta `{ message, sessionId?, context, model, effort, permissionMode }`. Crea una `ChatSession` y retransmite sus eventos como Server-Sent Events:

- Cada evento es una línea `data: <json>\n\n` con campos como `{ text }`, `{ thinking }`, `{ toolStart }`, `{ toolDelta }`, `{ toolEnd }`, `{ toolResult }`, `{ sessionId, result }` o `{ error }`.
- El sentinel `data: [DONE]` marca el fin del stream.
- Las sesiones activas se rastrean en un `Map` para soportar la cancelación.
- Si el cliente desconecta, se invoca `cancel()` en la sesión.

### `GET /api/chat/commands` — Slash commands

`scanAllCommands(rootPath)` busca comandos y skills en cuatro ubicaciones:

1. Comandos del proyecto: `<rootPath>/.claude/commands/`
2. Comandos del usuario: `~/.claude/commands/`
3. Skills del usuario: `~/.claude/skills/*/SKILL.md`
4. Plugins instalados: comandos y skills de cada plugin declarado en `~/.claude/plugins/installed_plugins.json`

Devuelve `[{ name, description, argumentHint?, source, plugin? }]` ordenados alfabéticamente.

## Frontend — `public/js/ui/chat/chat-view.js`

Componente central de la interfaz de chat. Construye el DOM completo: barra superior (título, botón de historial, botón de nueva conversación), lista de mensajes con scroll, y zona de input (textarea auto-redimensionable + botón enviar/parar).

### Flujo de envío

1. `_send()` añade el mensaje a la lista, crea un mensaje de streaming vía `message-renderer.js`, y lanza `api.streamChat()` con el payload.
2. Los chunks SSE se consumen en un bucle async: cada chunk alimenta el mensaje de streaming (`appendText`, `appendThinking`, `startTool`, etc.).
3. Al recibir el `result`, se finaliza el mensaje, se captura el `sessionId` del CLI, y se lanza el auto-guardado.
4. Un `AbortController` permite cancelar la petición fetch en curso.

### Sesiones y persistencia

La distinción clave es entre dos IDs:

- **`conversationId`** — UUID local generado por `chat-store`, identifica la conversación en disco.
- **`sessionId`** — ID devuelto por el CLI de Claude, necesario para `--resume`.

Ambos se almacenan en la conversación guardada. `restoreLastConversation()` lee el `activeConversationId` de `storage.js` al inicializar y carga la conversación correspondiente.

El auto-guardado se serializa para evitar escrituras concurrentes: cada guardado espera a que el anterior termine antes de ejecutarse.

### Historial de conversaciones

Un dropdown en la barra superior lista las conversaciones guardadas (cargadas vía `api.listConversations()`). Seleccionar una conversación la carga con todos sus mensajes. Cada entrada tiene un botón de eliminar.

### Derivación del título

El título se genera automáticamente a partir del primer mensaje del usuario (truncado a 60 caracteres).

## Frontend — `public/js/ui/chat/chat-options.js`

Barra de controles compactos (pills) debajo del campo de entrada:

- **Model**: sonnet | opus | haiku
- **Effort**: low | medium | high | max
- **Mode**: default (ask) | acceptEdits (auto-edit) | bypassPermissions | plan

Cada pill es un dropdown creado por `createPillSelector()`: botón + lista desplegable con detección de click-outside para cerrar. Además incluye un botón `/` que abre el popup de slash commands.

Los valores seleccionados se persisten vía `storage.js` (`chatModel`, `chatEffort`, `chatMode`) y se inyectan en cada petición al servidor. Un callback `onChange` notifica a `ChatView` cuando cambian.

## Frontend — `public/js/ui/chat/message-renderer.js`

Renderiza mensajes completados y en streaming con markdown.

### Mensajes completados

`renderMessage(msg)` crea un div con clase `.chat-message--user` o `.chat-message--assistant`. Los mensajes del asistente se renderizan con `markdown-it`.

### Mensajes en streaming

`createStreamingMessage()` devuelve un objeto mutable con métodos para construir el mensaje incrementalmente:

- `appendText(text)` — acumula texto y re-renderiza markdown con debounce de 80 ms.
- `appendThinking(text)` — bloque colapsable `<details open>` que se colapsa al terminar.
- `startTool({ name, toolUseId })` — bloque colapsable `<details>` con icono y nombre.
- `appendToolDelta({ json })` — muestra el JSON formateado del input de la herramienta.
- `endTool()` / `setToolResult({ content })` — cierra el bloque de herramienta con el resultado (truncado a 2000 caracteres).
- `finish()` — finaliza el mensaje, colapsa los bloques de thinking.
- `getContent()` — devuelve el texto acumulado para persistencia.

Los bloques de herramienta se posicionan antes del bloque de texto para mantener un orden lógico.

## Frontend — `public/js/ui/chat/slash-commands.js`

Registro de comandos y popup de autocompletado.

### Comandos built-in

| Comando | Efecto |
|---|---|
| `/model <nombre>` | Cambia el modelo (ejecuta localmente) |
| `/effort <nivel>` | Cambia el nivel de esfuerzo (ejecuta localmente) |
| `/mode <modo>` | Cambia el modo de permisos (ejecuta localmente) |
| `/clear` | Inicia nueva conversación (ejecuta localmente) |
| `/compact` | Compacta la conversación (se envía al CLI como passthrough) |
| `/help` | Muestra comandos disponibles (se envía al CLI como passthrough) |

### Comandos externos

Cargados del servidor vía `api.listCommands()`, agrupados por origen:

- Proyecto (`<rootPath>/.claude/commands/`)
- Usuario (`~/.claude/commands/`)
- Skills (`~/.claude/skills/*/SKILL.md`)
- Plugins (de `installed_plugins.json`)

### Popup de autocompletado

Se activa cuando `/` es el primer carácter del textarea. Filtra por prefijo con cada keystroke. Las teclas de flecha navegan la lista, Enter selecciona, Escape cierra, Tab autocompleta el nombre. Las secciones se organizan por origen (builtin → project → user → skill → plugin).

## Frontend — Context pane

### `public/js/ui/context-pane/context-host.js`

Gestiona las pestañas y los slots de módulo del pane contextual derecho. Crea dos botones de pestaña (Historial con icono de reloj, Chat con icono de bocadillo) y dos contenedores de módulo, alternados vía clase `.active`.

Los módulos se crean de forma lazy la primera vez que su pestaña se activa. El routing de fichero activo actualiza el módulo de historial incluso cuando la pestaña visible es la de chat, para que al volver al historial se muestre el fichero correcto de inmediato.

Exporta `activateChatTab()` para que la acción `toggle-chat` del menú nativo (ver [electron.md](electron.md)) pueda activar la pestaña de chat desde fuera.

### `public/js/ui/context-pane/context-pane.js`

Controla el pane lateral derecho (toggle y redimensionado). El ancho se persiste en `storage.contextPaneWidth` (default 320 px, mínimo 220 px, máximo 50 % del viewport). La visibilidad se persiste en `storage.contextPaneVisible`. El drag handle permite redimensionar en vivo, y el toggle colapsa el pane ocultando el handle. Tras cambiar la geometría, re-layout de Dockview con un retardo de 200 ms.

## Frontend — Módulos compartidos

### `public/js/api.js`

Cliente HTTP para todos los endpoints `/api/*` del backend. Centraliza la construcción de URLs, la codificación de query params y los headers de content-type. La sección de chat expone:

- `streamChat(payload, { signal })` — generador async que consume el stream SSE del `POST /api/chat` y yield-ea los chunks parseados.
- `cancelChat(sessionId)` — envía `POST /api/chat/cancel`.
- `listCommands()` — llama a `GET /api/chat/commands`.
- CRUD de conversaciones: `listConversations()`, `createConversation(title)`, `loadConversation(id)`, `saveConversation(id, data)`, `deleteConversation(id)`.

### `public/js/storage.js`

Adaptador tipado sobre `localStorage` para claves bajo el namespace `contextura:*`. Todo lo que el frontend persiste client-side pasa por este módulo para que los nombres de clave vivan en un solo sitio. Las claves relacionadas con el chat son:

| Clave | Default | Propósito |
|---|---|---|
| `contextura:active-conversation-id` | `null` | Conversación activa en el panel de chat |
| `contextura:chat-model` | `'sonnet'` | Modelo seleccionado |
| `contextura:chat-effort` | `'high'` | Nivel de esfuerzo |
| `contextura:chat-mode` | `'default'` | Modo de permisos |
| `contextura:context-pane-tab` | `'history'` | Pestaña activa del pane contextual |
| `contextura:context-pane-width` | `null` (320 px) | Ancho del pane contextual |
| `contextura:context-pane-visible` | `true` | Visibilidad del pane contextual |

Este módulo también gestiona claves pre-existentes no relacionadas con el chat (`layout`, `last`, `sidebar-width`, `sidebar-visible`, `edit-mode:*`), descritas en [frontend.md](frontend.md).

## Tests E2E — `test/e2e/chat-panel.spec.mjs`

8 tests con Playwright que verifican la integración del chat:

1. Botón de chat visible en la barra de título.
2. Click en el botón abre la pestaña de chat en el pane contextual.
3. El panel de chat tiene textarea + botón de enviar.
4. `GET /api/chat/status` devuelve `{ available, authenticated, hasApiKey }`.
5. Input habilitado cuando el CLI está disponible.
6. Doble click en el botón alterna el colapso del pane contextual.
7. El chat coexiste con el panel del editor (instancia única de ChatView).
8. CRUD de conversaciones funciona vía API.

Los tests arrancan el servidor HTTP directamente (sin Electron), crean un vault temporal y un `userDataPath` temporal, y esperan a que el árbol de ficheros se renderice antes de ejecutar los tests.
