/**
 * History module — timeline of git versions for a file, rendered inside the
 * right context pane. Fetches via `/api/history`, caches per-path, emits a
 * callback when the user clicks a version. The diff rendering itself lives
 * in the editor panel (diff mode) — this module owns only the timeline.
 */

import * as api from '../../api.js'
import { escapeHtml } from '../../infra/dom.js'
import { absoluteDateEs, firstName, relativeTimeEs } from '../../domain/date-es.js'
import { versionTypeBadge } from '../../domain/version-badge.js'

const ICON_WARN = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 8v4M12 16h.01"/></svg>'

export class HistoryModule {
  /**
   * @param {Object} opts
   * @param {(version: object, ctx: {
   *   versions: object[],
   *   hasUncommittedChanges: boolean,
   *   untracked: boolean,
   * }) => void} opts.onVersionSelect
   */
  constructor ({ onVersionSelect }) {
    this.element = document.createElement('div')
    this.element.className = 'context-history'

    this._timeline = document.createElement('div')
    this._timeline.className = 'context-history-timeline'

    this.element.appendChild(this._timeline)

    this._onVersionSelect = onVersionSelect || (() => {})

    this._path = null
    this._selectedKey = null
    /** @type {Map<string, {versions: object[], hasUncommittedChanges: boolean, untracked: boolean, notInGit: boolean}>} */
    this._cache = new Map()
    /** Current path's loaded state, shared with click handlers for ctx. */
    this._state = null
  }

  setPath (path) {
    if (this._path === path) return
    this._path = path
    this._selectedKey = null
  }

  async load () {
    if (!this._path) return
    const cached = this._cache.get(this._path)
    if (cached) {
      this._state = cached
      this._renderTimeline(cached)
      return
    }
    this._timeline.innerHTML = '<div class="context-history-empty">Cargando historial…</div>'
    try {
      const data = await api.getHistory(this._path)
      const state = {
        versions: data.versions || [],
        hasUncommittedChanges: !!data.hasUncommittedChanges,
        untracked: !!data.untracked,
        notInGit: !!data.notInGit,
      }
      this._cache.set(this._path, state)
      this._state = state
      this._renderTimeline(state)
    } catch {
      this._timeline.innerHTML = '<div class="context-history-empty">No se pudo cargar el historial.</div>'
    }
  }

  _ctxForClick () {
    return {
      versions: this._state?.versions || [],
      hasUncommittedChanges: !!this._state?.hasUncommittedChanges,
      untracked: !!this._state?.untracked,
    }
  }

  /**
   * Mark a path's cache as stale. Called from the SSE watcher when the file
   * changes on disk.
   * @param {string} path
   */
  invalidate (path) {
    if (path) this._cache.delete(path)
    else this._cache.clear()
  }

  _renderTimeline ({ versions, hasUncommittedChanges, untracked, notInGit }) {
    if (notInGit && !hasUncommittedChanges) {
      this._timeline.innerHTML = `
        <div class="context-history-empty">
          <strong>Sin historial todavía.</strong>
          <p>Se creará cuando este fichero se guarde en un commit.</p>
        </div>
      `
      return
    }

    const frag = document.createDocumentFragment()
    const dirty = hasUncommittedChanges

    if (dirty) {
      frag.appendChild(this._buildUncommittedItem(untracked))
    }

    versions.forEach((v, i) => {
      const isHeadClean = !dirty && i === 0
      frag.appendChild(this._buildCommitItem(v, isHeadClean))
    })

    this._timeline.innerHTML = ''
    this._timeline.appendChild(frag)
    this._applySelection()
  }

  _buildUncommittedItem (untracked) {
    const subtitle = untracked
      ? 'Aún no añadido al historial'
      : 'Con cambios sin confirmar'

    const item = document.createElement('div')
    item.className = 'context-history-item uncommitted'
    item.dataset.key = 'uncommitted'
    item.innerHTML = `
      <div class="context-history-dot"></div>
      <div class="context-history-body">
        <div class="context-history-title-row">
          <span class="context-history-badge type-uncommitted" title="Cambios sin confirmar">${ICON_WARN}</span>
          <div class="context-history-title">Versión actual</div>
        </div>
        <div class="context-history-subject"><em>${subtitle}</em></div>
      </div>
    `
    item.addEventListener('click', () => {
      this._selectedKey = 'uncommitted'
      this._applySelection()
      this._onVersionSelect({ status: 'U', untracked }, this._ctxForClick())
    })
    return item
  }

  _buildCommitItem (v, isHeadClean) {
    const item = document.createElement('div')
    item.className = 'context-history-item' + (isHeadClean ? ' head-current' : '')
    item.dataset.key = v.sha
    item.title = absoluteDateEs(v.dateIso)
    const subject = v.subject ? escapeHtml(v.subject) : '<em>sin descripción</em>'
    const badge = versionTypeBadge(v)
    const timeLabel = escapeHtml(relativeTimeEs(v.dateIso))
    const titleHtml = isHeadClean
      ? `<span class="context-history-current-tag">Versión actual</span>${timeLabel}`
      : timeLabel
    item.innerHTML = `
      <div class="context-history-dot"></div>
      <div class="context-history-body">
        <div class="context-history-title-row">
          <span class="context-history-badge ${badge.className}" title="${escapeHtml(badge.tooltip)}">${badge.icon}</span>
          <div class="context-history-title">${titleHtml}</div>
        </div>
        <div class="context-history-author">${escapeHtml(firstName(v.authorName))}</div>
        <div class="context-history-subject">${subject}</div>
      </div>
    `
    item.addEventListener('click', () => {
      this._selectedKey = v.sha
      this._applySelection()
      this._onVersionSelect(v, this._ctxForClick())
    })
    return item
  }

  _applySelection () {
    this._timeline.querySelectorAll('.context-history-item').forEach(el => {
      el.classList.toggle('active', el.dataset.key === this._selectedKey)
    })
  }
}
