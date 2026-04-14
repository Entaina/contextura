/**
 * HistoryView — embeddable history viewer inside an EditorPanelRenderer.
 *
 * Builds only the body (timeline + diff toolbar + diff container). The parent
 * owns the header/breadcrumb. Controlled via setPath / load / dispose.
 * Communicates back via the `onAfterRestore` callback.
 *
 * Relies on:
 * - `api.*` for all HTTP I/O (history, file, diff, content, putFile).
 * - Toast UI's `window.markdownit` (loaded via index.html).
 * - `htmldiff-js` loaded dynamically from CDN the first time a diff renders.
 */

import * as api from '../../api.js'
import { escapeHtml } from '../../infra/dom.js'
import { absoluteDateEs, firstName, relativeTimeEs } from '../../domain/date-es.js'
import { versionTypeBadge } from '../../domain/version-badge.js'

const INLINE_DIFF_SIZE_LIMIT = 200_000
const HTMLDIFF_CDN = 'https://cdn.jsdelivr.net/npm/htmldiff-js@1.0.5/+esm'
const ICON_WARN = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 8v4M12 16h.01"/></svg>'

export class HistoryView {
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

    /** Parent-provided callback — invoked after a successful restore. */
    this.onAfterRestore = null
  }

  setPath (path) {
    this._path = path
    this._loaded = false
  }

  async load () {
    if (this._loaded) return
    this._loaded = true
    await this.loadHistory()
  }

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

    if (dirty) {
      frag.appendChild(this._buildUncommittedItem())
    }

    this._versions.forEach((v, i) => {
      const isHeadClean = !dirty && i === 0
      frag.appendChild(this._buildCommitItem(v, isHeadClean))
    })

    this._timeline.innerHTML = ''
    this._timeline.appendChild(frag)
  }

  /**
   * Synthetic "Versión actual" item — only when there ARE uncommitted changes
   * (dirty or untracked). When the working tree is clean, the latest commit
   * itself gets the "Versión actual" tag via `_buildCommitItem + isHeadClean`.
   */
  _buildUncommittedItem () {
    const subtitle = this._untracked
      ? 'Aún no añadido al historial'
      : 'Con cambios sin confirmar'

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
      const oldContent = await this._fetchContentAt(version)
      this._selectedOldContent = oldContent

      // When the working tree is dirty, historical diffs compare against HEAD
      // (not disk) so local edits don't pollute them. Local edits live in the
      // synthetic "Versión actual" entry.
      let newContent
      if (dirty && this._versions.length > 0) {
        newContent = (await this._fetchContentAt(this._versions[0])) || ''
      } else {
        const newRes = await api.getFile(this._path)
        if (!newRes.ok) throw new Error('file fetch failed')
        newContent = await newRes.text()
      }

      if (oldContent == null && version?.status !== 'A') {
        this._diffContainer.innerHTML = '<div class="history-empty">Esta versión no existía en esa fecha.</div>'
        return
      }

      // htmldiff is O(n²) — refuse to render past this threshold.
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

      await this._renderInlineDiff(oldContent, newContent, version, { isHeadClean, isHeadDirty })
      // Restore never applies when this commit IS already the working-tree
      // state (clean head). It DOES apply when isHeadDirty — restoring means
      // "discard my uncommitted edits".
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

    // Case 1 — initial creation (A): render historical content as prose.
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

    // Case 2 — no content differences vs the "new" side of the diff.
    if (!hasContentChanges) {
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
      // The +esm wrapper returns an object whose default is the HtmlDiff class.
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
    this._versions = []
    this._selectedOldContent = null
    this.onAfterRestore = null
  }
}
