/**
 * chat-relay.mjs — Gestiona subprocesos `claude -p` para el chat integrado.
 *
 * En lugar de llamar a la Anthropic API directamente, lanza el CLI de Claude
 * Code como child process con `--input-format stream-json --output-format
 * stream-json`. Esto permite usar la suscripción Pro/Max del usuario sin
 * necesidad de API key.
 *
 * El CLI se autentica con la cuenta que el usuario ya tiene configurada.
 * Si `ANTHROPIC_API_KEY` existe en el entorno, el CLI la prefiere y factura
 * por API — detectamos esto y avisamos al usuario.
 */

import { spawn, execFile } from 'node:child_process'
import { existsSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'
import { EventEmitter } from 'node:events'

let resolvedClaudePath = null

/**
 * Resolve the path to the `claude` binary.
 * Electron launched from Finder doesn't inherit the shell PATH, so we
 * search known locations before falling back to `zsh -lc 'which claude'`.
 */
async function resolveClaudeBinary () {
  if (resolvedClaudePath) return resolvedClaudePath

  // 1. Check if `claude` is directly available via current PATH
  try {
    const path = await execFilePromise('which', ['claude'])
    if (path.trim()) { resolvedClaudePath = path.trim(); return resolvedClaudePath }
  } catch { /* not in PATH */ }

  // 2. Known install locations on macOS
  const candidates = [
    '/usr/local/bin/claude',
    join(homedir(), '.claude', 'local', 'claude'),
    join(homedir(), '.npm-global', 'bin', 'claude'),
  ]
  for (const p of candidates) {
    if (existsSync(p)) { resolvedClaudePath = p; return resolvedClaudePath }
  }

  // 3. Fallback: ask the login shell
  try {
    const path = await execFilePromise('zsh', ['-lc', 'which claude'])
    if (path.trim()) { resolvedClaudePath = path.trim(); return resolvedClaudePath }
  } catch { /* no zsh or not found */ }

  return null
}

function execFilePromise (cmd, args) {
  return new Promise((resolve, reject) => {
    execFile(cmd, args, { timeout: 5000 }, (err, stdout) => {
      if (err) reject(err)
      else resolve(stdout)
    })
  })
}

/**
 * Check if `claude` CLI is installed and authenticated.
 * @returns {Promise<{ available: boolean, authenticated: boolean, hasApiKey: boolean }>}
 */
export async function getStatus () {
  const hasApiKey = !!process.env.ANTHROPIC_API_KEY

  const claudePath = await resolveClaudeBinary()
  if (!claudePath) return { available: false, authenticated: false, hasApiKey }

  try {
    await execFilePromise(claudePath, ['auth', 'status'])
    return { available: true, authenticated: true, hasApiKey }
  } catch {
    return { available: true, authenticated: false, hasApiKey }
  }
}

/**
 * Build the system prompt from editor context for --append-system-prompt.
 */
export function buildSystemPrompt (context) {
  const parts = [
    'You are a helpful assistant integrated into Contextura, a markdown editor for managing AI context libraries.',
    'Respond in the same language the user writes in.',
  ]

  if (context?.activeFile) {
    parts.push(`\nCurrently open file: ${context.activeFile}`)
  }

  if (context?.fileContent) {
    const truncated = context.fileContent.length > 50_000
      ? context.fileContent.slice(0, 50_000) + '\n\n[…content truncated at 50 KB]'
      : context.fileContent
    parts.push(`\nFile content:\n---\n${truncated}\n---`)
  }

  if (context?.gitStatus) {
    parts.push(`\nGit status:\n${context.gitStatus}`)
  }

  return parts.join('\n')
}

/**
 * Create a chat session backed by a `claude -p` subprocess.
 *
 * @param {object} opts
 * @param {string} opts.rootPath   CWD for the subprocess (repo root).
 * @param {object} [opts.context]  Editor context for --append-system-prompt.
 * @param {string} [opts.sessionId] Resume an existing session.
 * @param {string} opts.message    The user's first message.
 * @returns {ChatSession}
 */
export function createSession ({ rootPath, context, sessionId, message }) {
  return new ChatSession({ rootPath, context, sessionId, message })
}

/**
 * @typedef {import('node:events').EventEmitter} EventEmitter
 *
 * ChatSession events:
 * - 'text'        (string)                   Partial text token
 * - 'thinking'    (string)                   Partial thinking token
 * - 'tool_start'  ({name, toolUseId})        Tool invocation started
 * - 'tool_delta'  ({toolUseId, json})        Tool input JSON accumulated
 * - 'tool_end'    ({toolUseId})              Tool invocation block finished
 * - 'tool_result' ({toolUseId, content})     Tool execution result
 * - 'result'      ({sessionId, text})        Final result
 * - 'error'       (Error)                    Fatal error
 * - 'close'       (code)                     Process exited
 */
export class ChatSession extends EventEmitter {
  constructor ({ rootPath, context, sessionId, message }) {
    super()
    this._rootPath = rootPath
    this._sessionId = sessionId || null
    this._process = null
    this._buffer = ''
    this._exited = false
    this._activeBlocks = new Map() // index → { type, toolUseId?, name?, jsonBuffer? }

    this._spawn(context, message)
  }

  get sessionId () { return this._sessionId }

  async _spawn (context, message) {
    const claudePath = await resolveClaudeBinary()
    if (!claudePath) {
      this.emit('error', new Error('Claude CLI not found. Install it from https://claude.ai/download'))
      return
    }

    const args = [
      '-p', message,
      '--output-format', 'stream-json',
      '--verbose',
      '--include-partial-messages',
    ]

    const systemPrompt = buildSystemPrompt(context)
    if (systemPrompt) {
      args.push('--append-system-prompt', systemPrompt)
    }

    if (this._sessionId) {
      args.push('--resume', this._sessionId)
    }

    this._process = spawn(claudePath, args, {
      cwd: this._rootPath,
      stdio: ['pipe', 'pipe', 'pipe'],
      env: { ...process.env },
    })

    this._process.stdout.on('data', (chunk) => this._onStdout(chunk))
    this._process.stderr.on('data', (chunk) => this._onStderr(chunk))

    this._process.on('error', (err) => {
      this._exited = true
      this.emit('error', err)
    })

    this._process.on('close', (code) => {
      this._exited = true
      this._flushBuffer()
      this.emit('close', code)
    })
  }

  _onStdout (chunk) {
    this._buffer += chunk.toString()
    const lines = this._buffer.split('\n')
    this._buffer = lines.pop() // keep incomplete last line

    for (const line of lines) {
      if (!line.trim()) continue
      try {
        const event = JSON.parse(line)
        this._handleEvent(event)
      } catch {
        // not valid JSON, ignore
      }
    }
  }

  _flushBuffer () {
    if (!this._buffer.trim()) return
    try {
      const event = JSON.parse(this._buffer)
      this._handleEvent(event)
    } catch { /* ignore */ }
    this._buffer = ''
  }

  _onStderr (chunk) {
    const text = chunk.toString().trim()
    if (text) console.warn('[claude stderr]', text)
  }

  _handleEvent (event) {
    // Capture session_id from the init event
    if (event.type === 'system' && event.subtype === 'init' && event.session_id) {
      this._sessionId = event.session_id
    }

    // Stream events — track active blocks for thinking, tool_use, text
    if (event.type === 'stream_event') {
      const inner = event.event
      if (!inner) return

      if (inner.type === 'content_block_start') {
        const block = inner.content_block
        const idx = inner.index
        if (block?.type === 'thinking') {
          this._activeBlocks.set(idx, { type: 'thinking' })
        } else if (block?.type === 'tool_use') {
          this._activeBlocks.set(idx, {
            type: 'tool_use',
            toolUseId: block.id,
            name: block.name,
            jsonBuffer: '',
          })
          this.emit('tool_start', { name: block.name, toolUseId: block.id })
        } else if (block?.type === 'text') {
          this._activeBlocks.set(idx, { type: 'text' })
        }
      }

      if (inner.type === 'content_block_delta') {
        const delta = inner.delta
        const block = this._activeBlocks.get(inner.index)
        if (!delta || !block) return

        if (delta.type === 'text_delta' && delta.text) {
          this.emit('text', delta.text)
        } else if (delta.type === 'thinking_delta' && delta.thinking) {
          this.emit('thinking', delta.thinking)
        } else if (delta.type === 'input_json_delta' && block.type === 'tool_use') {
          block.jsonBuffer += delta.partial_json || ''
          this.emit('tool_delta', { toolUseId: block.toolUseId, json: block.jsonBuffer })
        }
      }

      if (inner.type === 'content_block_stop') {
        const block = this._activeBlocks.get(inner.index)
        if (block?.type === 'tool_use') {
          this.emit('tool_end', { toolUseId: block.toolUseId })
        }
        this._activeBlocks.delete(inner.index)
      }
    }

    // Tool results arrive as 'user' events with tool_result content
    if (event.type === 'user' && event.message?.content) {
      const content = event.message.content
      const items = Array.isArray(content) ? content : [content]
      for (const item of items) {
        if (item.type === 'tool_result' && item.tool_use_id) {
          const resultText = typeof item.content === 'string'
            ? item.content
            : JSON.stringify(item.content)
          this.emit('tool_result', { toolUseId: item.tool_use_id, content: resultText })
        }
      }
    }

    // Result event — final
    if (event.type === 'result') {
      if (event.subtype === 'success') {
        this.emit('result', {
          sessionId: event.session_id || this._sessionId,
          text: event.result || '',
        })
      } else {
        this.emit('error', new Error(event.error || `Chat failed: ${event.subtype}`))
      }
    }
  }

  /** Send SIGINT to cancel the current response. */
  cancel () {
    if (this._process && !this._exited) {
      this._process.kill('SIGINT')
    }
  }

  /** Terminate the subprocess cleanly. */
  destroy () {
    if (!this._process || this._exited) return
    this._process.kill('SIGTERM')
    setTimeout(() => {
      if (!this._exited && this._process) {
        this._process.kill('SIGKILL')
      }
    }, 2000)
  }

  /** @returns {boolean} */
  get isAlive () { return !this._exited }
}
