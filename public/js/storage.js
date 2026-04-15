/**
 * Typed adapter over `localStorage` for keys under the `contextura:*` namespace.
 * Everything the frontend persists client-side goes through this module so
 * key naming stays in one place and the app never touches `localStorage` directly.
 *
 * The process main persists a separate set of keys (root folder, window geometry)
 * via the Electron config file — those are not this module's concern.
 */

const NS = 'contextura'
const k = (key) => `${NS}:${key}`

const raw = {
  get: (key) => window.localStorage.getItem(k(key)),
  set: (key, value) => window.localStorage.setItem(k(key), value),
  remove: (key) => window.localStorage.removeItem(k(key)),
}

/**
 * Last file opened in the current session (used to restore on next boot).
 */
export const lastFile = {
  /** @returns {string | null} */
  get: () => raw.get('last'),
  /** @param {string} path */
  set: (path) => raw.set('last', path),
}

/**
 * Sidebar width in pixels (resize handle persistence).
 */
export const sidebarWidth = {
  /** @returns {number | null} */
  get: () => {
    const v = raw.get('sidebar-width')
    return v == null ? null : Number(v)
  },
  /** @param {number} px */
  set: (px) => raw.set('sidebar-width', String(px)),
}

/**
 * Sidebar visibility (`true` = visible, `false` = collapsed).
 */
export const sidebarVisible = {
  /** @returns {boolean} Defaults to `true` when unset. */
  get: () => raw.get('sidebar-visible') !== '0',
  /** @param {boolean} visible */
  set: (visible) => raw.set('sidebar-visible', visible ? '1' : '0'),
}

/**
 * Context pane width in pixels (right-side resize handle persistence).
 */
export const contextPaneWidth = {
  /** @returns {number | null} */
  get: () => {
    const v = raw.get('context-pane-width')
    return v == null ? null : Number(v)
  },
  /** @param {number} px */
  set: (px) => raw.set('context-pane-width', String(px)),
}

/**
 * Context pane visibility (`true` = visible, `false` = collapsed).
 */
export const contextPaneVisible = {
  /** @returns {boolean} Defaults to `true` when unset. */
  get: () => raw.get('context-pane-visible') !== '0',
  /** @param {boolean} visible */
  set: (visible) => raw.set('context-pane-visible', visible ? '1' : '0'),
}

/**
 * Per-file editor mode: 'wysiwyg' or 'markdown'.
 */
export const editMode = {
  /** @param {string} path */
  get: (path) => raw.get(`edit-mode:${path}`),
  /** @param {string} path @param {'wysiwyg' | 'markdown'} mode */
  set: (path, mode) => raw.set(`edit-mode:${path}`, mode),
}

/**
 * Serialized Dockview layout (panels, splits, sizes). Stored as JSON string.
 */
export const layout = {
  /** @returns {string | null} */
  get: () => raw.get('layout'),
  /** @param {string} json */
  set: (json) => raw.set('layout', json),
  remove: () => raw.remove('layout'),
}
