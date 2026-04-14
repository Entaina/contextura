/**
 * Selection store. Tracks the last node the user clicked in the sidebar tree
 * (file or directory). Used by the inline create flow to decide where a new
 * file/folder lands when the "new" button is pressed from the sidebar header.
 *
 * Not persisted — resets every session.
 */

/** @type {string | null} */
let _path = null
/** @type {'file' | 'dir' | null} */
let _type = null

export const selectionStore = {
  /** @returns {string | null} */
  get path () { return _path },
  /** @returns {'file' | 'dir' | null} */
  get type () { return _type },
  /** @param {string} path */
  setFile (path) { _path = path; _type = 'file' },
  /** @param {string} path */
  setDir (path) { _path = path; _type = 'dir' },
  clear () { _path = null; _type = null },
}
