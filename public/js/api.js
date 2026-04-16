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

// ── Chat ────────────────────────────────────────────────────────────

/**
 * Stream a chat response from the backend (`claude -p` subprocess).
 * Yields parsed SSE chunks: `{ text }`, `{ sessionId, result }`, or `{ error }`.
 *
 * @param {object} payload  `{ message: string, sessionId?: string, context? }`
 * @yields {{ text?: string, sessionId?: string, result?: string, error?: string }}
 */
export async function * streamChat (payload, { signal } = {}) {
  const res = await fetch('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    signal,
  })

  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.error || `POST /api/chat failed: ${res.status}`)
  }

  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''

  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop()
      for (const line of lines) {
        if (line.startsWith('data: ') && line !== 'data: [DONE]') {
          yield JSON.parse(line.slice(6))
        }
      }
    }
  } finally {
    reader.cancel().catch(() => {})
  }
}

/**
 * Cancel an active chat response.
 * @param {string} sessionId
 */
export function cancelChat (sessionId) {
  return fetch('/api/chat/cancel', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sessionId }),
  })
}

/**
 * List available slash commands from the project's `.claude/commands/` directory.
 * @returns {Promise<Array<{name: string, description: string, argumentHint?: string}>>}
 */
export async function listCommands () {
  const res = await fetch('/api/chat/commands')
  if (!res.ok) return []
  return res.json()
}

// ── Conversations ──────────────────────────────────────────────────

/**
 * List all saved conversations (metadata only, no messages).
 * @returns {Promise<Array<{id: string, title: string, createdAt: string, updatedAt: string}>>}
 */
export async function listConversations () {
  const res = await fetch('/api/chat/conversations')
  if (!res.ok) throw new Error(`GET /api/chat/conversations failed: ${res.status}`)
  return res.json()
}

/**
 * Create a new conversation on the server.
 * @param {string} [title]
 * @returns {Promise<object>}  The created conversation.
 */
export async function createConversation (title) {
  const res = await fetch('/api/chat/conversations', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title }),
  })
  if (!res.ok) throw new Error(`POST /api/chat/conversations failed: ${res.status}`)
  return res.json()
}

/**
 * Load a single conversation by id (with messages).
 * @param {string} id
 * @returns {Promise<object|null>}
 */
export async function loadConversation (id) {
  const res = await fetch(`/api/chat/conversations/${encodeURIComponent(id)}`)
  if (!res.ok) return null
  return res.json()
}

/**
 * Save (overwrite) a conversation.
 * @param {string} id
 * @param {object} data  `{ sessionId, title, messages }`
 */
export async function saveConversation (id, data) {
  const res = await fetch(`/api/chat/conversations/${encodeURIComponent(id)}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!res.ok) throw new Error(`PUT /api/chat/conversations/${id} failed: ${res.status}`)
  return res.json()
}

/**
 * Delete a conversation by id.
 * @param {string} id
 * @returns {Promise<boolean>}
 */
export async function deleteConversation (id) {
  const res = await fetch(`/api/chat/conversations/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  })
  return res.ok
}
