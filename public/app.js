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
import { initContextPane, toggleContextPane, openContextPane, isContextPaneVisible } from './js/ui/context-pane/context-pane.js'
import { initContextHost, setActiveFile, invalidateHistory, activateChatTab, getActiveTab } from './js/ui/context-pane/context-host.js'
import { initKeybindings } from './js/ui/keybindings.js'

const searchInput = document.getElementById('search-input')
const btnNewFile = document.getElementById('btn-new-file')

async function init () {
  treeStore.set(await api.getTree())

  const dv = initDockview({
    onActivePanelChange: (id) => setActiveFile(id),
  })

  function getEditorContext () {
    const active = dv.dockview?.activePanel
    const activeId = active?.id || null
    const activeState = activeId ? panelStore.get(activeId) : null
    const context = {}

    if (activeId && activeState?.editor) {
      context.activeFile = activeId
      try { context.fileContent = activeState.editor.getMarkdown() } catch { /* noop */ }
    }

    // Selected text — WYSIWYG (ProseMirror) or Markdown (CodeMirror 6)
    if (activeState?.editor) {
      try {
        let selected = ''
        const pmView = activeState.editor.wwEditor?.view
        if (pmView) {
          const { from, to } = pmView.state.selection
          if (from !== to) selected = pmView.state.doc.textBetween(from, to, '\n')
        }
        if (!selected) {
          const cmView = activeState.editor.mdEditor?.cm
          if (cmView) {
            const sel = cmView.state.selection.main
            if (!sel.empty) selected = cmView.state.sliceDoc(sel.from, sel.to)
          }
        }
        if (selected.trim()) context.selectedText = selected
      } catch { /* selection API may vary across editor versions */ }
    }

    // Open files with dirty status
    const openFiles = []
    for (const s of panelStore.values()) {
      openFiles.push({ path: s.path, isDirty: s.isDirty })
    }
    if (openFiles.length > 0) context.openFiles = openFiles

    return context
  }

  initContextHost({
    getContext: getEditorContext,
    onVersionSelect: (path, version) => {
      const active = dv.dockview?.activePanel
      if (!active || active.id !== path) return
      const renderer = panelStore.get(active.id)?.renderer
      if (!renderer) return
      if (version?.kind === 'current') {
        renderer.returnToEditor()
      } else {
        renderer.showDiffVersion(version)
      }
    },
  })

  initSidebar({ onLayoutChange: dv.layoutDockview })
  initContextPane({ onLayoutChange: dv.layoutDockview })

  configureTree({
    openFile: dv.openFile,
    getActivePanel: () => dv.dockview.activePanel,
  })

  renderTree(treeStore.get())
  refreshIcons()

  initKeybindings({ save: dv.saveActiveFile, toggleSidebar, toggleContextPane, toggleChat })

  dv.restoreLayoutOrLastFile()

  window.addEventListener('resize', dv.layoutDockview)

  connectSSE(onServerFileChange)
  connectMenuActions(buildMenuHandlers(dv))
  wireChatButton()
}

async function onServerFileChange (data) {
  treeStore.set(await api.getTree())
  if (!searchInput.value.trim()) refreshTree()
  for (const s of panelStore.values()) {
    if (!data.path.endsWith(s.path) || s.isDirty) continue
    if (!s.renderer.consumeJustSaved()) s.renderer.loadContent()
    invalidateHistory(s.path)
  }
}

function buildMenuHandlers (dv) {
  return {
    'new-file': () => btnNewFile?.click(),
    'toggle-sidebar': toggleSidebar,
    'toggle-context-pane': toggleContextPane,
    'toggle-chat': toggleChat,
    save: dv.saveActiveFile,
    'close-tab': dv.closeActivePanel,
  }
}

function toggleChat () {
  if (isContextPaneVisible() && getActiveTab() === 'chat') {
    toggleContextPane()
  } else {
    openContextPane()
    activateChatTab()
  }
}

function wireChatButton () {
  const btn = document.getElementById('btn-toggle-chat')
  if (btn) btn.addEventListener('click', toggleChat)
}

init().catch(console.error)
