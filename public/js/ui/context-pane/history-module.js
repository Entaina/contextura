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

export class HistoryModule {
  /**
   * @param {Object} opts
   * @param {(version: object) => void} opts.onVersionSelect
   *   Invoked when the user clicks a timeline entry. The `version` object is
   *   either `{ kind: 'current' }` for the "Versión actual" entry or a git
   *   commit descriptor for any other row.
   * @param {(path: string) => boolean} [opts.isEditorDirty]
   *   Returns true if the Toast UI editor for `path` has unsaved edits.
   *   Used to decide whether HEAD can be absorbed into "Versión actual".
   */
  constructor ({ onVersionSelect, isEditorDirty }) {
    this.element = document.createElement('div')
    this.element.className = 'context-history'

    this._timeline = document.createElement('div')
    this._timeline.className = 'context-history-timeline'

    this.element.appendChild(this._timeline)

    this._onVersionSelect = onVersionSelect || (() => {})
    this._isEditorDirty = isEditorDirty || (() => false)

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

  /**
   * Mark a path's cache as stale. Called from the SSE watcher when the file
   * changes on disk.
   * @param {string} path
   */
  invalidate (path) {
    if (path) this._cache.delete(path)
    else this._cache.clear()
  }

  /**
   * Re-render the timeline from the cached state for the current path. Called
   * when the editor's dirty flag transitions, so HEAD absorption and the
   * "Versión actual" subtitle stay in sync with in-memory edits without
   * refetching git history.
   */
  refresh () {
    if (this._state) this._renderTimeline(this._state)
  }

  _renderTimeline ({ versions, hasUncommittedChanges }) {
    const frag = document.createDocumentFragment()
    const editorDirty = this._isEditorDirty(this._path)
    const currentEqualsHead = !hasUncommittedChanges && !editorDirty && versions.length > 0

    frag.appendChild(this._buildCurrentItem({ editorDirty, gitDirty: hasUncommittedChanges }))

    versions.forEach((v, i) => {
      if (currentEqualsHead && i === 0) return
      frag.appendChild(this._buildCommitItem(v))
    })

    this._timeline.innerHTML = ''
    this._timeline.appendChild(frag)
    this._applySelection()
  }

  _buildCurrentItem ({ editorDirty, gitDirty }) {
    const item = document.createElement('div')
    item.className = 'context-history-item current'
    item.dataset.key = 'current'
    let subtitleText = ''
    if (editorDirty) subtitleText = 'Sin guardar'
    else if (gitDirty) subtitleText = 'Sin confirmar'
    const subtitle = subtitleText
      ? `<div class="context-history-subject"><em>${subtitleText}</em></div>`
      : ''
    item.innerHTML = `
      <div class="context-history-dot"></div>
      <div class="context-history-body">
        <div class="context-history-title-row">
          <div class="context-history-title">Versión actual</div>
        </div>
        ${subtitle}
      </div>
    `
    item.addEventListener('click', () => {
      this._selectedKey = 'current'
      this._applySelection()
      this._onVersionSelect({ kind: 'current' })
    })
    return item
  }

  _buildCommitItem (v) {
    const item = document.createElement('div')
    item.className = 'context-history-item'
    item.dataset.key = v.sha
    item.title = absoluteDateEs(v.dateIso)
    const subject = v.subject ? escapeHtml(v.subject) : '<em>sin descripción</em>'
    const badge = versionTypeBadge(v)
    const titleHtml = escapeHtml(relativeTimeEs(v.dateIso))
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
      this._onVersionSelect(v)
    })
    return item
  }

  _applySelection () {
    this._timeline.querySelectorAll('.context-history-item').forEach(el => {
      el.classList.toggle('active', el.dataset.key === this._selectedKey)
    })
  }
}
