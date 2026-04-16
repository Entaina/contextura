/**
 * slash-commands.js — Command registry and autocomplete popup for the chat input.
 *
 * When the user types `/` as the first character, a popup appears above the
 * input area showing matching commands filtered by the typed prefix.
 * Arrow keys navigate, Enter selects, Escape closes.
 *
 * Commands that map to local actions (e.g. /model, /effort, /mode, /clear)
 * are executed immediately. Others (e.g. /compact, /help) are sent as-is
 * to the Claude CLI subprocess. Project commands from `.claude/commands/`
 * are loaded at runtime and always sent as passthrough.
 */

// ── Command registry ──────────────────────────────────────────────

/** Source labels for popup section headers. */
const SOURCE_LABELS = {
  project: 'Project',
  user: 'User',
  skill: 'Skills',
  plugin: 'Plugins',
}

/** Source ordering for consistent grouping. */
const SOURCE_ORDER = { builtin: 0, project: 1, user: 2, skill: 3, plugin: 4 }

/** Mode value → CLI flag value. */
const MODE_MAP = {
  ask: 'default',
  'auto-edit': 'acceptEdits',
  yolo: 'bypassPermissions',
  plan: 'plan',
}

/**
 * @typedef {Object} SlashCommand
 * @property {string} name        Command name without the leading `/`.
 * @property {string} description Short description shown in the popup.
 * @property {string} [args]      Hint for valid arguments.
 * @property {boolean} [passthrough] If true, send as message to CLI instead of executing locally.
 * @property {boolean} [project]  True for commands loaded from `.claude/commands/`.
 * @property {(chatView: any, arg?: string) => void} [execute] Local handler.
 */

/** Built-in commands (always available). @type {SlashCommand[]} */
export const BUILTIN_COMMANDS = [
  {
    name: 'model',
    args: 'sonnet | opus | haiku',
    description: 'Change model',
    execute: (view, arg) => {
      if (arg && ['sonnet', 'opus', 'haiku'].includes(arg.toLowerCase())) {
        view.setModel(arg.toLowerCase())
      }
    },
  },
  {
    name: 'effort',
    args: 'low | medium | high | max',
    description: 'Set thinking effort',
    execute: (view, arg) => {
      if (arg && ['low', 'medium', 'high', 'max'].includes(arg.toLowerCase())) {
        view.setEffort(arg.toLowerCase())
      }
    },
  },
  {
    name: 'mode',
    args: 'ask | auto-edit | yolo | plan',
    description: 'Set permission mode',
    execute: (view, arg) => {
      if (arg) {
        const key = arg.toLowerCase()
        const mapped = MODE_MAP[key]
        if (mapped) view.setMode(mapped)
      }
    },
  },
  {
    name: 'clear',
    description: 'New conversation',
    execute: (view) => view.newConversation(),
  },
  {
    name: 'compact',
    description: 'Compact conversation',
    passthrough: true,
  },
  {
    name: 'help',
    description: 'Show available commands',
    passthrough: true,
  },
]

// Keep legacy export for chat-view local command check
export { BUILTIN_COMMANDS as COMMANDS }

// ── SlashCommandPopup ─────────────────────────────────────────────

export class SlashCommandPopup {
  /**
   * @param {HTMLTextAreaElement} textarea  The chat input element.
   * @param {HTMLElement} anchor            Positioned ancestor for the popup.
   * @param {Object} callbacks
   * @param {(cmd: SlashCommand, arg?: string) => void} callbacks.onExecute
   */
  constructor (textarea, anchor, { onExecute }) {
    this._textarea = textarea
    this._anchor = anchor
    this._onExecute = onExecute
    this._selectedIndex = 0
    this._filtered = []
    this._visible = false
    this._projectCommands = []

    this._el = document.createElement('div')
    this._el.className = 'chat-cmd-popup'
    this._el.hidden = true
    anchor.appendChild(this._el)

    this._textarea.addEventListener('input', () => this._onInput())
  }

  /** All commands: built-in + external, sorted by source group then name. */
  get _allCommands () {
    const all = [
      ...BUILTIN_COMMANDS.map(c => ({ ...c, source: 'builtin' })),
      ...this._projectCommands,
    ]
    return all.sort((a, b) => {
      const sa = SOURCE_ORDER[a.source] ?? 9
      const sb = SOURCE_ORDER[b.source] ?? 9
      return sa !== sb ? sa - sb : a.name.localeCompare(b.name)
    })
  }

  /**
   * Load external commands/skills from the server response.
   * @param {{ name: string, description: string, argumentHint?: string, source: string, plugin?: string }[]} cmds
   */
  setExternalCommands (cmds) {
    this._projectCommands = cmds.map(c => ({
      name: c.name,
      description: c.description || '',
      args: c.argumentHint,
      passthrough: true,
      source: c.source,
      plugin: c.plugin,
    }))
  }

  /** Whether the popup is currently visible (for keydown delegation). */
  get isActive () { return this._visible }

  /** Show the popup with all commands (e.g. when clicking the `/` button). */
  show () {
    this._filtered = this._allCommands
    this._selectedIndex = 0
    this._render()
    this._el.hidden = false
    this._visible = true
  }

  hide () {
    this._el.hidden = true
    this._visible = false
  }

  /**
   * Handle keyboard events when popup is active.
   * @param {KeyboardEvent} e
   * @returns {boolean} true if event was consumed.
   */
  handleKeyDown (e) {
    if (!this._visible) return false

    if (e.key === 'ArrowDown') {
      e.preventDefault()
      this._selectedIndex = Math.min(this._selectedIndex + 1, this._filtered.length - 1)
      this._updateSelection()
      return true
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault()
      this._selectedIndex = Math.max(this._selectedIndex - 1, 0)
      this._updateSelection()
      return true
    }
    if (e.key === 'Enter') {
      e.preventDefault()
      this._executeSelected()
      return true
    }
    if (e.key === 'Escape') {
      e.preventDefault()
      this.hide()
      return true
    }
    if (e.key === 'Tab') {
      e.preventDefault()
      this._fillSelected()
      return true
    }
    return false
  }

  // ── Private ───────────────────────────────────────────────────────

  _onInput () {
    const text = this._textarea.value
    // Only activate when `/` is the first character and cursor is in the first word
    if (!text.startsWith('/')) {
      if (this._visible) this.hide()
      return
    }

    const firstSpace = text.indexOf(' ')
    const query = (firstSpace === -1 ? text.slice(1) : text.slice(1, firstSpace)).toLowerCase()

    this._filtered = this._allCommands.filter(cmd => cmd.name.toLowerCase().startsWith(query))
    if (this._filtered.length === 0) {
      this.hide()
      return
    }

    this._selectedIndex = Math.min(this._selectedIndex, this._filtered.length - 1)
    this._render()
    this._el.hidden = false
    this._visible = true
  }

  _render () {
    this._el.innerHTML = ''
    let lastSource = null
    this._filtered.forEach((cmd, i) => {
      const src = cmd.source || 'builtin'
      if (src !== lastSource && lastSource !== null) {
        const sep = document.createElement('div')
        sep.className = 'chat-cmd-separator'
        sep.textContent = SOURCE_LABELS[src] || src
        this._el.appendChild(sep)
      }
      lastSource = src

      const item = document.createElement('div')
      item.className = 'chat-cmd-item'
      if (i === this._selectedIndex) item.classList.add('selected')

      const name = document.createElement('span')
      name.className = 'chat-cmd-name'
      name.textContent = `/${cmd.name}`

      const desc = document.createElement('span')
      desc.className = 'chat-cmd-desc'
      desc.textContent = cmd.description

      item.appendChild(name)
      if (cmd.args) {
        const args = document.createElement('span')
        args.className = 'chat-cmd-args'
        args.textContent = cmd.args
        item.appendChild(args)
      }
      item.appendChild(desc)

      item.addEventListener('click', () => {
        this._selectedIndex = i
        this._executeSelected()
      })
      item.addEventListener('mouseenter', () => {
        this._selectedIndex = i
        this._updateSelection()
      })

      this._el.appendChild(item)
    })
  }

  _updateSelection () {
    const items = this._el.querySelectorAll('.chat-cmd-item')
    items.forEach((el, i) => el.classList.toggle('selected', i === this._selectedIndex))
    // Scroll selected into view
    const selected = items[this._selectedIndex]
    if (selected) selected.scrollIntoView({ block: 'nearest' })
  }

  /** Tab: fill the command name into the textarea without executing. */
  _fillSelected () {
    const cmd = this._filtered[this._selectedIndex]
    if (!cmd) return
    this._textarea.value = `/${cmd.name} `
    this._textarea.dispatchEvent(new Event('input'))
    this.hide()
  }

  _executeSelected () {
    const cmd = this._filtered[this._selectedIndex]
    if (!cmd) return

    // Parse argument from textarea (e.g. "/model opus" → arg = "opus")
    const text = this._textarea.value.trim()
    const parts = text.split(/\s+/)
    const arg = parts.length > 1 ? parts.slice(1).join(' ') : undefined

    this._textarea.value = ''
    this._textarea.style.height = 'auto'
    this.hide()
    this._onExecute(cmd, arg)
  }
}
