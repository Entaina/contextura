/**
 * Contextura — Frontend
 * CSS flex layout (sidebar + resize handle + main) with
 * DockviewComponent (tabs) in the main area.
 * WYSIWYG editor via Toast UI Editor.
 */

import { DockviewComponent } from 'https://esm.sh/dockview-core@5'

import * as api from './js/api.js'
import * as storage from './js/storage.js'
import { escapeHtml, lucideIcon } from './js/infra/dom.js'
import { absoluteDateEs, firstName, relativeTimeEs } from './js/domain/date-es.js'
import { versionTypeBadge } from './js/domain/version-badge.js'
import { treeStore } from './js/state/tree-store.js'
import { panelStore } from './js/state/panel-store.js'
import { selectionStore } from './js/state/selection-store.js'
import { connectSSE } from './js/sse-client.js'
import { connectMenuActions } from './js/electron-bridge.js'

// ============================================================
// State
// ============================================================

/** @type {DockviewComponent} */
let dockview = null

let sidebarVisible = true
let isRestoringLayout = false

// ============================================================
// DOM references
// ============================================================

const sidebarEl = document.getElementById('sidebar')
const fileTreeEl = document.getElementById('file-tree')
const searchInput = document.getElementById('search-input')
const btnCollapseAll = document.getElementById('btn-collapse-all')
const btnNewFile = document.getElementById('btn-new-file')
const btnNewFolder = document.getElementById('btn-new-folder')
const btnToggleSidebar = document.getElementById('btn-toggle-sidebar')
const resizeHandle = document.getElementById('resize-handle')
const dockviewContainer = document.getElementById('dockview-container')
const sidebarShowBtn = document.getElementById('sidebar-show-btn')

// ============================================================
// Dockview Renderers
// ============================================================

/** Editor panel content renderer for DockviewComponent */
class EditorPanelRenderer {
  constructor () {
    this.element = document.createElement('div')
    this.element.className = 'editor-panel'

    // Header
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
    this._historyBtn.innerHTML = `
      <svg viewBox="0 0 24 24" width="16" height="16" fill="none"
           stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
           aria-hidden="true">
        <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/>
        <path d="M3 3v5h5"/>
        <path d="M12 7v5l4 2"/>
      </svg>
    `

    this._backBtn = document.createElement('button')
    this._backBtn.className = 'back-btn hidden'
    this._backBtn.title = 'Volver al editor'
    this._backBtn.innerHTML = `
      <svg viewBox="0 0 24 24" width="14" height="14" fill="none"
           stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
           aria-hidden="true">
        <path d="M19 12H5M12 19l-7-7 7-7"/>
      </svg>
      Volver al editor
    `

    this._saveBtn = document.createElement('button')
    this._saveBtn.className = 'save-btn hidden'
    this._saveBtn.textContent = 'Guardar'

    this._actions.appendChild(this._indicator)
    this._actions.appendChild(this._historyBtn)
    this._actions.appendChild(this._saveBtn)
    this._actions.appendChild(this._backBtn)
    this._header.appendChild(this._breadcrumb)
    this._header.appendChild(this._actions)

    // Editor container
    this._editorContainer = document.createElement('div')
    this._editorContainer.className = 'panel-tui-editor'

    this.element.appendChild(this._header)
    this.element.appendChild(this._editorContainer)

    this._panelApi = null
    this._path = null
    this._editor = null

    this._mode = 'edit'         // 'edit' | 'history'
    this._historyView = null    // lazy HistoryView instance
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

  _enterHistoryMode () {
    if (this._mode === 'history') return
    this._mode = 'history'

    // Lazy create + attach the embedded history view
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

    // Header button swap
    this._indicator.classList.add('hidden')
    this._historyBtn.classList.add('hidden')
    this._saveBtn.classList.add('hidden')
    this._backBtn.classList.remove('hidden')

    // Breadcrumb → Historial: <basename>
    const basename = this._path.split('/').pop()
    this._breadcrumb.textContent = `Historial: ${basename}`

    this._historyView.load()
  }

  _exitHistoryMode () {
    if (this._mode === 'edit') return
    this._mode = 'edit'

    this.element.classList.remove('mode-history')

    // Restore header state
    this._indicator.classList.remove('hidden')
    this._historyBtn.classList.remove('hidden')
    this._backBtn.classList.add('hidden')
    const s = panelStore.get(this._panelApi?.id)
    if (s?.isDirty) {
      this._saveBtn.classList.remove('hidden')
      this._indicator.textContent = 'Sin guardar'
    }

    // Restore breadcrumb to the file path
    this._breadcrumb.textContent = this._path

    // Nudge Toast UI / Dockview to recompute layout after being hidden
    requestAnimationFrame(() => window.dispatchEvent(new Event('resize')))
  }

  async loadContent () {
    const res = await api.getFile(this._path)
    if (!res.ok) {
      this._editorContainer.innerHTML = '<div class="tree-loading">No se pudo cargar el archivo.</div>'
      return
    }

    const content = await res.text()

    // Destroy previous editor if reloading
    if (this._editor) {
      this._editor.destroy()
      this._editorContainer.innerHTML = ''
    }

    this._editor = new toastui.Editor({
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

    // Clear ProseMirror undo history so Cmd+Z doesn't erase loaded content
    // Then capture editor-normalized content as baseline for dirty comparison
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

    // Register in panelStore
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
      const currentContent = this._editor.getMarkdown()
      const dirty = currentContent !== this._originalContent
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

    if (res.ok) {
      this._originalContent = markdown
      this._justSaved = true
      clearTimeout(this._justSavedTimer)
      this._justSavedTimer = setTimeout(() => { this._justSaved = false }, 3000)
      s.isDirty = false
      this._saveBtn.classList.add('hidden')
      this._indicator.textContent = 'Guardado'
      this._panelApi.updateParameters({ dirty: false })
      setTimeout(() => { this._indicator.textContent = '' }, 2000)
      // The committed-vs-disk delta may have changed; force history reload next entry.
      if (this._historyView) this._historyView.invalidate()
    } else {
      alert('Error al guardar el archivo.')
    }
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

// ============================================================
// History panel
// ============================================================

/**
 * HistoryView — embeddable history viewer inside an EditorPanelRenderer.
 *
 * Builds only the body (timeline + diff toolbar + diff container). The parent
 * owns the header/breadcrumb. Controlled via setPath / load / dispose.
 * Communicates back via the `onAfterRestore` callback.
 */
class HistoryView {
  constructor () {
    this.element = document.createElement('div')
    this.element.className = 'history-view'

    this._body = document.createElement('div')
    this._body.className = 'history-body'

    this._timeline = document.createElement('aside')
    this._timeline.className = 'history-timeline'

    this._diffWrap = document.createElement('section')
    this._diffWrap.className = 'history-diff'

    this._diffToolbar = document.createElement('div')
    this._diffToolbar.className = 'history-diff-toolbar'
    this._diffToolbar.innerHTML = `
      <div class="history-toolbar-left">
        <span class="history-diff-context"></span>
      </div>
      <div class="history-toolbar-right">
        <button class="history-restore-btn hidden">Restaurar esta versión</button>
      </div>
    `

    this._diffContainer = document.createElement('div')
    this._diffContainer.className = 'history-diff-container'
    this._diffContainer.innerHTML = '<div class="history-empty">Selecciona una versión para ver los cambios.</div>'

    this._diffWrap.appendChild(this._diffToolbar)
    this._diffWrap.appendChild(this._diffContainer)

    this._body.appendChild(this._timeline)
    this._body.appendChild(this._diffWrap)

    this.element.appendChild(this._body)

    // Wire up toolbar controls immediately — they're in the DOM from construction
    this._restoreBtn = this._diffToolbar.querySelector('.history-restore-btn')
    this._contextLabel = this._diffToolbar.querySelector('.history-diff-context')
    this._restoreBtn.addEventListener('click', () => this.restoreVersion())

    this._path = null
    this._versions = []
    this._hasUncommittedChanges = false
    this._untracked = false
    this._selectedSha = null
    this._selectedOldContent = null
    this._selectedLabel = null
    this._md = null
    this._loaded = false

    // Parent-provided callback — invoked after a successful restore.
    this.onAfterRestore = null
  }

  setPath (path) {
    this._path = path
    this._loaded = false  // force re-fetch when load() is called next
  }

  /** Load (or reload) the history for the current path. Idempotent on re-entry. */
  async load () {
    if (this._loaded) return
    this._loaded = true
    await this.loadHistory()
  }

  /** Mark the cached timeline as stale so the next load() refetches. */
  invalidate () {
    this._loaded = false
  }

  async loadHistory () {
    this._timeline.innerHTML = '<div class="history-empty">Cargando…</div>'
    try {
      const data = await api.getHistory(this._path)
      this._versions = data.versions || []
      this._hasUncommittedChanges = !!data.hasUncommittedChanges
      this._untracked = !!data.untracked
      this.renderTimeline(data.notInGit)
    } catch (err) {
      this._timeline.innerHTML = '<div class="history-empty">No se pudo cargar el historial.</div>'
    }
  }

  renderTimeline (notInGit) {
    // Edge case: nothing tracked AND nothing dirty → genuinely empty.
    if (notInGit && !this._hasUncommittedChanges) {
      this._timeline.innerHTML = `
        <div class="history-empty">
          <strong>Este archivo aún no tiene historial.</strong>
          <p>Se creará cuando se guarden cambios confirmados en el repositorio.</p>
        </div>
      `
      return
    }

    const frag = document.createDocumentFragment()
    const dirty = this._hasUncommittedChanges

    // Synthetic "Versión actual" ONLY when the disk differs from the latest
    // commit (dirty) or the file is untracked. When clean, the latest commit
    // already represents the current state and gets tagged below.
    if (dirty) {
      frag.appendChild(this._buildUncommittedItem())
    }

    // Commits. The first commit is the "head current" when clean.
    this._versions.forEach((v, i) => {
      const isHeadClean = !dirty && i === 0
      frag.appendChild(this._buildCommitItem(v, isHeadClean))
    })

    this._timeline.innerHTML = ''
    this._timeline.appendChild(frag)
  }

  /**
   * Build the synthetic "Versión actual" item — only used when there ARE
   * uncommitted changes (dirty or untracked). When the working tree is clean
   * the latest commit itself gets the "Versión actual" tag instead; see
   * `_buildCommitItem` + `isHeadClean`.
   */
  _buildUncommittedItem () {
    const untracked = this._untracked
    const subtitle = untracked
      ? 'Aún no añadido al historial'
      : 'Con cambios sin confirmar'

    const ICON_WARN = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 8v4M12 16h.01"/></svg>'

    const item = document.createElement('div')
    item.className = 'history-timeline-item current uncommitted'
    item.dataset.synthetic = 'current'
    item.innerHTML = `
      <div class="history-item-dot"></div>
      <div class="history-item-body">
        <div class="history-item-title-row">
          <span class="history-item-badge type-uncommitted" title="Cambios sin confirmar">${ICON_WARN}</span>
          <div class="history-item-title">Versión actual</div>
        </div>
        <div class="history-item-subject"><em>${subtitle}</em></div>
      </div>
    `
    item.addEventListener('click', () => this.selectUncommittedVersion())
    return item
  }

  /**
   * Build a normal commit item. When `isHeadClean` is true, the commit IS the
   * current state of the file (clean working tree) — we decorate it with a
   * "VERSIÓN ACTUAL" pill and green dot so the user sees one merged entry
   * instead of two redundant rows.
   */
  _buildCommitItem (v, isHeadClean) {
    const item = document.createElement('div')
    item.className = 'history-timeline-item' + (isHeadClean ? ' head-current' : '')
    item.dataset.sha = v.sha
    item.title = absoluteDateEs(v.dateIso)
    const subject = v.subject ? escapeHtml(v.subject) : '<em>sin descripción</em>'
    const badge = versionTypeBadge(v)
    const timeLabel = escapeHtml(relativeTimeEs(v.dateIso))
    const titleHtml = isHeadClean
      ? `<span class="history-current-tag">Versión actual</span>${timeLabel}`
      : timeLabel
    item.innerHTML = `
      <div class="history-item-dot"></div>
      <div class="history-item-body">
        <div class="history-item-title-row">
          <span class="history-item-badge ${badge.className}" title="${escapeHtml(badge.tooltip)}">${badge.icon}</span>
          <div class="history-item-title">${titleHtml}</div>
        </div>
        <div class="history-item-author">${escapeHtml(firstName(v.authorName))}</div>
        <div class="history-item-subject">${subject}</div>
      </div>
    `
    item.addEventListener('click', () => this.selectVersion(v))
    return item
  }

  /**
   * Handler for the synthetic "Versión actual" entry. Only invoked when the
   * working tree differs from HEAD (or the file is untracked) — the clean
   * case is handled by the latest commit being tagged as head-current.
   */
  async selectUncommittedVersion () {
    this._selectedSha = null
    this._selectedLabel = 'versión actual'

    this._timeline.querySelectorAll('.history-timeline-item').forEach(el => {
      el.classList.toggle('active', el.dataset.synthetic === 'current')
    })

    if (this._contextLabel) {
      this._contextLabel.textContent = 'Versión actual → historial (cambios sin confirmar)'
    }
    this._diffContainer.innerHTML = '<div class="history-empty">Cargando cambios…</div>'
    this._restoreBtn.classList.add('hidden')

    try {
      const newRes = await api.getFile(this._path)
      if (!newRes.ok) throw new Error('file fetch failed')
      const newContent = await newRes.text()

      // Fetch HEAD-equivalent content for the diff. For untracked files
      // there's no version → oldContent stays empty.
      let oldContent = ''
      if (this._versions.length > 0) {
        const head = this._versions[0]
        const res = await api.getDiff(this._path, head.sha, head.path)
        if (res.ok) {
          const data = await res.json()
          oldContent = data.oldContent || ''
        }
      }

      const syntheticVersion = { status: 'U', untracked: this._untracked }
      await this._renderInlineDiff(oldContent, newContent, syntheticVersion)
    } catch (err) {
      console.error('selectUncommittedVersion error', err)
      this._diffContainer.innerHTML = '<div class="history-empty">No se pudieron cargar los cambios sin confirmar.</div>'
    }
  }

  async selectVersion (version) {
    this._selectedSha = version.sha
    this._selectedLabel = `${relativeTimeEs(version.dateIso)} (${absoluteDateEs(version.dateIso)})`

    this._timeline.querySelectorAll('.history-timeline-item').forEach(el => {
      el.classList.toggle('active', el.dataset.sha === version.sha)
    })

    const dirty = this._hasUncommittedChanges
    const isHead = this._versions[0]?.sha === version.sha
    const isHeadClean = !dirty && isHead
    const isHeadDirty = dirty && isHead

    if (this._contextLabel) {
      if (isHeadClean) {
        this._contextLabel.textContent = `Versión actual · ${relativeTimeEs(version.dateIso)}`
      } else if (dirty) {
        // Diffs for historical commits always compare against HEAD when the
        // working tree is dirty — keeps local edits out of historical diffs.
        this._contextLabel.textContent = `Cambios de ${relativeTimeEs(version.dateIso)} → último commit`
      } else {
        this._contextLabel.textContent = `Cambios de ${relativeTimeEs(version.dateIso)} → versión actual`
      }
    }
    this._diffContainer.innerHTML = '<div class="history-empty">Cargando cambios…</div>'
    this._restoreBtn.classList.add('hidden')

    try {
      // Old content — at the selected commit
      const oldContent = await this._fetchContentAt(version)
      this._selectedOldContent = oldContent

      // New content — depends on whether the working tree is dirty:
      //  - Clean: use disk (equals HEAD for this file, avoids an extra git show)
      //  - Dirty: use HEAD content so the diff is strictly "commit → HEAD",
      //           never polluted by local uncommitted edits. The local edits
      //           have their own dedicated timeline entry ("Versión actual").
      let newContent
      if (dirty && this._versions.length > 0) {
        newContent = (await this._fetchContentAt(this._versions[0])) || ''
      } else {
        const newRes = await api.getFile(this._path)
        if (!newRes.ok) throw new Error('file fetch failed')
        newContent = await newRes.text()
      }

      // Missing old content is only unexpected when we're NOT rendering a
      // creation (A). The A case renders current content as "first version".
      if (oldContent == null && version?.status !== 'A') {
        this._diffContainer.innerHTML = '<div class="history-empty">Esta versión no existía en esa fecha.</div>'
        return
      }

      // Size guard — htmldiff is O(n²)
      const totalSize = (oldContent?.length || 0) + (newContent.length || 0)
      if (totalSize > 200_000) {
        this._diffContainer.innerHTML = `
          <div class="history-empty">
            <strong>Documento demasiado grande para ver los cambios inline.</strong>
            <p>${Math.round(totalSize / 1000)} KB. Usa "Restaurar esta versión" si quieres recuperar este contenido.</p>
          </div>
        `
        this._restoreBtn.classList.remove('hidden')
        return
      }

      // Render both versions to HTML and diff them
      await this._renderInlineDiff(oldContent, newContent, version, { isHeadClean, isHeadDirty })
      // Restore never applies when this commit IS already the current state
      // of the working tree (clean head). It DOES apply when isHeadDirty,
      // where restoring means "discard my uncommitted edits".
      if (!isHeadClean) this._restoreBtn.classList.remove('hidden')
    } catch (err) {
      console.error('history selectVersion error', err)
      this._diffContainer.innerHTML = '<div class="history-empty">No se pudieron cargar los cambios.</div>'
      this._restoreBtn.classList.add('hidden')
    }
  }

  async _renderInlineDiff (oldContent, newContent, version, opts = {}) {
    const md = this._ensureMarkdown()
    if (!md) {
      this._diffContainer.innerHTML = '<div class="history-empty">No se pudo cargar el parser de markdown.</div>'
      return
    }

    // Case 0 — synthetic "Versión actual" entry (dirty or untracked only).
    if (version?.status === 'U') {
      const HtmlDiff = await this._ensureHtmlDiff()
      if (!HtmlDiff) {
        this._diffContainer.innerHTML = '<div class="history-empty">No se pudo cargar el visor de cambios.</div>'
        return
      }
      const oldHtml = md.render(oldContent || '')
      const newHtml = md.render(newContent || '')
      const merged = HtmlDiff.execute(oldHtml, newHtml)
      const intro = version.untracked
        ? 'Este archivo aún no está añadido al historial del repositorio.'
        : 'Estos cambios aún no se han guardado en el historial del repositorio.'
      const banner = `
        <div class="history-banner history-banner-uncommitted">
          <strong>⚠️ Cambios sin confirmar</strong>
          ${intro} Usa <code>git commit</code> para guardarlos permanentemente.
        </div>
      `
      this._diffContainer.innerHTML = `${banner}<article class="history-doc-view">${merged}</article>`
      return
    }

    // Case 1 — initial creation (A): render the historical content as plain
    // prose with a "first version" banner. No diff marks.
    if (version?.status === 'A') {
      const relTime = relativeTimeEs(version.dateIso)
      const absTime = absoluteDateEs(version.dateIso)
      const author = firstName(version.authorName)
      const banner = `
        <div class="history-banner history-banner-created" title="${escapeHtml(absTime)}">
          <strong>🌱 Primera versión del archivo</strong>
          Creada ${escapeHtml(relTime)} por ${escapeHtml(author)}.
          No hay versiones anteriores en el historial del repositorio.
        </div>
      `
      // Prefer historical content (what the file actually looked like at
      // creation); fall back to current if unavailable for any reason.
      const creationContent = oldContent != null ? oldContent : newContent
      const contentHtml = md.render(creationContent || '')
      this._diffContainer.innerHTML = `${banner}<article class="history-doc-view">${contentHtml}</article>`
      return
    }

    const HtmlDiff = await this._ensureHtmlDiff()
    if (!HtmlDiff) {
      this._diffContainer.innerHTML = '<div class="history-empty">No se pudo cargar el visor de cambios.</div>'
      return
    }
    const oldHtml = md.render(oldContent || '')
    const newHtml = md.render(newContent || '')
    const merged = HtmlDiff.execute(oldHtml, newHtml)
    const hasContentChanges = /<ins\b|<del\b/i.test(merged)

    const isRename = version?.status === 'R' && version?.oldPath && version.oldPath !== version.path
    const isPureRename = isRename && version.similarity === 100

    // Case 2 — no content differences vs the "new" side of the diff.
    if (!hasContentChanges) {
      // Dirty head commit: old == new (both HEAD), but the working tree has
      // local edits that live under the synthetic "Versión actual" entry.
      // Show a targeted hint so the user understands where their edits are.
      if (opts.isHeadDirty) {
        const contentHtml = md.render(newContent || '')
        const banner = `
          <div class="history-banner history-banner-unchanged">
            <strong>✓ Último commit del historial</strong>
            Tus cambios locales están en <em>"Versión actual"</em> (primera entrada de la lista).
            Usa <strong>"Restaurar esta versión"</strong> si quieres descartarlos.
          </div>
        `
        this._diffContainer.innerHTML = `${banner}<article class="history-doc-view">${contentHtml}</article>`
        return
      }

      if (isRename) {
        const lead = isPureRename
          ? 'En esa versión solo cambió la ubicación del archivo:'
          : 'En esa versión se movió y editó el archivo. Desde entonces no ha cambiado.'
        this._diffContainer.innerHTML = `
          <div class="history-empty">
            <strong>El contenido es idéntico al archivo actual.</strong>
            <p>${lead}</p>
            <p class="history-rename-path">${escapeHtml(version.oldPath)}</p>
            <p class="history-rename-arrow">↓</p>
            <p class="history-rename-path">${escapeHtml(version.path)}</p>
          </div>
        `
        return
      }
      // Head-clean case: this commit IS the current state. Render the file
      // as prose with a "Versión actual" banner instead of the confusing
      // "idéntica al archivo actual" empty message.
      if (opts.isHeadClean) {
        const contentHtml = md.render(newContent || '')
        const subjectPart = version.subject
          ? ` — <em>${escapeHtml(version.subject)}</em>`
          : ''
        const banner = `
          <div class="history-banner history-banner-unchanged">
            <strong>✓ Versión actual</strong>
            Sin cambios desde ${escapeHtml(relativeTimeEs(version.dateIso))}${subjectPart}.
          </div>
        `
        this._diffContainer.innerHTML = `${banner}<article class="history-doc-view">${contentHtml}</article>`
        return
      }
      this._diffContainer.innerHTML = '<div class="history-empty">Esta versión es idéntica al archivo actual.</div>'
      return
    }

    // Case 3 — rename + content changes: banner + diff.
    // Case 4 — plain modification: just diff.
    let banner = ''
    if (isRename) {
      banner = `
        <div class="history-banner history-banner-moved">
          <strong>📁 También cambió de ubicación</strong>
          <div class="history-banner-paths">
            Antes: <code>${escapeHtml(version.oldPath)}</code><br>
            Ahora: <code>${escapeHtml(version.path)}</code>
          </div>
        </div>
      `
    }
    this._diffContainer.innerHTML = `${banner}<article class="history-doc-view">${merged}</article>`
  }

  /** Fetch the raw content of the file as it existed in a given commit. */
  async _fetchContentAt (version) {
    try {
      const res = await api.getContentAt(this._path, version.sha, version.path)
      if (!res.ok) return null
      const data = await res.json()
      return data.content  // may be null if the file didn't exist at that commit
    } catch {
      return null
    }
  }

  _ensureMarkdown () {
    if (this._md) return this._md
    if (!window.markdownit) return null
    this._md = window.markdownit({ html: false, linkify: true, breaks: false })
    return this._md
  }

  async _ensureHtmlDiff () {
    if (window.HtmlDiff) return window.HtmlDiff
    try {
      const mod = await import('https://cdn.jsdelivr.net/npm/htmldiff-js@1.0.5/+esm')
      // The +esm wrapper returns an object whose default is the HtmlDiff class.
      const candidate = mod?.default?.default || mod?.default || mod
      if (candidate && typeof candidate.execute === 'function') {
        window.HtmlDiff = candidate
        return candidate
      }
      // Fallback: scan module exports for an object with .execute
      for (const val of Object.values(mod || {})) {
        if (val && typeof val.execute === 'function') {
          window.HtmlDiff = val
          return val
        }
      }
    } catch (err) {
      console.error('htmldiff import failed', err)
    }
    return null
  }

  async restoreVersion () {
    if (this._selectedOldContent == null || !this._selectedLabel) return
    const ok = confirm(
      `¿Restaurar la versión de ${this._selectedLabel}?\n\n` +
      'El contenido actual del archivo se reemplazará. Podrás volver atrás ' +
      'guardando una nueva versión.'
    )
    if (!ok) return

    const res = await api.putFile(this._path, this._selectedOldContent)

    if (res.ok) {
      this._restoreBtn.textContent = '✓ Restaurado'
      setTimeout(() => { this._restoreBtn.textContent = 'Restaurar esta versión' }, 2500)
      if (typeof this.onAfterRestore === 'function') {
        this.onAfterRestore()
      }
    } else {
      alert('No se pudo restaurar la versión.')
    }
  }

  dispose () {
    this._versions = []
    this._selectedOldContent = null
    this.onAfterRestore = null
  }
}

/** Custom tab renderer with dirty indicator and close button */
class DirtyTabRenderer {
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
    const title = params.api.title || params.api.id.split('/').pop()
    this._label.textContent = title

    // Update dirty indicator when panel params change
    params.api.onDidParametersChange((e) => {
      const isDirty = e.params?.dirty === true
      this._dirty.classList.toggle('hidden', !isDirty)
    })

    // Close handler with unsaved confirmation
    this._close.addEventListener('pointerdown', (e) => e.preventDefault())
    this._close.addEventListener('click', (e) => {
      e.preventDefault()
      e.stopPropagation()
      const s = panelStore.get(this._api.id)
      if (s?.isDirty) {
        if (!confirm('Hay cambios sin guardar. \u00BFCerrar sin guardar?')) return
      }
      this._api.close()
    })
  }

  dispose () {}
}

/** Watermark shown when no panels are open */
class WelcomeWatermark {
  constructor () {
    this.element = document.createElement('div')
    this.element.className = 'welcome'
    this.element.innerHTML = `
      <div class="welcome-inner">
        <h1>Contextura</h1>
        <p>Selecciona un archivo del \u00E1rbol para empezar.</p>
      </div>
    `
  }

  init () {}
  dispose () {}
}

// ============================================================
// Dockview initialization
// ============================================================

function initDockview () {
  dockview = new DockviewComponent(dockviewContainer, {
    createComponent: (options) => {
      if (options.name === 'editor') return new EditorPanelRenderer()
      return { element: document.createElement('div'), init () {}, dispose () {} }
    },
    createTabComponent: (_options) => new DirtyTabRenderer(),
    createWatermarkComponent: () => new WelcomeWatermark(),
  })

  // Track active panel → update sidebar highlight
  dockview.onDidActivePanelChange((e) => {
    if (e?.id) {
      markActive(e.id)
      revealPath(e.id)
      storage.lastFile.set(e.id)
    }
  })

  // Persist layout on changes (debounced to avoid race conditions during fromJSON)
  dockview.onDidRemovePanel(() => {
    scheduleSaveLayout()
    if (!dockview.activePanel) {
      fileTreeEl.querySelectorAll('.tree-item.active').forEach(el => el.classList.remove('active'))
    }
  })
  dockview.onDidAddPanel(() => scheduleSaveLayout())
  dockview.onDidLayoutChange(() => scheduleSaveLayout())

  // External drag-and-drop: show overlay when dragging files from sidebar
  dockview.onUnhandledDragOverEvent((event) => {
    if (event.nativeEvent.dataTransfer?.types?.includes('application/x-contextura-path')) {
      event.accept()
    }
  })

  // External drag-and-drop: open file at drop position
  dockview.onDidDrop((event) => {
    const path = event.nativeEvent.dataTransfer?.getData('application/x-contextura-path')
    if (!path) return

    const existing = dockview.panels.find(p => p.id === path)
    if (existing) { existing.api.setActive(); return }

    const dirMap = { top: 'above', bottom: 'below', left: 'left', right: 'right' }
    const opts = {
      id: path,
      component: 'editor',
      tabComponent: 'dirty-tab',
      title: path.split('/').pop(),
      params: { path },
    }

    if (event.group) {
      if (event.position === 'center') {
        opts.position = { referenceGroup: event.group.id }
      } else {
        opts.position = { referenceGroup: event.group.id, direction: dirMap[event.position] || event.position }
      }
    }

    dockview.addPanel(opts)
    markActive(path)
    revealPath(path)
    storage.lastFile.set(path)
  })

  // Initial layout
  layoutDockview()

  // Restore layout or last file
  if (!restoreLayout()) {
    const last = storage.lastFile.get()
    if (last) openFile(last)
  }
}

function layoutDockview () {
  if (!dockview) return
  const w = dockviewContainer.offsetWidth
  const h = dockviewContainer.offsetHeight
  if (w > 0 && h > 0) dockview.layout(w, h)
}

// ============================================================
// Sidebar resize (drag handle)
// ============================================================

function setupResizeHandle () {
  let startX = 0
  let startWidth = 0
  let dragging = false

  resizeHandle.addEventListener('mousedown', (e) => {
    e.preventDefault()
    dragging = true
    startX = e.clientX
    startWidth = sidebarEl.offsetWidth
    resizeHandle.classList.add('active')
    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'
  })

  document.addEventListener('mousemove', (e) => {
    if (!dragging) return
    const delta = e.clientX - startX
    const newWidth = Math.max(180, Math.min(startWidth + delta, window.innerWidth * 0.5))
    sidebarEl.style.width = `${newWidth}px`
    layoutDockview()
  })

  document.addEventListener('mouseup', () => {
    if (!dragging) return
    dragging = false
    resizeHandle.classList.remove('active')
    document.body.style.cursor = ''
    document.body.style.userSelect = ''
    storage.sidebarWidth.set(sidebarEl.offsetWidth)
  })

  // Restore saved width
  const savedWidth = storage.sidebarWidth.get()
  if (savedWidth) sidebarEl.style.width = `${savedWidth}px`
}

// ============================================================
// Toggle sidebar
// ============================================================

function toggleSidebar () {
  sidebarVisible = !sidebarVisible
  sidebarEl.classList.toggle('collapsed', !sidebarVisible)
  resizeHandle.classList.toggle('hidden', !sidebarVisible)
  sidebarShowBtn.classList.toggle('visible', !sidebarVisible)
  storage.sidebarVisible.set(sidebarVisible)
  // Re-layout dockview after sidebar animation
  setTimeout(() => layoutDockview(), 200)
}

// ============================================================
// File operations
// ============================================================

async function openFile (path, event) {
  if (!dockview) return

  // If panel already open, activate it (unless Cmd+click for split)
  const existing = dockview.panels.find(p => p.id === path)
  if (existing) {
    existing.api.setActive()
    return
  }

  // Add new panel — Cmd+click opens in a new group to the right
  const fileName = path.split('/').pop()
  const opts = {
    id: path,
    component: 'editor',
    tabComponent: 'dirty-tab',
    title: fileName,
    params: { path },
  }
  if (event?.metaKey || event?.ctrlKey) {
    opts.position = { direction: 'right' }
  }
  dockview.addPanel(opts)

  selectionStore.setFile(path)
  markActive(path)
  revealPath(path)
  storage.lastFile.set(path)
}

function saveActiveFile () {
  if (!dockview) return
  const active = dockview.activePanel
  if (!active) return
  const s = panelStore.get(active.id)
  if (s?.renderer) s.renderer.save()
}

// ============================================================
// File tree rendering
// ============================================================

function makeFileDraggable (element, path, name) {
  element.draggable = true
  element.addEventListener('dragstart', (e) => {
    e.dataTransfer.setData('application/x-contextura-path', path)
    e.dataTransfer.effectAllowed = 'copy'
    element.classList.add('dragging')
    const ghost = document.createElement('div')
    ghost.className = 'drag-ghost'
    ghost.textContent = name
    document.body.appendChild(ghost)
    e.dataTransfer.setDragImage(ghost, 0, 0)
    requestAnimationFrame(() => ghost.remove())
  })
  element.addEventListener('dragend', () => element.classList.remove('dragging'))
}

function renderTree (nodes, container, depth = 0) {
  container.innerHTML = ''
  if (nodes.length === 0) {
    container.innerHTML = '<div class="tree-loading">Sin resultados</div>'
    return
  }
  for (const node of nodes) container.appendChild(createTreeNode(node, depth))
  if (window.lucide) lucide.createIcons({ elements: [container] })
}

function createTreeNode (node, depth) {
  const indent = depth * 14

  if (node.type === 'dir') {
    const wrapper = document.createElement('div')
    const item = document.createElement('div')
    item.className = 'tree-item dir'
    item.style.paddingLeft = `${8 + indent}px`
    item.dataset.path = node.path

    const icon = document.createElement('span')
    icon.className = 'icon'
    icon.appendChild(lucideIcon('chevron-right'))

    const label = document.createElement('span')
    label.className = 'label'
    label.textContent = node.name

    item.appendChild(icon)
    item.appendChild(label)

    const actions = document.createElement('div')
    actions.className = 'tree-item-actions'
    actions.appendChild(createActionButton('file-plus', 'Nuevo archivo aquí', () =>
      startInlineCreate(node.path, 'file', depth, children, item)))
    actions.appendChild(createActionButton('folder-plus', 'Nueva carpeta aquí', () =>
      startInlineCreate(node.path, 'folder', depth, children, item)))
    item.appendChild(actions)

    const children = document.createElement('div')
    children.className = 'tree-children'

    item.addEventListener('click', (e) => {
      e.stopPropagation()
      selectionStore.setDir(node.path)
      markActive(node.path)
      const isOpen = children.classList.contains('open')
      children.classList.toggle('open', !isOpen)
      item.classList.toggle('open', !isOpen)
      if (!isOpen && children.childElementCount === 0) {
        renderTreeChildren(node.children, children, depth + 1)
      }
    })

    wrapper.appendChild(item)
    wrapper.appendChild(children)
    return wrapper
  }

  // File
  const item = document.createElement('div')
  item.className = 'tree-item file'
  item.style.paddingLeft = `${8 + indent + 14}px`
  item.dataset.path = node.path

  const label = document.createElement('span')
  label.className = 'label'
  label.textContent = node.name
  item.appendChild(label)

  if (node.name === 'index.md') {
    const badge = document.createElement('span')
    badge.className = 'index-badge'
    badge.textContent = 'idx'
    item.appendChild(badge)
  }

  item.addEventListener('click', (e) => openFile(node.path, e))
  makeFileDraggable(item, node.path, node.name)

  // Highlight if this file is the active tab
  if (dockview?.activePanel?.id === node.path) {
    item.classList.add('active')
  }

  return item
}

function renderTreeChildren (nodes, container, depth) {
  for (const node of nodes) container.appendChild(createTreeNode(node, depth))
  if (window.lucide) lucide.createIcons({ elements: [container] })
}

function refreshTree () {
  const openPaths = new Set()
  fileTreeEl.querySelectorAll('.tree-item.dir.open').forEach(el => openPaths.add(el.dataset.path))

  renderTree(treeStore.get(), fileTreeEl)

  if (openPaths.size > 0) restoreOpenDirs(fileTreeEl, openPaths)
  if (dockview?.activePanel) markActive(dockview.activePanel.id)
}

function restoreOpenDirs (container, openPaths) {
  container.querySelectorAll('.tree-item.dir').forEach(item => {
    if (openPaths.has(item.dataset.path)) {
      const wrapper = item.parentElement
      const children = wrapper.querySelector('.tree-children')
      if (children) {
        item.classList.add('open')
        children.classList.add('open')
        const node = treeStore.findByPath(item.dataset.path)
        if (node && children.childElementCount === 0) {
          const depth = Math.floor((parseInt(item.style.paddingLeft) - 8) / 14)
          renderTreeChildren(node.children, children, depth)
        }
      }
    }
  })
}

function markActive (path) {
  fileTreeEl.querySelectorAll('.tree-item.active').forEach(el => el.classList.remove('active'))
  fileTreeEl.querySelectorAll(`.tree-item[data-path="${CSS.escape(path)}"]`).forEach(el => el.classList.add('active'))
}

function revealPath (path) {
  const parts = path.split('/')
  let cumPath = ''
  for (let i = 0; i < parts.length - 1; i++) {
    cumPath = cumPath ? `${cumPath}/${parts[i]}` : parts[i]
    const dirItem = fileTreeEl.querySelector(`.tree-item.dir[data-path="${CSS.escape(cumPath)}"]`)
    if (dirItem) {
      const wrapper = dirItem.parentElement
      const children = wrapper.querySelector('.tree-children')
      if (children && !children.classList.contains('open')) {
        dirItem.classList.add('open')
        children.classList.add('open')
        const node = treeStore.findByPath(cumPath)
        if (node && children.childElementCount === 0) {
          const depth = Math.floor((parseInt(dirItem.style.paddingLeft) - 8) / 14)
          renderTreeChildren(node.children, children, depth + 1)
        }
      }
    }
  }
}

// ============================================================
// Search
// ============================================================

searchInput.addEventListener('input', () => {
  const query = searchInput.value.trim()
  if (!query) {
    renderTree(treeStore.get(), fileTreeEl)
    if (dockview?.activePanel) { revealPath(dockview.activePanel.id); markActive(dockview.activePanel.id) }
    return
  }
  const filtered = filterTree(query, treeStore.get())
  renderFilteredTree(filtered, fileTreeEl, query)
})

function filterTree (query, nodes) {
  const q = query.toLowerCase()
  const result = []
  for (const node of nodes) {
    if (node.type === 'file' && (node.name.toLowerCase().includes(q) || node.path.toLowerCase().includes(q))) {
      result.push(node)
    } else if (node.children) {
      const sub = filterTree(query, node.children)
      if (sub.length > 0) result.push({ ...node, children: sub })
    }
  }
  return result
}

function renderFilteredTree (nodes, container, query) {
  container.innerHTML = ''
  if (nodes.length === 0) { container.innerHTML = '<div class="tree-loading">Sin resultados</div>'; return }
  flattenNodes(nodes).filter(n => n.type === 'file').forEach(node => {
    const item = document.createElement('div')
    item.className = 'tree-item file'
    item.style.paddingLeft = '8px'
    item.dataset.path = node.path
    const label = document.createElement('span')
    label.className = 'label'
    label.innerHTML = highlightMatch(node.path, query)
    item.appendChild(label)
    item.addEventListener('click', (e) => openFile(node.path, e))
    makeFileDraggable(item, node.path, node.name)
    container.appendChild(item)
  })
}

function flattenNodes (nodes, acc = []) {
  for (const n of nodes) { acc.push(n); if (n.children) flattenNodes(n.children, acc) }
  return acc
}

function highlightMatch (text, query) {
  const idx = text.toLowerCase().indexOf(query.toLowerCase())
  if (idx === -1) return escapeHtml(text)
  return escapeHtml(text.slice(0, idx)) +
    `<span class="highlight">${escapeHtml(text.slice(idx, idx + query.length))}</span>` +
    escapeHtml(text.slice(idx + query.length))
}

// ============================================================
// Inline file/folder creation (VS Code-like)
// ============================================================

function createActionButton (iconName, title, onClick) {
  const btn = document.createElement('button')
  btn.className = 'tree-action-btn'
  btn.title = title
  btn.appendChild(lucideIcon(iconName))
  btn.addEventListener('click', (e) => { e.stopPropagation(); onClick() })
  return btn
}

function startInlineCreate (parentPath, type, depth, childrenEl, folderItemEl) {
  cancelInlineCreate()

  if (folderItemEl && !childrenEl.classList.contains('open')) {
    childrenEl.classList.add('open')
    folderItemEl.classList.add('open')
    if (childrenEl.childElementCount === 0) {
      const node = treeStore.findByPath(parentPath)
      if (node) renderTreeChildren(node.children, childrenEl, depth + 1)
    }
  }

  const childDepth = depth + 1
  const indent = type === 'file'
    ? 8 + childDepth * 14 + 14
    : 8 + childDepth * 14

  const draft = document.createElement('div')
  draft.className = 'tree-item tree-draft'
  draft.dataset.draft = 'true'
  draft.style.paddingLeft = `${indent}px`

  const icon = document.createElement('span')
  icon.className = 'icon draft-icon'
  icon.appendChild(lucideIcon(type === 'file' ? 'file' : 'folder'))

  const input = document.createElement('input')
  input.className = 'draft-input'
  input.type = 'text'
  input.placeholder = type === 'file' ? 'nombre.md' : 'nueva-carpeta'
  input.autocomplete = 'off'
  input.spellcheck = false

  draft.appendChild(icon)
  draft.appendChild(input)
  childrenEl.insertBefore(draft, childrenEl.firstChild)
  input.focus()

  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { e.preventDefault(); commitInlineCreate(parentPath, type, input.value.trim()) }
    if (e.key === 'Escape') { e.preventDefault(); cancelInlineCreate() }
  })

  function onOutsideClick (e) {
    if (!draft.contains(e.target)) {
      cancelInlineCreate()
      document.removeEventListener('mousedown', onOutsideClick, true)
    }
  }
  document.addEventListener('mousedown', onOutsideClick, true)
  draft._cleanup = () => document.removeEventListener('mousedown', onOutsideClick, true)
}

function cancelInlineCreate () {
  const existing = document.querySelector('[data-draft]')
  if (!existing) return
  if (existing._cleanup) existing._cleanup()
  existing.remove()
}

async function commitInlineCreate (parentPath, type, rawName) {
  cancelInlineCreate()
  if (!rawName) return

  let filePath
  if (type === 'file') {
    const name = rawName.endsWith('.md') ? rawName : rawName + '.md'
    filePath = parentPath ? `${parentPath}/${name}` : name
  } else {
    const folderName = rawName.replace(/\//g, '-')
    filePath = parentPath ? `${parentPath}/${folderName}/index.md` : `${folderName}/index.md`
  }
  await createFile(filePath)
}

function handleHeaderCreate (type) {
  let parentPath = ''
  let depth = -1
  let childrenEl = fileTreeEl
  let folderItemEl = null

  const selPath = selectionStore.path
  const selType = selectionStore.type
  let contextPath = null
  if (selType === 'dir' && selPath) {
    contextPath = selPath
  } else if (selPath) {
    const parts = selPath.split('/')
    parts.pop()
    contextPath = parts.join('/') || null
  }

  if (contextPath) {
    const dirItem = fileTreeEl.querySelector(`.tree-item.dir[data-path="${CSS.escape(contextPath)}"]`)
    if (dirItem) {
      depth = Math.floor((parseInt(dirItem.style.paddingLeft) - 8) / 14)
      folderItemEl = dirItem
      childrenEl = dirItem.parentElement.querySelector('.tree-children')
    } else {
      parentPath = contextPath
    }
  }

  if (folderItemEl) parentPath = contextPath
  startInlineCreate(parentPath, type, depth, childrenEl, folderItemEl)
}

async function createFile (path) {
  const res = await api.putFile(path, '')
  if (!res.ok) { alert('No se pudo crear el archivo.'); return }
  await loadTree()
  refreshTree()
  await openFile(path)
}

// ============================================================
// Sidebar buttons
// ============================================================

btnNewFile.addEventListener('click', () => handleHeaderCreate('file'))
btnNewFolder.addEventListener('click', () => handleHeaderCreate('folder'))

btnCollapseAll.addEventListener('click', () => {
  cancelInlineCreate()
  fileTreeEl.querySelectorAll('.tree-item.dir.open').forEach(item => {
    item.classList.remove('open')
    const children = item.parentElement.querySelector('.tree-children')
    if (children) children.classList.remove('open')
  })
})

btnToggleSidebar.addEventListener('click', () => toggleSidebar())
sidebarShowBtn.addEventListener('click', () => toggleSidebar())

// ============================================================
// Keyboard shortcuts
// ============================================================

function setupKeybindings () {
  document.addEventListener('keydown', (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 's') {
      e.preventDefault()
      saveActiveFile()
    }
    if ((e.metaKey || e.ctrlKey) && e.key === 'b') {
      e.preventDefault()
      toggleSidebar()
    }
  })
}

// ============================================================
// SSE — live reload
// ============================================================

function setupSSE () {
  connectSSE((data) => {
    loadTree().then(() => {
      if (!searchInput.value.trim()) refreshTree()
    })
    // Reload any open panel for this file (if not dirty and not just saved by this client)
    for (const s of panelStore.values()) {
      if (data.path.endsWith(s.path) && !s.isDirty) {
        if (!s.renderer.consumeJustSaved()) {
          s.renderer.loadContent()
        }
        // The dirty state vs HEAD may have changed — invalidate cached timeline
        if (s.renderer._historyView) s.renderer._historyView.invalidate()
      }
    }
  })
}

// ============================================================
// Layout persistence
// ============================================================

let _saveTimer = null

function scheduleSaveLayout () {
  clearTimeout(_saveTimer)
  _saveTimer = setTimeout(saveLayout, 300)
}

function saveLayout () {
  if (!dockview || isRestoringLayout) return
  try {
    const data = dockview.toJSON()
    // Only save if there are panels — avoid overwriting with empty state
    if (data?.panels && Object.keys(data.panels).length > 0) {
      storage.layout.set(JSON.stringify(data))
    }
  } catch (e) {
    console.warn('Failed to save layout', e)
  }
}

function restoreLayout () {
  const saved = storage.layout.get()
  if (!saved) return false
  try {
    const data = JSON.parse(saved)
    if (!data?.panels || Object.keys(data.panels).length === 0) return false
    isRestoringLayout = true
    dockview.fromJSON(data)
    layoutDockview()
    // Keep guard active briefly to block any async events from fromJSON
    setTimeout(() => { isRestoringLayout = false }, 500)
    return true
  } catch (e) {
    isRestoringLayout = false
    console.warn('Failed to restore layout', e)
    storage.layout.remove()
    return false
  }
}

// ============================================================
// Data loading
// ============================================================

async function loadTree () {
  treeStore.set(await api.getTree())
}

// ============================================================
// Boot
// ============================================================

async function init () {
  await loadTree()

  renderTree(treeStore.get(), fileTreeEl)
  if (window.lucide) lucide.createIcons()

  initDockview()
  setupResizeHandle()
  setupSSE()
  setupKeybindings()

  // Restore sidebar state
  if (!storage.sidebarVisible.get()) {
    sidebarVisible = true
    toggleSidebar()
  }

  // Handle window resize
  window.addEventListener('resize', () => layoutDockview())

  connectMenuActions({
    'new-file': () => btnNewFile?.click(),
    'toggle-sidebar': toggleSidebar,
    save: saveActiveFile,
    'toggle-history': () => {
      const active = dockview?.activePanel
      if (!active) return
      const renderer = panelStore.get(active.id)?.renderer
      if (!renderer) return
      if (renderer._mode === 'history') renderer._exitHistoryMode()
      else renderer._enterHistoryMode()
    },
  })
}

init().catch(console.error)
