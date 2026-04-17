/**
 * Contextura — Backend HTTP para editar y gestionar contextos organizacionales.
 *
 * Expone `startServer({ rootPath, port, host })` que el proceso main de
 * Electron (electron/main.cjs) llama vía `await import()` tras pedirle al
 * usuario qué carpeta abrir. Devuelve `{ port, url, rootPath, stop }`.
 */

import { createServer } from 'node:http'
import { createReadStream, readFileSync, writeFileSync, mkdirSync, readdirSync, statSync, existsSync } from 'node:fs'
import { resolve, dirname, join, extname } from 'node:path'
import { homedir } from 'node:os'
import { fileURLToPath } from 'node:url'

import { buildTree, buildFileIndex } from './lib/scanner.mjs'
import { createWatcher, sseHandler, closeAllConnections } from './lib/watcher.mjs'
import { getFileHistory, getFileAtRevision, getFileDiff, getUncommittedStatus } from './lib/git-history.mjs'
import { getStatus as getChatStatus, createSession, setClaudeBinaryOverride } from './lib/chat-relay.mjs'
import * as chatStore from './lib/chat-store.mjs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const PUBLIC_PATH = resolve(__dirname, 'public')

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
}

function sendJson (res, statusCode, data) {
  const body = JSON.stringify(data)
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
  })
  res.end(body)
}

function sendText (res, statusCode, text, contentType = 'text/plain; charset=utf-8') {
  res.writeHead(statusCode, { 'Content-Type': contentType, 'Cache-Control': 'no-store' })
  res.end(text)
}

function sendError (res, statusCode, message) {
  sendJson(res, statusCode, { error: message })
}

function readBody (req) {
  return new Promise((resolve, reject) => {
    const chunks = []
    req.on('data', chunk => chunks.push(chunk))
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf-8')))
    req.on('error', reject)
  })
}

// ── Command / skill scanning helpers ──────────────────────────────

/**
 * Parse YAML frontmatter from a markdown file for description / argument-hint.
 * @param {string} filePath
 * @returns {{ description: string, argumentHint?: string }}
 */
function parseFrontmatter (filePath) {
  let description = ''
  let argumentHint
  try {
    const content = readFileSync(filePath, 'utf-8')
    const fmMatch = content.match(/^---\r?\n([\s\S]*?)\r?\n---/)
    if (fmMatch) {
      const fm = fmMatch[1]
      const descMatch = fm.match(/^description:\s*["']?(.+?)["']?\s*$/m)
      if (descMatch) description = descMatch[1].trim()
      const argMatch = fm.match(/^argument-hint:\s*["']?(.+?)["']?\s*$/m)
      if (argMatch) argumentHint = argMatch[1].trim()
    }
    // Fallback: first non-empty, non-heading line
    if (!description) {
      const lines = content.replace(/^---[\s\S]*?---\r?\n?/, '').split('\n')
      for (const line of lines) {
        const trimmed = line.trim()
        if (trimmed && !trimmed.startsWith('#')) {
          description = trimmed.slice(0, 80)
          break
        }
      }
    }
  } catch { /* unreadable */ }
  return { description, argumentHint }
}

/**
 * Recursively scan a `commands/` directory for `.md` files.
 * Subdirectories map to `:` namespaces (e.g. `git/commit.md` → `git:commit`).
 *
 * @param {string} dir       Absolute path to a commands/ directory.
 * @param {string} prefix    Namespace prefix (e.g. plugin name).
 * @param {string} source    Source tag for the results.
 * @param {string} [plugin]  Plugin name (only for source=plugin).
 * @returns {{ name: string, description: string, argumentHint?: string, source: string, plugin?: string }[]}
 */
function scanCommandsDir (dir, prefix, source, plugin) {
  if (!existsSync(dir)) return []
  const results = []

  function walk (d, ns) {
    let entries
    try { entries = readdirSync(d) } catch { return }
    for (const entry of entries) {
      const full = join(d, entry)
      let st
      try { st = statSync(full) } catch { continue }
      if (st.isDirectory()) {
        walk(full, ns ? `${ns}:${entry}` : entry)
        continue
      }
      if (!entry.endsWith('.md') || entry.endsWith('.bak')) continue
      const base = entry.replace(/\.md$/, '')
      const name = ns ? `${ns}:${base}` : base
      const fullName = prefix ? `${prefix}:${name}` : name
      const fm = parseFrontmatter(full)
      const item = { name: fullName, description: fm.description, source }
      if (fm.argumentHint) item.argumentHint = fm.argumentHint
      if (plugin) item.plugin = plugin
      results.push(item)
    }
  }

  walk(dir, '')
  return results
}

/**
 * Scan a `skills/` directory for SKILL.md files.
 * Each subdirectory with a SKILL.md is a skill entry.
 *
 * @param {string} dir       Absolute path to a skills/ directory.
 * @param {string} prefix    Namespace prefix (e.g. plugin name).
 * @param {string} source    Source tag.
 * @param {string} [plugin]  Plugin name.
 */
function scanSkillsDir (dir, prefix, source, plugin) {
  if (!existsSync(dir)) return []
  const results = []
  let entries
  try { entries = readdirSync(dir) } catch { return results }
  for (const entry of entries) {
    const skillFile = join(dir, entry, 'SKILL.md')
    if (!existsSync(skillFile)) continue
    const fm = parseFrontmatter(skillFile)
    const name = prefix ? `${prefix}:${entry}` : entry
    const item = { name, description: fm.description, source }
    if (fm.argumentHint) item.argumentHint = fm.argumentHint
    if (plugin) item.plugin = plugin
    results.push(item)
  }
  return results
}

/**
 * Find the latest version directory under a plugin's cache folder.
 * The installPath in installed_plugins.json can be stale (e.g. points to
 * 0.2.0 when 0.3.0 exists), so we fall back to the newest directory.
 *
 * @param {string} installPath  Path from installed_plugins.json.
 * @returns {string | null}
 */
function resolvePluginPath (installPath) {
  if (existsSync(installPath)) return installPath
  // Try parent dir → pick latest version folder
  const parent = dirname(installPath)
  if (!existsSync(parent)) return null
  try {
    const versions = readdirSync(parent)
      .filter(e => { try { return statSync(join(parent, e)).isDirectory() } catch { return false } })
      .sort()
    return versions.length ? join(parent, versions[versions.length - 1]) : null
  } catch { return null }
}

/**
 * Scan all Claude Code command and skill sources.
 *
 * @param {string} rootPath  Project root.
 * @returns {{ name: string, description: string, argumentHint?: string, source: string, plugin?: string }[]}
 */
function scanAllCommands (rootPath) {
  const home = homedir()
  const results = []

  // 1. Project commands  (<project>/.claude/commands/)
  results.push(...scanCommandsDir(join(rootPath, '.claude', 'commands'), '', 'project'))

  // 2. User commands  (~/.claude/commands/)
  results.push(...scanCommandsDir(join(home, '.claude', 'commands'), '', 'user'))

  // 3. User skills  (~/.claude/skills/*/SKILL.md)
  results.push(...scanSkillsDir(join(home, '.claude', 'skills'), '', 'skill'))

  // 4. Plugin commands + skills (from installed_plugins.json)
  const pluginsFile = join(home, '.claude', 'plugins', 'installed_plugins.json')
  if (existsSync(pluginsFile)) {
    try {
      const data = JSON.parse(readFileSync(pluginsFile, 'utf-8'))
      const seen = new Set() // avoid duplicates when same plugin is installed in multiple scopes
      for (const [key, versions] of Object.entries(data.plugins || {})) {
        const pluginName = key.split('@')[0]
        if (seen.has(pluginName)) continue
        seen.add(pluginName)
        // Use first entry (highest priority scope)
        const entry = versions[0]
        if (!entry?.installPath) continue
        const resolved = resolvePluginPath(entry.installPath)
        if (!resolved) continue
        results.push(...scanCommandsDir(join(resolved, 'commands'), pluginName, 'plugin', pluginName))
        results.push(...scanSkillsDir(join(resolved, 'skills'), pluginName, 'plugin', pluginName))
      }
    } catch { /* malformed JSON or unreadable */ }
  }

  return results.sort((a, b) => a.name.localeCompare(b.name))
}

/**
 * Start an HTTP server bound to a specific repo root.
 *
 * @param {object} opts
 * @param {string} opts.rootPath         Absolute path to scan for markdown files.
 * @param {number} [opts.port=4986]      Port to listen on. Use 0 to let the OS assign one.
 * @param {string} [opts.host='127.0.0.1']
 * @param {string} [opts.userDataPath]   Electron userData dir for chat persistence.
 * @returns {Promise<{port:number, url:string, rootPath:string, stop:()=>Promise<void>}>}
 */
export function startServer ({ rootPath, port = 4986, host = '127.0.0.1', userDataPath, claudeBinaryPath } = {}) {
  if (!rootPath) throw new Error('startServer: rootPath is required')
  const ROOT_PATH = resolve(rootPath)

  if (userDataPath) chatStore.init(userDataPath)
  if (claudeBinaryPath) setClaudeBinaryOverride(claudeBinaryPath)

  // Active chat sessions (keyed by conversation id or '__default__')
  const activeSessions = new Map()

  let cachedTree = null
  let cachedIndex = null

  function getTree () {
    if (!cachedTree) {
      cachedTree = buildTree(ROOT_PATH)
      cachedIndex = buildFileIndex(cachedTree)
    }
    return { tree: cachedTree, index: cachedIndex }
  }

  function invalidateCache () {
    cachedTree = null
    cachedIndex = null
  }

  // Validate that a resolved path stays inside ROOT_PATH (no path traversal).
  function safePath (filePath) {
    const resolved = resolve(ROOT_PATH, filePath)
    if (!resolved.startsWith(ROOT_PATH + '/') && resolved !== ROOT_PATH) {
      return null
    }
    return resolved
  }

  async function handleRequest (req, res) {
    const url = new URL(req.url, `http://${host}`)
    const pathname = url.pathname

    if (pathname === '/sse') {
      sseHandler(req, res)
      return
    }

    if (pathname === '/api/tree' && req.method === 'GET') {
      const { tree } = getTree()
      sendJson(res, 200, tree)
      return
    }

    if (pathname === '/api/root' && req.method === 'GET') {
      sendJson(res, 200, { rootPath: ROOT_PATH })
      return
    }

    if (pathname === '/api/file' && req.method === 'GET') {
      const filePath = url.searchParams.get('path')
      if (!filePath) return sendError(res, 400, 'Missing path')
      const abs = safePath(filePath)
      if (!abs) return sendError(res, 403, 'Forbidden')
      try {
        const content = readFileSync(abs, 'utf-8')
        sendText(res, 200, content)
      } catch {
        sendError(res, 404, 'File not found')
      }
      return
    }

    if (pathname === '/api/file' && req.method === 'PUT') {
      const filePath = url.searchParams.get('path')
      if (!filePath) return sendError(res, 400, 'Missing path')
      const abs = safePath(filePath)
      if (!abs) return sendError(res, 403, 'Forbidden')
      if (!abs.endsWith('.md')) return sendError(res, 400, 'Only .md files can be edited')
      try {
        const body = await readBody(req)
        mkdirSync(dirname(abs), { recursive: true })
        writeFileSync(abs, body, 'utf-8')
        invalidateCache()
        sendJson(res, 200, { ok: true })
      } catch (err) {
        sendError(res, 500, err.message)
      }
      return
    }

    if (pathname === '/api/index' && req.method === 'GET') {
      const { index } = getTree()
      sendJson(res, 200, index)
      return
    }

    if (pathname === '/api/history' && req.method === 'GET') {
      const filePath = url.searchParams.get('path')
      if (!filePath) return sendError(res, 400, 'Missing path')
      const abs = safePath(filePath)
      if (!abs) return sendError(res, 403, 'Forbidden')
      try {
        const [versions, uncommitted] = await Promise.all([
          getFileHistory(abs, ROOT_PATH, { limit: 50 }),
          getUncommittedStatus(abs, ROOT_PATH),
        ])
        sendJson(res, 200, {
          versions,
          notInGit: versions.length === 0,
          hasUncommittedChanges: uncommitted.hasChanges,
          untracked: uncommitted.untracked,
        })
      } catch (err) {
        sendError(res, 500, err.message)
      }
      return
    }

    if (pathname === '/api/content' && req.method === 'GET') {
      const filePath = url.searchParams.get('path')
      const rev = url.searchParams.get('rev')
      const revPath = url.searchParams.get('revPath') || null
      if (!filePath) return sendError(res, 400, 'Missing path')
      if (!rev) return sendError(res, 400, 'Missing rev')
      const abs = safePath(filePath)
      if (!abs) return sendError(res, 403, 'Forbidden')
      try {
        const content = await getFileAtRevision(abs, ROOT_PATH, rev, revPath)
        sendJson(res, 200, { content })
      } catch (err) {
        sendError(res, 500, err.message)
      }
      return
    }

    if (pathname === '/api/diff' && req.method === 'GET') {
      const filePath = url.searchParams.get('path')
      const rev = url.searchParams.get('rev')
      const revPath = url.searchParams.get('revPath') || null
      const base = url.searchParams.get('base') || 'working'
      if (!filePath) return sendError(res, 400, 'Missing path')
      if (!rev) return sendError(res, 400, 'Missing rev')
      const abs = safePath(filePath)
      if (!abs) return sendError(res, 403, 'Forbidden')
      try {
        const [diff, oldContent] = await Promise.all([
          getFileDiff(abs, ROOT_PATH, rev, base),
          getFileAtRevision(abs, ROOT_PATH, rev, revPath),
        ])
        sendJson(res, 200, { diff, oldContent })
      } catch (err) {
        sendError(res, 500, err.message)
      }
      return
    }

    // ── Chat endpoints ──────────────────────────────────────────────

    if (pathname === '/api/chat/status' && req.method === 'GET') {
      const status = await getChatStatus()
      sendJson(res, 200, status)
      return
    }

    if (pathname === '/api/config/claude-binary' && req.method === 'POST') {
      const body = JSON.parse(await readBody(req))
      setClaudeBinaryOverride(body.path)
      const status = await getChatStatus()
      sendJson(res, 200, status)
      return
    }

    if (pathname === '/api/chat' && req.method === 'POST') {
      const body = JSON.parse(await readBody(req))
      const { message, sessionId, context, model, effort, permissionMode } = body
      if (!message) {
        return sendError(res, 400, 'message is required')
      }
      try {
        const session = createSession({
          rootPath: ROOT_PATH,
          context,
          sessionId,
          message,
          model,
          effort,
          permissionMode,
        })

        // Track active session for cancellation
        const trackingId = sessionId || '__pending_' + Date.now()
        activeSessions.set(trackingId, session)

        res.writeHead(200, {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          Connection: 'keep-alive',
        })

        session.on('text', (text) => {
          res.write(`data: ${JSON.stringify({ text })}\n\n`)
        })

        session.on('thinking', (text) => {
          res.write(`data: ${JSON.stringify({ thinking: text })}\n\n`)
        })

        session.on('tool_start', (info) => {
          res.write(`data: ${JSON.stringify({ toolStart: info })}\n\n`)
        })

        session.on('tool_delta', (info) => {
          res.write(`data: ${JSON.stringify({ toolDelta: info })}\n\n`)
        })

        session.on('tool_end', (info) => {
          res.write(`data: ${JSON.stringify({ toolEnd: info })}\n\n`)
        })

        session.on('tool_result', (info) => {
          res.write(`data: ${JSON.stringify({ toolResult: info })}\n\n`)
        })

        session.on('result', ({ sessionId: sid, text }) => {
          activeSessions.delete(trackingId)
          if (sid && trackingId !== sid) {
            activeSessions.delete(sid)
          }
          res.write(`data: ${JSON.stringify({ sessionId: sid, result: text })}\n\n`)
          res.write('data: [DONE]\n\n')
          res.end()
        })

        session.on('error', (err) => {
          activeSessions.delete(trackingId)
          const msg = err.message || 'Chat error'
          if (!res.writableEnded) {
            res.write(`data: ${JSON.stringify({ error: msg })}\n\n`)
            res.end()
          }
        })

        session.on('close', () => {
          activeSessions.delete(trackingId)
          if (!res.writableEnded) res.end()
        })

        req.on('close', () => {
          session.cancel()
          activeSessions.delete(trackingId)
        })
      } catch (err) {
        if (!res.headersSent) {
          sendError(res, 500, err.message)
        }
      }
      return
    }

    if (pathname === '/api/chat/cancel' && req.method === 'POST') {
      const body = JSON.parse(await readBody(req))
      const { sessionId } = body
      let cancelled = false
      for (const [key, session] of activeSessions) {
        if (key === sessionId || session.sessionId === sessionId) {
          session.cancel()
          cancelled = true
          break
        }
      }
      sendJson(res, 200, { cancelled })
      return
    }

    if (pathname === '/api/chat/commands' && req.method === 'GET') {
      const commands = scanAllCommands(ROOT_PATH)
      sendJson(res, 200, commands)
      return
    }

    if (pathname === '/api/chat/conversations' && req.method === 'GET') {
      sendJson(res, 200, chatStore.list())
      return
    }

    if (pathname === '/api/chat/conversations' && req.method === 'POST') {
      const body = JSON.parse(await readBody(req))
      const conversation = chatStore.create(body.title)
      sendJson(res, 201, conversation)
      return
    }

    // /api/chat/conversations/{id}
    const convMatch = pathname.match(/^\/api\/chat\/conversations\/([\w-]+)$/)
    if (convMatch) {
      const id = convMatch[1]

      if (req.method === 'GET') {
        const conv = chatStore.load(id)
        if (!conv) return sendError(res, 404, 'Conversation not found')
        sendJson(res, 200, conv)
        return
      }

      if (req.method === 'PUT') {
        const body = JSON.parse(await readBody(req))
        body.id = id
        chatStore.save(body)
        sendJson(res, 200, { ok: true })
        return
      }

      if (req.method === 'DELETE') {
        const deleted = chatStore.remove(id)
        sendJson(res, 200, { deleted })
        return
      }
    }

    // Static files from public/
    if (pathname === '/' || pathname.startsWith('/public/') || !pathname.startsWith('/api/')) {
      let filePath
      if (pathname === '/') {
        filePath = join(PUBLIC_PATH, 'index.html')
      } else if (pathname.startsWith('/public/')) {
        filePath = join(PUBLIC_PATH, pathname.slice('/public/'.length))
      } else {
        sendError(res, 404, 'Not found')
        return
      }

      const ext = extname(filePath)
      const contentType = MIME[ext] || 'application/octet-stream'

      res.writeHead(200, { 'Content-Type': contentType, 'Cache-Control': 'no-store' })
      const stream = createReadStream(filePath)
      stream.on('error', () => {
        if (!res.headersSent) sendError(res, 404, 'Not found')
        else res.end()
      })
      stream.pipe(res)
      return
    }

    sendError(res, 404, 'Not found')
  }

  const server = createServer((req, res) => {
    handleRequest(req, res).catch(err => {
      console.error('[error]', err)
      if (!res.headersSent) sendError(res, 500, 'Internal server error')
    })
  })

  const watcher = createWatcher(ROOT_PATH, invalidateCache)

  return new Promise((resolve, reject) => {
    server.once('error', reject)
    server.listen(port, host, () => {
      server.removeListener('error', reject)
      const actualPort = server.address().port
      const url = `http://${host}:${actualPort}`
      console.log(`Contextura running at ${url} (root: ${ROOT_PATH})`)

      async function stop () {
        for (const session of activeSessions.values()) session.destroy()
        activeSessions.clear()
        closeAllConnections()
        if (typeof server.closeIdleConnections === 'function') server.closeIdleConnections()
        if (typeof server.closeAllConnections === 'function') server.closeAllConnections()
        await watcher.close()
        await new Promise(resolve => server.close(() => resolve()))
      }

      resolve({ port: actualPort, url, rootPath: ROOT_PATH, stop })
    })
  })
}
