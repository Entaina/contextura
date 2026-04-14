# Frontend

Todo el frontend vive en un único fichero JS de ~1700 líneas: [public/app.js](../public/app.js). Es un módulo JS de vainilla, sin framework ni paso de build. Para el porqué de esa decisión, ver [principios/producto/vanilla-zero-build.md](principios/producto/vanilla-zero-build.md).

## Stack

- **DockviewComponent** — layout tabulado con paneles arrastrables y splits horizontales/verticales.
- **Toast UI Editor** — edición WYSIWYG de markdown dentro de cada panel.

Ambas librerías se cargan como módulos ES directamente desde `node_modules` sin transpilación.

## Renderers personalizados

`app.js` define varios renderers que Dockview instancia bajo demanda:

- **`EditorPanelRenderer`** — panel de contenido que contiene el editor, gestiona el estado de guardado/sucio y alberga el `HistoryView` inline cuando el usuario entra en modo historial.
- **`DirtyTabRenderer`** — pestaña con indicador de sucio y botón de cerrar.
- **`WelcomeWatermark`** — watermark mostrado cuando no hay ningún fichero abierto.

El modo historial y su interacción con `EditorPanelRenderer` se documentan en [historial.md](historial.md).

## Dirty tracking

Para saber si una pestaña tiene cambios sin guardar, el editor compara el markdown actual con el contenido original del fichero **tras una paso de normalización** — así cambios cosméticos introducidos por Toast UI (normalización de espacios, comillas, etc.) no marcan falsos positivos de sucio.

## Persistencia en localStorage

El estado no-crítico se persiste en `localStorage` bajo el namespace `contextura:*`:

- `contextura:layout` — la configuración serializada de Dockview (paneles abiertos, splits, tamaños).
- Anchura de la sidebar.
- Último fichero abierto.
- Modo de editor por fichero (WYSIWYG vs. markdown raw).

La serialización/restauración del layout de Dockview es lo que permite que la app recuerde exactamente qué tenías abierto y cómo lo tenías organizado al cerrar.

## Drag-and-drop

El arrastre de nodos del árbol a los paneles usa el MIME type `application/x-contextura-path`. El string del MIME type es deliberadamente único para que el handler del panel no tenga que adivinar si un drop viene de dentro de la app o de fuera.

## Inline creation

Al crear un fichero o carpeta desde el árbol, la UI inserta un input inline estilo VS Code en lugar de abrir un modal. Es una micro-decisión de UX que mantiene el foco sin interrumpir la navegación.

## Comunicación con el puente Electron

Cuando la app corre dentro de Electron, el frontend habla con el proceso main vía `window.electronAPI`, expuesto por [electron/preload.cjs](../electron/preload.cjs). Los detalles de ese bridge (qué funciones expone, qué acciones del menú escucha) están en [electron.md](electron.md).
