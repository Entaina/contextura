/**
 * chat-view.js — Chat UI component: top bar, message list, input area.
 *
 * Pure DOM construction, no framework. Owns the scroll container, the input,
 * the streaming lifecycle, and the conversation session management (history
 * dropdown, new-session, auto-save, restore).
 *
 * Delegates message rendering to `message-renderer.js` and HTTP streaming to
 * `api.streamChat()`. Conversation persistence uses the server CRUD endpoints
 * exposed through `api.js`.
 *
 * The backend uses `claude -p` subprocesses, so conversation history is
 * managed by Claude Code sessions. The frontend tracks a `sessionId` (CLI
 * session) and a `conversationId` (persisted store entry) separately.
 */

import * as api from '../../api.js'
import * as storage from '../../storage.js'
import { renderMessage, createStreamingMessage } from './message-renderer.js'
import { lucideIcon, refreshIcons } from '../../infra/dom.js'
import { COMMANDS, SlashCommandPopup } from './slash-commands.js'
import { createOptionsBar } from './chat-options.js'

// ── Helpers ────────────────────────────────────────────────────────

function relativeTime (isoString) {
  const diff = Date.now() - new Date(isoString).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h`
  const days = Math.floor(hours / 24)
  return `${days}d`
}

// ── ChatView ───────────────────────────────────────────────────────

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
    this._conversationId = null
    this._conversationTitle = null
    this._streaming = null // current streaming handle
    this._savingPromise = null // guard for concurrent auto-saves
    this._getContext = getContext || (() => ({}))

    /** Bound click-outside handler for the history dropdown. */
    this._onDocClick = (e) => {
      if (this._historyDropdown && !this._historyDropdown.contains(e.target) &&
          !this._historyBtn.contains(e.target)) {
        this._closeHistory()
      }
    }

    this._build()
  }

  // ── DOM construction ─────────────────────────────────────────────

  _build () {
    this._container.innerHTML = ''
    this._container.classList.add('chat-view')

    // -- Top bar (history + title + new session) --
    this._topBar = document.createElement('div')
    this._topBar.className = 'chat-top-bar'

    this._historyBtn = document.createElement('button')
    this._historyBtn.className = 'chat-top-btn icon-btn'
    this._historyBtn.title = 'Conversations'
    this._historyBtn.appendChild(lucideIcon('clock'))
    this._historyBtn.addEventListener('click', () => this._toggleHistory())

    this._topTitle = document.createElement('span')
    this._topTitle.className = 'chat-top-title'
    this._topTitle.textContent = 'New conversation'

    this._newBtn = document.createElement('button')
    this._newBtn.className = 'chat-top-btn icon-btn'
    this._newBtn.title = 'New conversation'
    this._newBtn.appendChild(lucideIcon('plus'))
    this._newBtn.addEventListener('click', () => this.newConversation())

    this._topBar.appendChild(this._historyBtn)
    this._topBar.appendChild(this._topTitle)
    this._topBar.appendChild(this._newBtn)
    this._container.appendChild(this._topBar)

    // History dropdown (hidden, positioned below top bar)
    this._historyDropdown = document.createElement('div')
    this._historyDropdown.className = 'chat-history-dropdown'
    this._historyDropdown.hidden = true
    this._topBar.appendChild(this._historyDropdown)

    // -- Status bar (shown when claude CLI is not available) --
    this._statusBar = document.createElement('div')
    this._statusBar.className = 'chat-status-bar'
    this._statusBar.hidden = true
    this._container.appendChild(this._statusBar)

    // Warning bar (shown when ANTHROPIC_API_KEY is detected)
    this._warningBar = document.createElement('div')
    this._warningBar.className = 'chat-warning-bar'
    this._warningBar.hidden = true
    this._container.appendChild(this._warningBar)

    // -- Scrollable message list --
    this._messageList = document.createElement('div')
    this._messageList.className = 'chat-message-list'
    this._container.appendChild(this._messageList)

    // Empty state
    this._emptyState = document.createElement('div')
    this._emptyState.className = 'chat-empty-state'
    this._emptyState.textContent = 'Start a conversation with Claude.'
    this._messageList.appendChild(this._emptyState)

    // -- Input area (wrapper for popup positioning) --
    const inputArea = document.createElement('div')
    inputArea.className = 'chat-input-area'

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

    // -- Options bar (model, effort, mode pills + commands button) --
    this._options = createOptionsBar({
      defaults: {
        model: storage.chatModel.get(),
        effort: storage.chatEffort.get(),
        mode: storage.chatMode.get(),
      },
      onChange: (key, value) => {
        if (key === 'model') storage.chatModel.set(value)
        else if (key === 'effort') storage.chatEffort.set(value)
        else if (key === 'mode') storage.chatMode.set(value)
      },
      onCommandsClick: () => {
        this._textarea.focus()
        if (!this._textarea.value.startsWith('/')) {
          this._textarea.value = '/'
          this._textarea.dispatchEvent(new Event('input'))
        }
        this._slashPopup.show()
      },
    })

    // -- Slash command popup --
    this._slashPopup = new SlashCommandPopup(this._textarea, inputArea, {
      onExecute: (cmd, arg) => {
        if (cmd.passthrough) {
          const text = arg ? `/${cmd.name} ${arg}` : `/${cmd.name}`
          this._textarea.value = text
          this._send()
        } else if (cmd.execute) {
          cmd.execute(this, arg)
        }
      },
    })

    inputArea.appendChild(inputRow)
    inputArea.appendChild(this._options.element)
    this._container.appendChild(inputArea)
    refreshIcons(this._container)

    this._checkStatus()
    this._loadProjectCommands()
  }

  // ── Status check ─────────────────────────────────────────────────

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

  async _loadProjectCommands () {
    try {
      const cmds = await api.listCommands()
      if (cmds.length) this._slashPopup.setExternalCommands(cmds)
    } catch { /* non-critical */ }
  }

  // ── Input handling ───────────────────────────────────────────────

  _onKeyDown (e) {
    // Delegate to slash popup when active
    if (this._slashPopup?.isActive && this._slashPopup.handleKeyDown(e)) {
      return
    }
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      this._send()
    }
  }

  _autoResize () {
    this._textarea.style.height = 'auto'
    this._textarea.style.height = Math.min(this._textarea.scrollHeight, 150) + 'px'
  }

  // ── Send & stream ────────────────────────────────────────────────

  async _send () {
    const text = this._textarea.value.trim()
    if (!text || this._streaming) return

    // Handle local slash commands
    if (text.startsWith('/')) {
      const parts = text.split(/\s+/)
      const cmdName = parts[0].slice(1).toLowerCase()
      const cmd = COMMANDS.find(c => c.name === cmdName)
      if (cmd && !cmd.passthrough) {
        this._textarea.value = ''
        this._textarea.style.height = 'auto'
        const arg = parts.length > 1 ? parts.slice(1).join(' ') : undefined
        cmd.execute(this, arg)
        return
      }
    }

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

    const abort = new AbortController()
    this._abortController = abort

    try {
      const payload = {
        message: text,
        sessionId: this._sessionId || undefined,
        context: this._getContext(),
        model: this._options.getModel(),
        effort: this._options.getEffort(),
        permissionMode: this._options.getMode(),
      }

      for await (const chunk of api.streamChat(payload, { signal: abort.signal })) {
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
      if (err.name !== 'AbortError') {
        streaming.appendText(`\n\n**Error:** ${err.message}`)
      }
    }

    streaming.finish()
    this._messages.push({ role: 'assistant', content: streaming.getContent() })
    this._streaming = null
    this._abortController = null
    this._sendBtn.hidden = false
    this._stopBtn.hidden = true
    this._textarea.disabled = false
    this._textarea.focus()
    this._scrollToBottom()

    // Persist conversation after each completed turn
    await this._autoSave()
  }

  _stopStreaming () {
    if (this._abortController) {
      this._abortController.abort()
      this._abortController = null
    }
  }

  // ── Message rendering ────────────────────────────────────────────

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

  // ── Conversation lifecycle ───────────────────────────────────────

  /** Reset the view for a brand-new conversation (no server call yet). */
  newConversation () {
    this._stopStreaming()
    this._conversationId = null
    this._conversationTitle = null
    this._sessionId = null
    this._messages = []
    this._messageList.innerHTML = ''
    this._messageList.appendChild(this._emptyState)
    this._topTitle.textContent = 'New conversation'
    storage.activeConversationId.set(null)
    this._closeHistory()
    this._textarea.focus()
  }

  /**
   * Auto-save the current conversation after each assistant turn.
   * Creates the conversation on first save, then updates on subsequent ones.
   */
  async _autoSave () {
    // Serialise concurrent saves
    if (this._savingPromise) await this._savingPromise
    this._savingPromise = this._doAutoSave()
    try { await this._savingPromise } finally { this._savingPromise = null }
  }

  async _doAutoSave () {
    try {
      if (!this._conversationId) {
        // First save — create the conversation
        const title = this._messages[0]?.content.slice(0, 50) || 'New conversation'
        const conv = await api.createConversation(title)
        this._conversationId = conv.id
        this._conversationTitle = conv.title
        this._topTitle.textContent = conv.title
        storage.activeConversationId.set(conv.id)
      }

      await api.saveConversation(this._conversationId, {
        sessionId: this._sessionId,
        title: this._conversationTitle,
        messages: this._messages,
      })
    } catch (err) {
      console.warn('[chat] auto-save failed:', err)
    }
  }

  /**
   * Load a conversation by id from the server and render it.
   * @param {string} id
   */
  async _selectConversation (id) {
    const conv = await api.loadConversation(id)
    if (!conv) return

    this._stopStreaming()
    this._conversationId = conv.id
    this._conversationTitle = conv.title
    this._sessionId = conv.sessionId || null
    this._topTitle.textContent = conv.title || 'Untitled'
    storage.activeConversationId.set(conv.id)

    // Render messages
    this._messages = []
    this._messageList.innerHTML = ''
    if (!conv.messages || conv.messages.length === 0) {
      this._messageList.appendChild(this._emptyState)
    } else {
      for (const msg of conv.messages) {
        this._messages.push({ role: msg.role, content: msg.content })
        const el = renderMessage(msg)
        this._messageList.appendChild(el)
      }
      this._scrollToBottom()
    }

    this._closeHistory()
    this._textarea.focus()
  }

  /**
   * Restore the last active conversation from storage.
   * Called once by the parent after mounting.
   */
  async restoreLastConversation () {
    const id = storage.activeConversationId.get()
    if (id) await this._selectConversation(id)
  }

  // ── History dropdown ─────────────────────────────────────────────

  async _toggleHistory () {
    if (!this._historyDropdown.hidden) {
      this._closeHistory()
      return
    }
    await this._openHistory()
  }

  async _openHistory () {
    this._historyDropdown.innerHTML = ''
    this._historyDropdown.hidden = false
    document.addEventListener('click', this._onDocClick, true)

    // Loading state
    const loading = document.createElement('div')
    loading.className = 'chat-history-empty'
    loading.textContent = 'Loading...'
    this._historyDropdown.appendChild(loading)

    try {
      const conversations = await api.listConversations()
      this._historyDropdown.innerHTML = ''

      if (conversations.length === 0) {
        const empty = document.createElement('div')
        empty.className = 'chat-history-empty'
        empty.textContent = 'No conversations yet.'
        this._historyDropdown.appendChild(empty)
        return
      }

      for (const conv of conversations) {
        const item = document.createElement('div')
        item.className = 'chat-history-item'
        if (conv.id === this._conversationId) item.classList.add('active')

        const title = document.createElement('span')
        title.className = 'chat-history-item__title'
        title.textContent = conv.title || 'Untitled'

        const time = document.createElement('span')
        time.className = 'chat-history-item__time'
        time.textContent = relativeTime(conv.updatedAt || conv.createdAt)

        const deleteBtn = document.createElement('button')
        deleteBtn.className = 'chat-history-item__delete icon-btn'
        deleteBtn.title = 'Delete'
        deleteBtn.appendChild(lucideIcon('trash-2'))
        deleteBtn.addEventListener('click', (e) => {
          e.stopPropagation()
          this._deleteConversation(conv.id)
        })

        item.appendChild(title)
        item.appendChild(time)
        item.appendChild(deleteBtn)
        item.addEventListener('click', () => this._selectConversation(conv.id))
        this._historyDropdown.appendChild(item)
      }
      refreshIcons(this._historyDropdown)
    } catch (err) {
      this._historyDropdown.innerHTML = ''
      const errEl = document.createElement('div')
      errEl.className = 'chat-history-empty'
      errEl.textContent = 'Failed to load conversations.'
      this._historyDropdown.appendChild(errEl)
    }
  }

  _closeHistory () {
    this._historyDropdown.hidden = true
    document.removeEventListener('click', this._onDocClick, true)
  }

  async _deleteConversation (id) {
    await api.deleteConversation(id)
    // If we deleted the active conversation, start fresh
    if (id === this._conversationId) {
      this.newConversation()
    }
    // Refresh the list
    await this._openHistory()
  }

  // ── Legacy API (kept for external callers) ───────────────────────

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

  // ── Option setters (called by slash commands) ─────────────────────

  setModel (v) {
    this._options.setModel(v)
    storage.chatModel.set(v)
  }

  setEffort (v) {
    this._options.setEffort(v)
    storage.chatEffort.set(v)
  }

  setMode (v) {
    this._options.setMode(v)
    storage.chatMode.set(v)
  }

  dispose () {
    this._stopStreaming()
    this._closeHistory()
    this._container.innerHTML = ''
  }
}
