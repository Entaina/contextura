/**
 * Pure path helpers for repo-relative slash-separated paths (always forward
 * slashes; Contextura never stores OS-native paths on the frontend).
 */

/**
 * Last segment of a path. Returns the input unchanged when there is no
 * slash, and '' for empty/nullish input.
 *
 * @param {string | null | undefined} path
 * @returns {string}
 */
export function basename (path) {
  if (!path) return ''
  const idx = path.lastIndexOf('/')
  return idx === -1 ? path : path.slice(idx + 1)
}

/**
 * Parent directory of a path. Returns `null` for a top-level node (no
 * parent) and for empty/nullish input.
 *
 * @param {string | null | undefined} path
 * @returns {string | null}
 */
export function parentPath (path) {
  if (!path) return null
  const idx = path.lastIndexOf('/')
  return idx === -1 ? null : path.slice(0, idx)
}
