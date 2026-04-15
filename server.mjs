/**
 * Contextura — Backend HTTP para editar y gestionar contextos organizacionales.
 *
 * Expone `startServer({ rootPath, port, host })` que el proceso main de
 * Electron (electron/main.cjs) llama vía `await import()` tras pedirle al
 * usuario qué carpeta abrir. Devuelve `{ port, url, rootPath, stop }`.
 */

import { createServer } from 'node:http'
import { createReadStream, readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { resolve, dirname, join, extname } from 'node:path'
import { fileURLToPath } from 'node:url'

import { buildTree, buildFileIndex } from './lib/scanner.mjs'
import { createWatcher, sseHandler, closeAllConnections } from './lib/watcher.mjs'
import { getFileHistory, getFileAtRevision, getFileDiff, getUncommittedStatus } from './lib/git-history.mjs'

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

/**
 * Start an HTTP server bound to a specific repo root.
 *
 * @param {object} opts
 * @param {string} opts.rootPath     Absolute path to scan for markdown files.
 * @param {number} [opts.port=4986]  Port to listen on. Use 0 to let the OS assign one.
 * @param {string} [opts.host='127.0.0.1']
 * @returns {Promise<{port:number, url:string, rootPath:string, stop:()=>Promise<void>}>}
 */
export function startServer ({ rootPath, port = 4986, host = '127.0.0.1' } = {}) {
  if (!rootPath) throw new Error('startServer: rootPath is required')
  const ROOT_PATH = resolve(rootPath)

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
