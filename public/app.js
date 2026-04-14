/**
 * Contextura — Frontend boot.
 *
 * Wires the modular UI layers together:
 * - state stores: tree, panel, selection
 * - services: api, storage, sse-client, electron-bridge
 * - UI: dockview (setup + renderers), tree, sidebar, keybindings
 *
 * Every module lives under public/js/**; see docs/frontend.md for the
 * architectural overview. This file does not own any rendering or state
 * — it only composes.
 */

import * as api from './js/api.js'
import { refreshIcons } from './js/infra/dom.js'
import { treeStore } from './js/state/tree-store.js'
import { panelStore } from './js/state/panel-store.js'
import { connectSSE } from './js/sse-client.js'
import { connectMenuActions } from './js/electron-bridge.js'
import { initDockview } from './js/ui/dockview/dockview-setup.js'
import {
  configureTree,
  renderTree,
  refreshTree,
} from './js/ui/tree.js'
import { initSidebar, toggleSidebar } from './js/ui/sidebar.js'
import { initContextPane, toggleContextPane } from './js/ui/context-pane/context-pane.js'
import { initKeybindings } from './js/ui/keybindings.js'

const searchInput = document.getElementById('search-input')
const btnNewFile = document.getElementById('btn-new-file')

async function init () {
  treeStore.set(await api.getTree())

  const dv = initDockview()

  initSidebar({ onLayoutChange: dv.layoutDockview })
  initContextPane({ onLayoutChange: dv.layoutDockview })

  configureTree({
    openFile: dv.openFile,
    getActivePanel: () => dv.dockview.activePanel,
  })

  renderTree(treeStore.get())
  refreshIcons()

  initKeybindings({ save: dv.saveActiveFile, toggleSidebar, toggleContextPane })

  dv.restoreLayoutOrLastFile()

  window.addEventListener('resize', dv.layoutDockview)

  connectSSE(onServerFileChange)
  connectMenuActions(buildMenuHandlers(dv))
}

async function onServerFileChange (data) {
  treeStore.set(await api.getTree())
  if (!searchInput.value.trim()) refreshTree()
  for (const s of panelStore.values()) {
    if (!data.path.endsWith(s.path) || s.isDirty) continue
    if (!s.renderer.consumeJustSaved()) s.renderer.loadContent()
    s.renderer.invalidateHistory()
  }
}

function buildMenuHandlers (dv) {
  return {
    'new-file': () => btnNewFile?.click(),
    'toggle-sidebar': toggleSidebar,
    'toggle-context-pane': toggleContextPane,
    save: dv.saveActiveFile,
    'close-tab': dv.closeActivePanel,
    'toggle-history': () => {
      const active = dv.dockview?.activePanel
      if (!active) return
      panelStore.get(active.id)?.renderer?.toggleHistory()
    },
  }
}

init().catch(console.error)
