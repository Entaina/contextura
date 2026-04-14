# Historial

El historial de versiones inline es la feature distintiva de Contextura. Se implementa en dos capas: un módulo backend que envuelve el CLI de git, y una vista frontend embebida dentro del propio panel del editor.

## Backend — `lib/git-history.mjs`

Envuelve el CLI de `git` vía `child_process.execFile` sin dependencias adicionales. Expone cuatro funciones, consumidas por los endpoints HTTP descritos en [backend.md](backend.md):

| Función | Qué hace |
|---|---|
| `getFileHistory(abs, root, {limit})` | `git log --follow` sobre un fichero concreto |
| `getFileAtRevision(abs, root, sha)` | `git show sha:path` |
| `getFileDiff(abs, root, sha, base='working')` | Diff unificado contra el working tree u otro sha |
| `getUncommittedStatus(abs, root)` | Detecta edits sin stagear / ficheros sin trackear para el fichero actual |

## Frontend — `HistoryView` inline

`HistoryView`, definido en [public/app.js](../public/app.js), es un componente embebible — **no** un panel de Dockview. Cada `EditorPanelRenderer` (ver [frontend.md](frontend.md)) es dueño de su propio `HistoryView` y lo monta dentro del mismo panel en el que vive el editor.

### Modo historial

El renderer alterna entre el modo editor y el modo historial vía `_enterHistoryMode()` / `_exitHistoryMode()`:

- Al entrar en modo historial, el renderer añade la clase `.mode-history` al root del panel. CSS oculta el editor con `display:none` y muestra el `HistoryView` en su lugar.
- La cabecera del pane cambia a `Historial: <archivo>`. El botón reloj y el botón Guardar se ocultan. Aparece el botón `← Volver al editor`.
- Las ediciones sin guardar del editor **se preservan**: el editor sigue vivo en el DOM, solo está oculto. Al volver del modo historial, todo el estado dirty sigue exactamente como estaba.

Esto tiene una consecuencia importante: el modo historial es local al panel. Dos pestañas abiertas en distintos ficheros pueden estar una en modo editor y otra en modo historial al mismo tiempo sin interferir.

### Layout del `HistoryView`

- **Timeline (izquierda)** — lista las versiones ordenadas.
- **Diff (derecha)** — diff inline al estilo Google Docs, renderizado con `markdown-it` + `htmldiff-js` para comparar HTML renderizado en lugar de markdown plano.

### UX anti-jerga-git

La vista está construida deliberadamente para no exponer terminología de git al usuario final: muestra fechas relativas, nombre de pila del autor y el asunto del commit. Nunca hashes, nunca la palabra "commit", nunca "SHA". Para quien nunca ha usado git la vista es indistinguible del historial de Google Docs.

### Flujo de restauración

El botón "Restaurar esta versión" llama al callback `HistoryView.onAfterRestore`. El `EditorPanelRenderer` padre usa ese callback para:

1. Recargar el contenido del editor con la versión restaurada.
2. Salir automáticamente del modo historial (`_exitHistoryMode()`).

El resultado es que el usuario pulsa "Restaurar", ve el texto restaurado en el editor, y puede seguir editando desde ahí sin fricción.
