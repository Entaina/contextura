# Historial

Este documento describe la implementación técnica del historial. La experiencia del usuario (modo historial, línea de tiempo, diff visual, restauración, seguimiento de renames, cambios sin commitear, banners contextuales y anti-jerga-git) vive en [features/historial/](features/historial/index.md).

El historial se implementa en dos capas: un módulo backend que envuelve el CLI de git, y una vista frontend embebida dentro del propio panel del editor.

## Backend — `lib/git-history.mjs`

Envuelve el CLI de `git` vía `child_process.execFile` sin dependencias adicionales. Expone cuatro funciones, consumidas por los endpoints HTTP descritos en [backend.md](backend.md):

| Función | Qué hace |
|---|---|
| `getFileHistory(abs, root, {limit})` | `git log --follow` sobre un fichero concreto |
| `getFileAtRevision(abs, root, sha)` | `git show sha:path` |
| `getFileDiff(abs, root, sha, base='working')` | Diff unificado contra el working tree u otro sha |
| `getUncommittedStatus(abs, root)` | Detecta edits sin stagear / ficheros sin trackear para el fichero actual |

`getFileHistory` usa `--follow` para que git siga el fichero a través de renames y parsea los códigos de estado (`M`, `A`, `R100`, `C…`) para clasificar cada versión. El límite por defecto (50 versiones) es lo que materializa el banner "último commit del historial" en la UI.

## Frontend — `HistoryView` inline

`HistoryView`, definido en [public/app.js](../public/app.js), es un componente embebible — **no** un panel de Dockview. Cada `EditorPanelRenderer` (ver [frontend.md](frontend.md)) es dueño de su propio `HistoryView` y lo monta dentro del mismo panel en el que vive el editor. Esta estructura es lo que permite que el modo historial sea local al panel: dos pestañas pueden estar simultáneamente una en modo edición y otra en modo historial sin interferirse.

El renderer alterna entre el modo editor y el modo historial vía `_enterHistoryMode()` / `_exitHistoryMode()` añadiendo y retirando la clase `.mode-history` en el root del panel. El editor sigue vivo en el DOM bajo `display:none`, y esa es la técnica concreta que preserva el estado de edición (incluido el estado sucio) entre ambos modos.

`HistoryView.onAfterRestore` es el callback que el renderer padre usa para recargar el contenido del editor con una versión restaurada y salir automáticamente del modo historial, materializando el flujo de [features/historial/restauracion.md](features/historial/restauracion.md).

El render del diff combina `markdown-it` (para generar HTML a partir del markdown de cada versión) con `htmldiff-js` (para calcular las diferencias sobre el HTML ya renderizado). Esto es lo que permite que inserciones y borrados se presenten inline preservando el formato original — encabezados, listas y tablas aparecen con su estilo habitual dentro del diff, no como marcadores crudos.
