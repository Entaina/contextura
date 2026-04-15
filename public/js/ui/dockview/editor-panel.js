/**
 * EditorPanelRenderer — Dockview component that hosts a Toast UI markdown
 * editor for a single file, plus a diff viewer activated from the right
 * context pane.
 *
 * Owns:
 * - The Toast UI editor lifecycle (create, reload, destroy).
 * - Dirty tracking against a normalized baseline captured right after the
 *   editor renders (Toast UI massages whitespace/dash styles on load, so the
 *   baseline must be the post-load markdown to avoid false positives).
 * - The switch between edit and diff modes. Diff selection happens in the
 *   right context pane's history timeline and is pushed in via
 *   `showDiffVersion(version, ctx)`.
 * - Save flow, including a short "just saved" window so the SSE watcher in
 *   `app.js` skips the reload that would otherwise be triggered by our own
 *   PUT.
 */

import * as api from '../../api.js'
import * as storage from '../../storage.js'
import { panelStore } from '../../state/panel-store.js'
import { lucideIcon } from '../../infra/dom.js'
import { basename } from '../../domain/path.js'
import { DiffView } from '../history/diff-view.js'

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

    this._backBtn = document.createElement('button')
    this._backBtn.className = 'back-btn hidden'
    this._backBtn.title = 'Volver al editor'
    this._backBtn.appendChild(lucideIcon('arrow-left'))
    this._backBtn.append(' Volver al editor')

    this._saveBtn = document.createElement('button')
    this._saveBtn.className = 'save-btn hidden'
    this._saveBtn.textContent = 'Guardar'

    this._actions.appendChild(this._indicator)
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

    /** 'edit' | 'diff' */
    this._mode = 'edit'
    this._diffView = null
  }

  init (params) {
    this._panelApi = params.api
    this._path = params.params.path
    this._breadcrumb.textContent = this._path

    this._saveBtn.addEventListener('click', () => this.save())
    this._backBtn.addEventListener('click', () => this._exitDiffMode())

    this.loadContent()
  }

  /**
   * Show a specific version's diff inside this editor panel. Called from the
   * right-side context pane when the user clicks a commit.
   *
   * @param {object} version History version descriptor (sha, status, …).
   * @param {object} [ctx] Context from the history module (versions list,
   *   dirty state, untracked flag) so the diff view can render against the
   *   right base without refetching.
   */
  showDiffVersion (version, ctx) {
    this._enterDiffMode()
    this._diffView?.showVersion(version, ctx)
  }

  _enterDiffMode () {
    if (this._mode === 'diff') return
    this._mode = 'diff'

    if (!this._diffView) {
      this._diffView = new DiffView()
      this._diffView.setPath(this._path)
      this._diffView.onAfterRestore = () => {
        this.loadContent()
        this._exitDiffMode()
      }
      this.element.appendChild(this._diffView.element)
    }

    this.element.classList.add('mode-diff')

    this._indicator.classList.add('hidden')
    this._saveBtn.classList.add('hidden')
    this._backBtn.classList.remove('hidden')

    this._breadcrumb.textContent = `Historial: ${basename(this._path)}`
  }

  _exitDiffMode () {
    if (this._mode === 'edit') return
    this._mode = 'edit'

    this.element.classList.remove('mode-diff')

    this._indicator.classList.remove('hidden')
    this._backBtn.classList.add('hidden')
    const s = panelStore.get(this._panelApi?.id)
    if (s?.isDirty) {
      this._saveBtn.classList.remove('hidden')
      this._indicator.textContent = 'Sin guardar'
    }

    this._breadcrumb.textContent = this._path

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
    if (this._diffView) {
      this._diffView.dispose()
      this._diffView = null
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
