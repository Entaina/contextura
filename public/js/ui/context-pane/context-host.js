/**
 * Context pane host: owns the single contextual slot inside the right pane
 * and routes active-file changes to the active module. Today there is one
 * module (history); the host exists so future modules (references, metadata,
 * backlinks…) can slot in without rewiring the pane.
 */

import { HistoryModule } from './history-module.js'
import { panelStore } from '../../state/panel-store.js'

const bodyEl = document.getElementById('context-pane-body')

let historyModule = null
let currentPath = null
let onVersionSelectRef = () => {}

/**
 * @param {Object} deps
 * @param {(path: string, version: object) => void} deps.onVersionSelect
 *   Called when the user clicks an entry in the history timeline. The
 *   host module (app.js) forwards this to the active editor panel.
 */
export function initContextHost ({ onVersionSelect }) {
  onVersionSelectRef = onVersionSelect || (() => {})
}

/**
 * @param {string | null} path Active file path, or null when no file is active.
 */
export function setActiveFile (path) {
  if (path === currentPath) return
  currentPath = path

  if (!path) {
    renderEmpty()
    return
  }

  if (!historyModule) {
    historyModule = new HistoryModule({
      onVersionSelect: (v) => onVersionSelectRef(currentPath, v),
      isEditorDirty: (p) => !!panelStore.get(p)?.isDirty,
    })
  }

  bodyEl.innerHTML = ''
  bodyEl.appendChild(historyModule.element)
  historyModule.setPath(path)
  historyModule.load()
}

/**
 * Drop any cached history for a path — called from the SSE watcher when the
 * file changes on disk. If the invalidated path is the active one, also
 * reloads immediately so the timeline stays current.
 */
export function invalidateHistory (path) {
  if (!historyModule) return
  historyModule.invalidate(path)
  if (path === currentPath) historyModule.load()
}

/**
 * Re-render the history timeline without refetching. Called by editor panels
 * when the editor dirty flag transitions so HEAD absorption and the
 * "Versión actual" subtitle stay in sync with in-memory edits.
 */
export function notifyEditorDirtyChanged (path) {
  if (!historyModule || path !== currentPath) return
  historyModule.refresh()
}

function renderEmpty () {
  bodyEl.innerHTML = '<div class="context-empty">Selecciona un fichero</div>'
}
