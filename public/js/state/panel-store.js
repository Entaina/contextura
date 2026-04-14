/**
 * Panel state store. Holds per-Dockview-panel bookkeeping: the file path
 * displayed, the Toast UI editor instance, dirty status, and a back-reference
 * to the renderer that owns the panel. Keyed by panel id (which, by
 * convention, equals the file path for editor panels).
 *
 * The API mirrors a subset of `Map` so renaming callsites from `panelState`
 * to `panelStore` is a pure identifier change.
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
  /**
   * Convenience mutator used by the editor change handler.
   * @param {string} id @param {boolean} dirty
   */
  markDirty: (id, dirty) => {
    const s = _panels.get(id)
    if (s) s.isDirty = dirty
  },
}
