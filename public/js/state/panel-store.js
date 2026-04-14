/**
 * Per-Dockview-panel bookkeeping: file path, Toast UI editor instance,
 * dirty flag, and a back-reference to the renderer. Keyed by panel id,
 * which for editor panels equals the file path.
 */

/**
 * @typedef {Object} PanelState
 * @property {string} path
 * @property {any} editor Toast UI Editor instance.
 * @property {boolean} isDirty
 * @property {any} renderer Back-reference to the `EditorPanelRenderer`.
 */

/** @type {Map<string, PanelState>} */
const _panels = new Map()

export const panelStore = {
  /** @param {string} id @returns {PanelState | undefined} */
  get: (id) => _panels.get(id),
  /** @param {string} id @param {PanelState} state */
  set: (id, state) => { _panels.set(id, state) },
  /** @param {string} id */
  delete: (id) => { _panels.delete(id) },
  /** @returns {IterableIterator<PanelState>} */
  values: () => _panels.values(),
}
