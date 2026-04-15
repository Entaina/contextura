/**
 * DiffView — embeddable diff viewer inside an EditorPanelRenderer.
 *
 * Renders the Google-Docs-style inline diff for a single version of a file,
 * plus the restore toolbar. The version to show is pushed in from outside
 * (via `showVersion(version)`) — usually from the right-side context pane's
 * history timeline. This view owns no timeline of its own; selection happens
 * elsewhere.
 *
 * Diffs are always computed against the **live editor content**, provided
 * by `setCurrentContentProvider(fn)`. This makes in-memory edits visible in
 * every historical diff and keeps the "Versión actual" semantics honest.
 *
 * Relies on:
 * - `api.*` for restore (putFile) and fetching historical commit content.
 * - Toast UI's `window.markdownit` (loaded via index.html).
 * - `htmldiff-js` loaded dynamically from CDN the first time a diff renders.
 */

import * as api from '../../api.js'
import { escapeHtml } from '../../infra/dom.js'
import { absoluteDateEs, firstName, relativeTimeEs } from '../../domain/date-es.js'

const INLINE_DIFF_SIZE_LIMIT = 200_000
const HTMLDIFF_CDN = 'https://cdn.jsdelivr.net/npm/htmldiff-js@1.0.5/+esm'

export class DiffView {
  constructor () {
    this.element = document.createElement('div')
    this.element.className = 'diff-view'

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

    this.element.appendChild(this._diffToolbar)
    this.element.appendChild(this._diffContainer)

    this._restoreBtn = this._diffToolbar.querySelector('.history-restore-btn')
    this._contextLabel = this._diffToolbar.querySelector('.history-diff-context')
    this._restoreBtn.addEventListener('click', () => this.restoreVersion())

    this._path = null
    this._selectedOldContent = null
    this._selectedLabel = null
    this._md = null
    this._getCurrentContent = null

    /** Parent-provided callback — invoked after a successful restore. */
    this.onAfterRestore = null
  }

  setPath (path) {
    this._path = path
  }

  /**
   * Inject the live-editor content provider. The returned string is used as
   * the "new" side of every diff so in-memory edits are always reflected.
   * @param {() => string} fn
   */
  setCurrentContentProvider (fn) {
    this._getCurrentContent = fn
  }

  /**
   * Render the inline diff for a specific version.
   *
   * @param {object} version History version descriptor (sha, status, …).
   */
  async showVersion (version) {
    this._selectedLabel = `${relativeTimeEs(version.dateIso)} (${absoluteDateEs(version.dateIso)})`

    if (this._contextLabel) {
      this._contextLabel.textContent =
        `Cambios de ${relativeTimeEs(version.dateIso)} → versión actual`
    }
    this._diffContainer.innerHTML = '<div class="history-empty">Cargando cambios…</div>'
    this._restoreBtn.classList.add('hidden')

    try {
      const oldContent = await this._fetchContentAt(version)
      this._selectedOldContent = oldContent

      const newContent = this._getCurrentContent ? (this._getCurrentContent() ?? '') : ''

      if (oldContent == null && version?.status !== 'A') {
        this._diffContainer.innerHTML = '<div class="history-empty">Esta versión no existía en esa fecha.</div>'
        return
      }

      const totalSize = (oldContent?.length || 0) + (newContent.length || 0)
      if (totalSize > INLINE_DIFF_SIZE_LIMIT) {
        this._diffContainer.innerHTML = `
          <div class="history-empty">
            <strong>Documento demasiado grande para ver los cambios inline.</strong>
            <p>${Math.round(totalSize / 1000)} KB. Usa "Restaurar esta versión" si quieres recuperar este contenido.</p>
          </div>
        `
        this._restoreBtn.classList.remove('hidden')
        return
      }

      await this._renderInlineDiff(oldContent, newContent, version)
      this._restoreBtn.classList.remove('hidden')
    } catch (err) {
      console.error('diff view showVersion error', err)
      this._diffContainer.innerHTML = '<div class="history-empty">No se pudieron cargar los cambios.</div>'
      this._restoreBtn.classList.add('hidden')
    }
  }

  async _renderInlineDiff (oldContent, newContent, version) {
    const md = this._ensureMarkdown()
    if (!md) {
      this._diffContainer.innerHTML = '<div class="history-empty">No se pudo cargar el parser de markdown.</div>'
      return
    }

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

    if (!hasContentChanges) {
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
      this._diffContainer.innerHTML = '<div class="history-empty">Esta versión es idéntica al archivo actual.</div>'
      return
    }

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

  async _fetchContentAt (version) {
    try {
      const res = await api.getContentAt(this._path, version.sha, version.path)
      if (!res.ok) return null
      const data = await res.json()
      return data.content
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
      const mod = await import(HTMLDIFF_CDN)
      const candidate = mod?.default?.default || mod?.default || mod
      if (candidate && typeof candidate.execute === 'function') {
        window.HtmlDiff = candidate
        return candidate
      }
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
    this._selectedOldContent = null
    this.onAfterRestore = null
  }
}
