/**
 * EditorPanelRenderer — Dockview component that hosts a Toast UI markdown
 * editor for a single file, plus the inline history view.
 *
 * Owns:
 * - The Toast UI editor lifecycle (create, reload, destroy).
 * - Dirty tracking against a normalized baseline captured right after the
 *   editor renders (Toast UI massages whitespace/dash styles on load, so the
 *   baseline must be the post-load markdown to avoid false positives).
 * - The switch between edit and history modes.
 * - Save flow, including a short "just saved" window so the SSE watcher in
 *   `app.js` skips the reload that would otherwise be triggered by our own
 *   PUT.
 */

import * as api from '../../api.js'
import * as storage from '../../storage.js'
import { panelStore } from '../../state/panel-store.js'
import { lucideIcon } from '../../infra/dom.js'
import { basename } from '../../domain/path.js'
import { HistoryView } from '../history/history-view.js'

const SAVED_INDICATOR_MS = 2000
const JUST_SAVED_WINDOW_MS = 3000

export class EditorPanelRenderer {
  constructor () {
    this.element = document.createElement('div')
    this.element.className = 'editor-panel'

    this._header = document.createElement('header')
    this._header.className = 'editor-header'

    this._breadcrumb = document.createElement('span')
    this._breadcrumb.className = 'breadcrumb'

    this._actions = document.createElement('div')
    this._actions.className = 'editor-actions'

    this._indicator = document.createElement('span')
    this._indicator.className = 'save-indicator'

    this._historyBtn = document.createElement('button')
    this._historyBtn.className = 'history-btn'
    this._historyBtn.title = 'Ver historial de versiones'
    this._historyBtn.appendChild(lucideIcon('history'))

    this._backBtn = document.createElement('button')
    this._backBtn.className = 'back-btn hidden'
    this._backBtn.title = 'Volver al editor'
    this._backBtn.appendChild(lucideIcon('arrow-left'))
    this._backBtn.append(' Volver al editor')

    this._saveBtn = document.createElement('button')
    this._saveBtn.className = 'save-btn hidden'
    this._saveBtn.textContent = 'Guardar'

    this._actions.appendChild(this._indicator)
    this._actions.appendChild(this._historyBtn)
    this._actions.appendChild(this._saveBtn)
    this._actions.appendChild(this._backBtn)
    this._header.appendChild(this._breadcrumb)
    this._header.appendChild(this._actions)

    this._editorContainer = document.createElement('div')
    this._editorContainer.className = 'panel-tui-editor'

    this.element.appendChild(this._header)
    this.element.appendChild(this._editorContainer)

    this._panelApi = null
    this._path = null
    this._editor = null

    /** 'edit' | 'history' */
    this._mode = 'edit'
    this._historyView = null
  }

  init (params) {
    this._panelApi = params.api
    this._path = params.params.path
    this._breadcrumb.textContent = this._path

    this._saveBtn.addEventListener('click', () => this.save())
    this._historyBtn.addEventListener('click', () => this._enterHistoryMode())
    this._backBtn.addEventListener('click', () => this._exitHistoryMode())

    this.loadContent()
  }

  /** Public toggle for consumers outside the renderer (menu actions, etc). */
  toggleHistory () {
    if (this._mode === 'history') this._exitHistoryMode()
    else this._enterHistoryMode()
  }

  /** Mark the embedded history view as stale so its next open refetches. */
  invalidateHistory () {
    if (this._historyView) this._historyView.invalidate()
  }

  _enterHistoryMode () {
    if (this._mode === 'history') return
    this._mode = 'history'

    if (!this._historyView) {
      this._historyView = new HistoryView()
      this._historyView.setPath(this._path)
      this._historyView.onAfterRestore = () => {
        this.loadContent()
        this._exitHistoryMode()
      }
      this.element.appendChild(this._historyView.element)
    }

    this.element.classList.add('mode-history')

    this._indicator.classList.add('hidden')
    this._historyBtn.classList.add('hidden')
    this._saveBtn.classList.add('hidden')
    this._backBtn.classList.remove('hidden')

    this._breadcrumb.textContent = `Historial: ${basename(this._path)}`

    this._historyView.load()
  }

  _exitHistoryMode () {
    if (this._mode === 'edit') return
    this._mode = 'edit'

    this.element.classList.remove('mode-history')

    this._indicator.classList.remove('hidden')
    this._historyBtn.classList.remove('hidden')
    this._backBtn.classList.add('hidden')
    const s = panelStore.get(this._panelApi?.id)
    if (s?.isDirty) {
      this._saveBtn.classList.remove('hidden')
      this._indicator.textContent = 'Sin guardar'
    }

    this._breadcrumb.textContent = this._path

    // Nudge Toast UI / Dockview to recompute layout after being hidden.
    requestAnimationFrame(() => window.dispatchEvent(new Event('resize')))
  }

  async loadContent () {
    const res = await api.getFile(this._path)
    if (!res.ok) {
      this._editorContainer.innerHTML = '<div class="tree-loading">No se pudo cargar el archivo.</div>'
      return
    }

    const content = await res.text()

    if (this._editor) {
      this._editor.destroy()
      this._editorContainer.innerHTML = ''
    }

    this._editor = new window.toastui.Editor({
      el: this._editorContainer,
      height: '100%',
      initialEditType: storage.editMode.get(this._path) || 'wysiwyg',
      hideModeSwitch: false,
      initialValue: content,
      toolbarItems: [
        ['heading', 'bold', 'italic', 'strike'],
        ['hr', 'quote'],
        ['ul', 'ol', 'task'],
        ['table', 'link'],
        ['code', 'codeblock'],
      ],
      autofocus: false,
      customMarkdownRenderer: {
        bulletList (_, { origin }) {
          const result = origin()
          result.delim = '-'
          return result
        },
      },
    })

    // Reset ProseMirror history so Cmd+Z can't erase loaded content, then
    // capture the editor-normalized markdown as the dirty-tracking baseline.
    requestAnimationFrame(() => {
      const view = this._editor.wwEditor?.view
      if (view) {
        const { state } = view
        view.updateState(state.constructor.create({
          schema: state.schema,
          doc: state.doc,
          plugins: state.plugins,
        }))
      }
      this._originalContent = this._editor.getMarkdown()
    })

    panelStore.set(this._panelApi.id, {
      path: this._path,
      editor: this._editor,
      isDirty: false,
      renderer: this,
    })

    this._indicator.textContent = ''
    this._saveBtn.classList.add('hidden')

    this._editor.on('changeMode', (mode) => {
      storage.editMode.set(this._path, mode)
    })

    this._editor.on('change', () => {
      const s = panelStore.get(this._panelApi.id)
      if (!s) return
      const dirty = this._editor.getMarkdown() !== this._originalContent
      if (dirty !== s.isDirty) {
        s.isDirty = dirty
        this._saveBtn.classList.toggle('hidden', !dirty)
        this._indicator.textContent = dirty ? 'Sin guardar' : ''
        this._panelApi.updateParameters({ dirty })
      }
    })
  }

  async save () {
    const s = panelStore.get(this._panelApi.id)
    if (!s?.editor) return

    const markdown = s.editor.getMarkdown()
    const res = await api.putFile(this._path, markdown)

    if (!res.ok) {
      alert('Error al guardar el archivo.')
      return
    }

    this._originalContent = markdown
    this._justSaved = true
    clearTimeout(this._justSavedTimer)
    this._justSavedTimer = setTimeout(() => { this._justSaved = false }, JUST_SAVED_WINDOW_MS)
    s.isDirty = false
    this._saveBtn.classList.add('hidden')
    this._indicator.textContent = 'Guardado'
    this._panelApi.updateParameters({ dirty: false })
    setTimeout(() => { this._indicator.textContent = '' }, SAVED_INDICATOR_MS)
    this.invalidateHistory()
  }

  /** Returns true if SSE should skip reloading (just saved by this client). */
  consumeJustSaved () {
    if (this._justSaved) {
      this._justSaved = false
      clearTimeout(this._justSavedTimer)
      return true
    }
    return false
  }

  dispose () {
    clearTimeout(this._justSavedTimer)
    if (this._historyView) {
      this._historyView.dispose()
      this._historyView = null
    }
    if (this._editor) {
      this._editor.destroy()
      this._editor = null
    }
    if (this._panelApi) {
      panelStore.delete(this._panelApi.id)
    }
  }
}
