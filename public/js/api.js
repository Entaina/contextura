/**
 * HTTP client for the Contextura backend (`server.mjs`).
 * Every `/api/*` call the frontend makes goes through this module so URL
 * construction, query encoding and content-type headers live in one place.
 *
 * Errors are surfaced as rejected promises or as documented nullable returns —
 * callers decide how to render the failure.
 */

/**
 * @typedef {Object} TreeNode
 * @property {string} path
 * @property {string} name
 * @property {'file' | 'dir'} type
 * @property {TreeNode[]} [children]
 */

const q = (params) =>
  new URLSearchParams(Object.entries(params).filter(([, v]) => v != null)).toString()

/**
 * Fetch the full file tree from the configured root.
 * @returns {Promise<TreeNode[]>}
 */
export async function getTree () {
  const res = await fetch('/api/tree')
  if (!res.ok) throw new Error(`GET /api/tree failed: ${res.status}`)
  return res.json()
}

/**
 * Fetch the raw text content of a file.
 * @param {string} path Repo-relative file path.
 * @returns {Promise<Response>} Raw response so callers can distinguish ok/404.
 */
export function getFile (path) {
  return fetch(`/api/file?${q({ path })}`)
}

/**
 * Write the raw text content of a file (creates it if missing).
 * @param {string} path Repo-relative file path.
 * @param {string} content
 * @returns {Promise<Response>}
 */
export function putFile (path, content) {
  return fetch(`/api/file?${q({ path })}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    body: content,
  })
}

/**
 * Fetch the Git history for a file (list of versions with status/similarity).
 * @param {string} path
 * @returns {Promise<{ versions: object[] }>}
 */
export async function getHistory (path) {
  const res = await fetch(`/api/history?${q({ path })}`)
  if (!res.ok) throw new Error(`GET /api/history failed: ${res.status}`)
  return res.json()
}

/**
 * Fetch a pre-rendered diff between the working copy and a given revision.
 * @param {string} path
 * @param {string} rev SHA of the revision to compare against.
 * @param {string} [revPath] Optional historical path (renames).
 * @returns {Promise<Response>}
 */
export function getDiff (path, rev, revPath) {
  return fetch(`/api/diff?${q({ path, rev, revPath })}`)
}

/**
 * Fetch the raw content of a file at a specific revision.
 * @param {string} path
 * @param {string} rev SHA of the revision.
 * @param {string} [revPath] Optional historical path (renames).
 * @returns {Promise<Response>}
 */
export function getContentAt (path, rev, revPath) {
  return fetch(`/api/content?${q({ path, rev, revPath })}`)
}
