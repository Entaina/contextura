/**
 * chat-view.js — Chat UI component: message list, input area, send button.
 *
 * Pure DOM construction, no framework. Owns the scroll container, the input,
 * and the streaming lifecycle. Delegates message rendering to
 * `message-renderer.js` and HTTP streaming to `api.streamChat()`.
 *
 * The backend uses `claude -p` subprocesses, so conversation history is
 * managed by Claude Code sessions. The frontend tracks a `sessionId` and
 * passes it on subsequent turns for `--resume`.
 */

import * as api from '../../api.js'
import { renderMessage, createStreamingMessage } from './message-renderer.js'
import { lucideIcon, refreshIcons } from '../../infra/dom.js'

export class ChatView {
  /**
   * @param {HTMLElement} container  The element to mount into.
   * @param {Object} [opts]
   * @param {() => Object} [opts.getContext]  Returns editor context for the system prompt.
   */
  constructor (container, { getContext } = {}) {
    this._container = container
    this._messages = []   // { role, content }[]
    this._sessionId = null
    this._streaming = null // current streaming handle
    this._getContext = getContext || (() => ({}))

    this._build()
  }

  _build () {
    this._container.innerHTML = ''
    this._container.classList.add('chat-view')

    // Status bar (shown when claude CLI is not available)
    this._statusBar = document.createElement('div')
    this._statusBar.className = 'chat-status-bar'
    this._statusBar.hidden = true
    this._container.appendChild(this._statusBar)

    // Warning bar (shown when ANTHROPIC_API_KEY is detected)
    this._warningBar = document.createElement('div')
    this._warningBar.className = 'chat-warning-bar'
    this._warningBar.hidden = true
    this._container.appendChild(this._warningBar)

    // Scrollable message list
    this._messageList = document.createElement('div')
    this._messageList.className = 'chat-message-list'
    this._container.appendChild(this._messageList)

    // Empty state
    this._emptyState = document.createElement('div')
    this._emptyState.className = 'chat-empty-state'
    this._emptyState.textContent = 'Start a conversation with Claude.'
    this._messageList.appendChild(this._emptyState)

    // Input area
    const inputRow = document.createElement('div')
    inputRow.className = 'chat-input-row'

    this._textarea = document.createElement('textarea')
    this._textarea.className = 'chat-input'
    this._textarea.placeholder = 'Message Claude...'
    this._textarea.rows = 1
    this._textarea.addEventListener('keydown', (e) => this._onKeyDown(e))
    this._textarea.addEventListener('input', () => this._autoResize())

    this._sendBtn = document.createElement('button')
    this._sendBtn.className = 'chat-send-btn icon-btn'
    this._sendBtn.title = 'Send (Enter)'
    this._sendBtn.appendChild(lucideIcon('send-horizontal'))
    this._sendBtn.addEventListener('click', () => this._send())

    this._stopBtn = document.createElement('button')
    this._stopBtn.className = 'chat-stop-btn icon-btn'
    this._stopBtn.title = 'Stop generating'
    this._stopBtn.appendChild(lucideIcon('square'))
    this._stopBtn.hidden = true
    this._stopBtn.addEventListener('click', () => this._stopStreaming())

    inputRow.appendChild(this._textarea)
    inputRow.appendChild(this._sendBtn)
    inputRow.appendChild(this._stopBtn)
    this._container.appendChild(inputRow)
    refreshIcons(this._container)

    this._checkStatus()
  }

  async _checkStatus () {
    try {
      const res = await fetch('/api/chat/status')
      const status = await res.json()

      if (!status.available) {
        this._statusBar.textContent = 'Claude Code CLI not found. Install it from https://claude.ai/download'
        this._statusBar.hidden = false
        this._textarea.disabled = true
        this._sendBtn.disabled = true
        return
      }

      if (!status.authenticated) {
        this._statusBar.textContent = 'Claude Code not authenticated. Run "claude /login" in a terminal.'
        this._statusBar.hidden = false
        this._textarea.disabled = true
        this._sendBtn.disabled = true
        return
      }

      if (status.hasApiKey) {
        this._warningBar.textContent = 'ANTHROPIC_API_KEY detected — API billing will be used instead of your subscription.'
        this._warningBar.hidden = false
      }
    } catch { /* server unreachable, will fail on send */ }
  }

  _onKeyDown (e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      this._send()
    }
  }

  _autoResize () {
    this._textarea.style.height = 'auto'
    this._textarea.style.height = Math.min(this._textarea.scrollHeight, 150) + 'px'
  }

  async _send () {
    const text = this._textarea.value.trim()
    if (!text || this._streaming) return

    // Add user message
    this._addMessage({ role: 'user', content: text })
    this._textarea.value = ''
    this._textarea.style.height = 'auto'

    // Prepare streaming assistant message
    const streaming = createStreamingMessage()
    this._messageList.appendChild(streaming.element)
    this._scrollToBottom()
    this._streaming = streaming

    this._sendBtn.hidden = true
    this._stopBtn.hidden = false
    this._textarea.disabled = true

    try {
      const payload = {
        message: text,
        sessionId: this._sessionId || undefined,
        context: this._getContext(),
      }

      for await (const chunk of api.streamChat(payload)) {
        if (chunk.error) {
          streaming.appendText(`\n\n**Error:** ${chunk.error}`)
          break
        }
        if (chunk.text) streaming.appendText(chunk.text)
        if (chunk.thinking) streaming.appendThinking(chunk.thinking)
        if (chunk.toolStart) streaming.startTool(chunk.toolStart)
        if (chunk.toolDelta) streaming.appendToolDelta(chunk.toolDelta)
        if (chunk.toolEnd) streaming.endTool(chunk.toolEnd)
        if (chunk.toolResult) streaming.setToolResult(chunk.toolResult)
        if (chunk.sessionId) this._sessionId = chunk.sessionId
        this._scrollToBottom()
      }
    } catch (err) {
      streaming.appendText(`\n\n**Error:** ${err.message}`)
    }

    streaming.finish()
    this._messages.push({ role: 'assistant', content: streaming.getContent() })
    this._streaming = null
    this._sendBtn.hidden = false
    this._stopBtn.hidden = true
    this._textarea.disabled = false
    this._textarea.focus()
    this._scrollToBottom()
  }

  _stopStreaming () {
    if (this._sessionId) {
      api.cancelChat(this._sessionId)
    }
  }

  /** @param {{ role: string, content: string }} msg */
  _addMessage (msg) {
    this._messages.push(msg)
    if (this._emptyState?.parentNode) {
      this._emptyState.remove()
    }
    const el = renderMessage(msg)
    this._messageList.appendChild(el)
    this._scrollToBottom()
  }

  _scrollToBottom () {
    requestAnimationFrame(() => {
      this._messageList.scrollTop = this._messageList.scrollHeight
    })
  }

  /** Load an existing conversation's messages and session into the view. */
  loadConversation ({ sessionId, messages }) {
    this._sessionId = sessionId || null
    this._messages = []
    this._messageList.innerHTML = ''
    if (!messages || messages.length === 0) {
      this._messageList.appendChild(this._emptyState)
      return
    }
    for (const msg of messages) {
      this._messages.push({ role: msg.role, content: msg.content })
      const el = renderMessage(msg)
      this._messageList.appendChild(el)
    }
    this._scrollToBottom()
  }

  /** Get the current session ID. */
  getSessionId () { return this._sessionId }

  /** Get the current messages array (for persistence). */
  getMessages () { return this._messages.slice() }

  dispose () {
    this._stopStreaming()
    this._container.innerHTML = ''
  }
}
