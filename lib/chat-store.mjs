/**
 * chat-store.mjs — Persistencia de conversaciones de chat como ficheros JSON
 * en el directorio de datos de la app (~/Library/Application Support/Contextura/chats/).
 *
 * Cada conversación es un fichero `{id}.json` con la estructura:
 * { id, sessionId, title, createdAt, updatedAt, messages: [{ role, content }] }
 *
 * `sessionId` mapea al session_id de `claude -p` para reanudar conversaciones
 * con `--resume`. Los mensajes se almacenan como copia local para renderizar
 * sin relanzar el subproceso.
 *
 * El módulo expone CRUD puro y no depende de Electron — recibe el basePath
 * en `init()` y trabaja con `node:fs` síncrono para simplicidad.
 */

import { readFileSync, writeFileSync, readdirSync, unlinkSync, mkdirSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { randomUUID } from 'node:crypto'

let chatsDir = null

/**
 * Initialise the store with the base directory for chat files.
 * Creates the directory if it does not exist.
 * @param {string} userDataPath  e.g. `~/Library/Application Support/Contextura`
 */
export function init (userDataPath) {
  chatsDir = join(userDataPath, 'chats')
  if (!existsSync(chatsDir)) {
    mkdirSync(chatsDir, { recursive: true })
  }
}

function filePath (id) {
  if (!chatsDir) throw new Error('chat-store not initialised — call init() first')
  // Basic id validation to prevent path traversal
  if (!/^[\w-]+$/.test(id)) throw new Error('Invalid conversation id')
  return join(chatsDir, `${id}.json`)
}

/**
 * List all conversations (metadata only, no messages).
 * @returns {Array<{id: string, title: string, createdAt: string, updatedAt: string}>}
 */
export function list () {
  if (!chatsDir || !existsSync(chatsDir)) return []
  const files = readdirSync(chatsDir).filter(f => f.endsWith('.json'))
  const items = []
  for (const f of files) {
    try {
      const raw = readFileSync(join(chatsDir, f), 'utf-8')
      const { id, title, createdAt, updatedAt } = JSON.parse(raw)
      items.push({ id, title, createdAt, updatedAt })
    } catch { /* skip corrupt files */ }
  }
  items.sort((a, b) => (b.updatedAt || '').localeCompare(a.updatedAt || ''))
  return items
}

/**
 * Load a single conversation by id (with messages).
 * @param {string} id
 * @returns {object|null}
 */
export function load (id) {
  const p = filePath(id)
  if (!existsSync(p)) return null
  try {
    return JSON.parse(readFileSync(p, 'utf-8'))
  } catch {
    return null
  }
}

/**
 * Create a new conversation and persist it.
 * @param {string} [title]
 * @returns {object}  The created conversation.
 */
export function create (title) {
  const id = randomUUID()
  const now = new Date().toISOString()
  const conversation = {
    id,
    sessionId: null,
    title: title || 'New conversation',
    createdAt: now,
    updatedAt: now,
    messages: [],
  }
  writeFileSync(filePath(id), JSON.stringify(conversation, null, 2), 'utf-8')
  return conversation
}

/**
 * Save (overwrite) a conversation. The `id` field inside `conversation` is
 * used as the filename — it must already exist or be freshly created.
 * @param {object} conversation
 */
export function save (conversation) {
  if (!conversation?.id) throw new Error('Conversation must have an id')
  conversation.updatedAt = new Date().toISOString()
  writeFileSync(filePath(conversation.id), JSON.stringify(conversation, null, 2), 'utf-8')
}

/**
 * Delete a conversation by id.
 * @param {string} id
 * @returns {boolean} true if deleted, false if not found.
 */
export function remove (id) {
  const p = filePath(id)
  if (!existsSync(p)) return false
  unlinkSync(p)
  return true
}
