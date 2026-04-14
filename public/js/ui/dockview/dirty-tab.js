/**
 * Custom Dockview tab renderer with a dirty indicator (bullet) and a close
 * button that prompts when the panel has unsaved changes.
 *
 * Reads dirty state from `panelStore` (keyed by panel id) rather than from
 * the Dockview panel params, because the renderer is the source of truth
 * for unsaved edits — the panel params are a derived flag used only to
 * toggle the visual indicator via `onDidParametersChange`.
 */

import { panelStore } from '../../state/panel-store.js'

const UNSAVED_CONFIRM = 'Hay cambios sin guardar. \u00BFCerrar sin guardar?'

export class DirtyTabRenderer {
  constructor () {
    this.element = document.createElement('div')
    this.element.className = 'cv-tab'

    this._dirty = document.createElement('span')
    this._dirty.className = 'cv-tab-dirty hidden'
    this._dirty.textContent = '\u25CF'

    this._label = document.createElement('span')
    this._label.className = 'cv-tab-label'

    this._close = document.createElement('span')
    this._close.className = 'cv-tab-close'
    this._close.textContent = '\u00D7'

    this.element.appendChild(this._dirty)
    this.element.appendChild(this._label)
    this.element.appendChild(this._close)

    this._api = null
  }

  init (params) {
    this._api = params.api
    this._label.textContent = params.api.title || params.api.id.split('/').pop()

    params.api.onDidParametersChange((e) => {
      this._dirty.classList.toggle('hidden', e.params?.dirty !== true)
    })

    this._close.addEventListener('pointerdown', (e) => e.preventDefault())
    this._close.addEventListener('click', (e) => {
      e.preventDefault()
      e.stopPropagation()
      const s = panelStore.get(this._api.id)
      if (s?.isDirty && !confirm(UNSAVED_CONFIRM)) return
      this._api.close()
    })
  }

  dispose () {}
}
