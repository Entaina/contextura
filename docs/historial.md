# Historial

Este documento describe la implementación técnica del historial. La experiencia del usuario (timeline del pane contextual, diff visual, restauración, seguimiento de renames, cambios sin commitear, banners contextuales y anti-jerga-git) vive en [features/historial/](features/historial/index.md).

El historial se implementa en tres capas: un módulo backend que envuelve el CLI de git, un módulo de timeline en el pane derecho contextual que lista las versiones, y un visor de diff embebido en cada panel del editor que renderiza la versión seleccionada.

## Backend — `lib/git-history.mjs`

Envuelve el CLI de `git` vía `child_process.execFile` sin dependencias adicionales. Expone cuatro funciones, consumidas por los endpoints HTTP descritos en [backend.md](backend.md):

| Función | Qué hace |
|---|---|
| `getFileHistory(abs, root, {limit})` | `git log --follow` sobre un fichero concreto |
| `getFileAtRevision(abs, root, sha)` | `git show sha:path` |
| `getFileDiff(abs, root, sha, base='working')` | Diff unificado contra el working tree u otro sha |
| `getUncommittedStatus(abs, root)` | Detecta edits sin stagear / ficheros sin trackear para el fichero actual |

`getFileHistory` usa `--follow` para que git siga el fichero a través de renames y parsea los códigos de estado (`M`, `A`, `R100`, `C…`) para clasificar cada versión. El límite por defecto (50 versiones) es lo que materializa el banner "último commit del historial" en la UI.

## Frontend — timeline y visor de diff

El historial en el frontend vive partido en dos componentes con responsabilidades separadas:

**`HistoryModule`** ([public/js/ui/context-pane/history-module.js](../public/js/ui/context-pane/history-module.js)) renderiza el timeline compacto de versiones dentro del pane derecho contextual. Se acopla al fichero activo global (cambia cuando el usuario cambia de pestaña) y cachea el resultado de `/api/history` por path para evitar re-fetches al alternar entre ficheros. Cuando el usuario hace click en una versión, emite un callback con la versión y el contexto de la historia (lista completa, estado dirty, untracked) que `app.js` encamina al panel del editor activo.

**`DiffView`** ([public/js/ui/history/diff-view.js](../public/js/ui/history/diff-view.js)) es un componente embebible — **no** un panel de Dockview. Cada `EditorPanelRenderer` (ver [frontend.md](frontend.md)) crea el suyo bajo demanda la primera vez que se entra en modo diff. Esta estructura es lo que permite que el modo diff sea local al panel: dos pestañas pueden estar simultáneamente una en modo edición y otra en modo diff sin interferirse.

El renderer alterna entre modo editor y modo diff vía `_enterDiffMode()` / `_exitDiffMode()` añadiendo y retirando la clase `.mode-diff` en el root del panel. El editor sigue vivo en el DOM bajo `display:none`, y esa es la técnica concreta que preserva el estado de edición (incluido el estado sucio) entre ambos modos.

`DiffView.onAfterRestore` es el callback que el renderer padre usa para recargar el contenido del editor con una versión restaurada y salir automáticamente del modo diff, materializando el flujo de [features/historial/restauracion.md](features/historial/restauracion.md).

El render del diff combina `markdown-it` (para generar HTML a partir del markdown de cada versión) con `htmldiff-js` (para calcular las diferencias sobre el HTML ya renderizado). Esto es lo que permite que inserciones y borrados se presenten inline preservando el formato original — encabezados, listas y tablas aparecen con su estilo habitual dentro del diff, no como marcadores crudos.
