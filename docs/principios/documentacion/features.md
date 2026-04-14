# Principio de la capa de features

## Definición

La documentación de `docs/` está dividida en **dos capas** con dueño único, y cada capa es exclusiva del otro tipo de contenido:

- **Capa de features** (`docs/features/**`) — describe **qué** ve y puede hacer el usuario. Incluye flujos de interacción, atajos de teclado, invariantes de producto, persistencia observada desde el usuario y casos borde visibles.
- **Capa de arquitectura** (`docs/backend.md`, `docs/frontend.md`, `docs/electron.md`, `docs/historial.md`) — describe **cómo** está construido el producto. Incluye librerías, ficheros, funciones, patrones y decisiones técnicas.

[mece.md](mece.md) aplica dentro de cada capa y también entre capas: ningún fichero de una capa puede duplicar contenido propio de la otra.

## Por qué

Mezclar UX y arquitectura en un mismo fichero es el modo más común de violar MECE en `docs/`. Cuando conviven en el mismo documento:

- Cada cambio en la experiencia del usuario obliga a re-narrar también la implementación, y viceversa.
- Los lectores que buscan una respuesta ("¿qué hace el botón X?" vs "¿dónde está el handler?") tienen que escanear un fichero entero aunque solo una parte les interese.
- La divergencia es inevitable: el equipo de producto actualiza la descripción funcional mientras el equipo técnico refactoriza, y los dos lados del fichero se desincronizan.

Separar las dos capas asigna un dueño claro a cada tipo de contenido y mantiene los ficheros estables ante cambios del otro lado.

## Cómo aplicar

### Regla de atomicidad

Cada fichero de `docs/features/**` describe **una única capacidad user-visible coherente**. Si al escribirlo aparecen dos invariantes independientes, o dos flujos que el usuario percibe como separados, son dos features y deben vivir en ficheros distintos.

### Regla de agrupación en módulos

Las features que comparten dominio de producto viven bajo un módulo (`docs/features/<módulo>/`) con su propio `index.md`. Un módulo es un agrupador navegable, **no** un dueño de contenido: la información sigue viviendo en los ficheros atómicos. El `index.md` del módulo solo lista features con su criterio de "leer cuando…".

### Plantilla obligatoria

Todo fichero de feature atómica tiene estas secciones en este orden:

1. `## Qué hace` — 1-3 líneas desde el punto de vista del usuario.
2. `## Experiencia del usuario` — flujo de interacción, atajos, persistencia visible al usuario, casos borde observables.
3. `## Invariantes` — promesas no-negociables que la feature hace al usuario. Opcional si la feature no tiene invariantes fuertes.
4. `## Implementación` — enlace único a la capa de arquitectura. Nunca contenido técnico propio.

### Vocabulario prohibido en la capa de features

- Nombres de librerías concretas (`Dockview`, `Toast UI Editor`, `chokidar`, `htmldiff-js`, `markdown-it`, `electron-updater`).
- Nombres de funciones, clases o ficheros de código fuente (`EditorPanelRenderer`, `HistoryView`, `lib/scanner.mjs`).
- Términos de infraestructura (`localStorage`, `SSE`, `IPC`, `contextBridge`, `preload`).
- Referencias a herramientas externas que consumen `docs/` (ver [independencia-conocimiento.md](independencia-conocimiento.md)).

### Vocabulario prohibido en la capa de arquitectura

- Frases centradas en la experiencia: "el usuario ve", "el usuario pulsa", "atajo Cmd+…", "indicador animado".
- Invariantes de producto: las invariantes del usuario viven en la feature y se referencian por enlace desde la arquitectura cuando es necesario justificar una decisión técnica.

## Ejemplos

| Situación | Capa de features | Capa de arquitectura |
|---|---|---|
| Modo historial | "Al pulsar el reloj, el panel muestra la línea de tiempo del fichero. Los cambios sin guardar no se pierden al entrar ni al salir del modo historial." | "`EditorPanelRenderer` alterna la clase `.mode-history` en el root del panel; el editor permanece vivo con `display:none` para preservar su estado." |
| Dirty tracking | "Las pestañas con cambios sin guardar muestran un punto. Cerrar una pestaña sucia pide confirmación." | "`DirtyTabRenderer` compara el markdown tras un paso de normalización para evitar falsos positivos introducidos por la normalización del editor." |
| Live reload | "Si editas un fichero fuera de la app, la vista se actualiza sin recargar. Si tienes cambios sin guardar en ese fichero, la app no los sobrescribe." | "Un watcher basado en `chokidar` emite eventos SSE con debounce de 300 ms; el frontend consume `/sse` vía `EventSource`." |

## Ámbito de aplicación

Aplica a todo `docs/features/**` y a los ficheros de arquitectura enumerados. No aplica a:

- [docs/principios/](../index.md) — meta-documentación, no describe ni features ni arquitectura.
- [docs/producto.md](../../producto.md) — describe el *para qué* y el *para quién* del producto, no features concretas.
- [docs/desarrollo.md](../../desarrollo.md), [docs/release.md](../../release.md), [docs/design-system.md](../../design-system.md) — operativa y setup, no son ni features ni arquitectura técnica del código.
