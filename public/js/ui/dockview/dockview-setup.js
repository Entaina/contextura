/**
 * Dockview bootstrap. Creates the DockviewComponent, registers component
 * factories (editor panel, dirty tab, welcome watermark), wires the
 * drag-and-drop flow from the sidebar tree, connects the layout store, and
 * returns the handles the host module needs.
 */

import { DockviewComponent } from 'https://esm.sh/dockview-core@5'

import * as storage from '../../storage.js'
import { panelStore } from '../../state/panel-store.js'
import { selectionStore } from '../../state/selection-store.js'
import { basename } from '../../domain/path.js'
import { EditorPanelRenderer } from './editor-panel.js'
import { DirtyTabRenderer } from './dirty-tab.js'
import { WelcomeWatermark } from './welcome.js'
import { createLayoutStore } from './layout-store.js'
import { markActive, revealPath, clearActive, DRAG_MIME } from '../tree.js'

function buildEditorPanelOpts (path) {
  return {
    id: path,
    component: 'editor',
    tabComponent: 'dirty-tab',
    title: basename(path),
    params: { path },
  }
}

/**
 * @returns {{
 *   dockview: import('https://esm.sh/dockview-core@5').DockviewComponent,
 *   openFile: (path: string, event?: MouseEvent) => Promise<void>,
 *   saveActiveFile: () => void,
 *   layoutDockview: () => void,
 *   restoreLayoutOrLastFile: () => void,
 * }}
 */
export function initDockview () {
  const dockviewContainer = document.getElementById('dockview-container')

  const dockview = new DockviewComponent(dockviewContainer, {
    createComponent: (options) => {
      if (options.name === 'editor') return new EditorPanelRenderer()
      return { element: document.createElement('div'), init () {}, dispose () {} }
    },
    createTabComponent: () => new DirtyTabRenderer(),
    createWatermarkComponent: () => new WelcomeWatermark(),
  })

  function layoutDockview () {
    const w = dockviewContainer.offsetWidth
    const h = dockviewContainer.offsetHeight
    if (w > 0 && h > 0) dockview.layout(w, h)
  }

  const layoutStore = createLayoutStore({ dockview, layoutDockview })

  dockview.onDidActivePanelChange((e) => {
    if (!e?.id) return
    markActive(e.id)
    revealPath(e.id)
    storage.lastFile.set(e.id)
  })

  dockview.onDidRemovePanel(() => {
    layoutStore.schedule()
    if (!dockview.activePanel) clearActive()
  })
  dockview.onDidAddPanel(() => layoutStore.schedule())
  dockview.onDidLayoutChange(() => layoutStore.schedule())

  dockview.onUnhandledDragOverEvent((event) => {
    if (event.nativeEvent.dataTransfer?.types?.includes(DRAG_MIME)) {
      event.accept()
    }
  })

  function markPanelOpened (path) {
    markActive(path)
    revealPath(path)
    storage.lastFile.set(path)
  }

  dockview.onDidDrop((event) => {
    const path = event.nativeEvent.dataTransfer?.getData(DRAG_MIME)
    if (!path) return

    const existing = dockview.panels.find(p => p.id === path)
    if (existing) { existing.api.setActive(); return }

    const dirMap = { top: 'above', bottom: 'below', left: 'left', right: 'right' }
    const opts = buildEditorPanelOpts(path)

    if (event.group) {
      opts.position = event.position === 'center'
        ? { referenceGroup: event.group.id }
        : { referenceGroup: event.group.id, direction: dirMap[event.position] || event.position }
    }

    dockview.addPanel(opts)
    markPanelOpened(path)
  })

  async function openFile (path, event) {
    const existing = dockview.panels.find(p => p.id === path)
    if (existing) {
      existing.api.setActive()
      return
    }

    const opts = buildEditorPanelOpts(path)
    if (event?.metaKey || event?.ctrlKey) {
      opts.position = { direction: 'right' }
    }
    dockview.addPanel(opts)

    selectionStore.setFile(path)
    markPanelOpened(path)
  }

  function saveActiveFile () {
    const active = dockview.activePanel
    if (!active) return
    const s = panelStore.get(active.id)
    if (s?.renderer) s.renderer.save()
  }

  function restoreLayoutOrLastFile () {
    if (layoutStore.restore()) return
    const last = storage.lastFile.get()
    if (last) openFile(last)
  }

  layoutDockview()

  return { dockview, openFile, saveActiveFile, layoutDockview, restoreLayoutOrLastFile }
}
