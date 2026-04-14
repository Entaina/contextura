# Frontend

Todo el frontend vive en un único fichero JS de ~1700 líneas: [public/app.js](../public/app.js). Es un módulo JS de vainilla, sin framework ni paso de build. Para el porqué de esa decisión, ver [principios/producto/vanilla-zero-build.md](principios/producto/vanilla-zero-build.md).

Este documento describe cómo está construido el frontend. Las features que resultan de esta implementación — pestañas y splits, editor WYSIWYG, dirty tracking, arrastre desde el árbol, creación inline de ficheros, persistencia del layout, búsqueda, plegado de la barra lateral, modo historial, etc. — están catalogadas por módulos en [features/](features/index.md).

## Stack

- **DockviewComponent** — layout tabulado con paneles arrastrables y splits horizontales/verticales. Es el sustrato de las pestañas y splits del área de edición.
- **Toast UI Editor** — edición WYSIWYG de markdown dentro de cada panel. Soporta los dos modos (WYSIWYG y markdown) y la barra de herramientas.

Ambas librerías se cargan como módulos ES directamente desde `node_modules` sin transpilación.

## Renderers personalizados

`app.js` define varios renderers que Dockview instancia bajo demanda:

- **`EditorPanelRenderer`** — panel de contenido que contiene el editor, gestiona el estado de guardado/sucio y alberga el `DiffView` cuando el usuario selecciona una versión en el timeline del pane contextual derecho. Ver [historial.md](historial.md).
- **`DirtyTabRenderer`** — pestaña con indicador de sucio y botón de cerrar. Intercepta el cierre para aplicar el flujo de confirmación cuando hay cambios sin guardar.
- **`WelcomeWatermark`** — watermark mostrado cuando no hay ningún fichero abierto.

## Detección de cambios sin guardar

`DirtyTabRenderer` compara el markdown actual con el contenido original del fichero **tras un paso de normalización** — así cambios cosméticos introducidos por Toast UI (normalización de espacios, comillas, etc.) no marcan falsos positivos. Esta normalización es lo que hace posible la invariante descrita en [features/guardado/dirty-tracking.md](features/guardado/dirty-tracking.md).

## Persistencia en `localStorage`

El estado no-crítico del frontend se persiste en `localStorage` bajo el namespace `contextura:*`:

- `contextura:layout` — configuración serializada de Dockview (paneles abiertos, splits, tamaños).
- Anchura de la barra lateral.
- Visibilidad de la barra lateral.
- Último fichero abierto en la sesión.
- Modo de editor por fichero (WYSIWYG vs. markdown raw).

Estas claves existen en paralelo a la configuración persistida por el proceso main en el fichero de Application Support (carpeta raíz y geometría de ventana), descrita en [electron.md](electron.md). Son persistencias separadas por propósito: borrar una no afecta a la otra.

## Drag-and-drop

El arrastre de nodos del árbol a los paneles usa el MIME type `application/x-contextura-path`. El string del MIME type es deliberadamente único para que el handler del panel no tenga que adivinar si un drop viene de dentro de la app o de fuera.

## Creación de ficheros inline

Al crear un fichero o carpeta desde el árbol, la UI inserta un input inline estilo VS Code en lugar de abrir un modal, y confirma al pulsar Enter o al perder el foco. La implementación vive en las utilidades del renderer del árbol en `app.js`.

## Comunicación con el puente Electron

Cuando la app corre dentro de Electron, el frontend habla con el proceso main vía `window.electronAPI`, expuesto por [electron/preload.cjs](../electron/preload.cjs). Los detalles de ese bridge (qué funciones expone, qué acciones del menú escucha) están en [electron.md](electron.md).
