/**
 * message-renderer.js — Renders chat messages (user or assistant) as HTML.
 * Assistant messages support heterogeneous content blocks: text (markdown),
 * thinking (collapsible), and tool use (collapsible with result).
 */

const md = window.markdownit ? window.markdownit() : null
const MAX_TOOL_RESULT_LENGTH = 2000

/**
 * Create a DOM element for a completed chat message.
 *
 * @param {{ role: 'user' | 'assistant', content: string }} message
 * @returns {HTMLElement}
 */
export function renderMessage (message) {
  const el = document.createElement('div')
  el.className = `chat-message chat-message--${message.role}`

  const label = document.createElement('div')
  label.className = 'chat-message__label'
  label.textContent = message.role === 'user' ? 'You' : 'Claude'
  el.appendChild(label)

  const body = document.createElement('div')
  body.className = 'chat-message__body'

  if (message.role === 'assistant' && md) {
    body.innerHTML = md.render(message.content || '')
  } else {
    body.textContent = message.content || ''
  }

  el.appendChild(body)
  return el
}

/**
 * Create a streaming assistant message that supports text, thinking, and
 * tool_use blocks arriving interleaved. Returns an object with methods to
 * push content into each block type.
 */
export function createStreamingMessage () {
  const el = document.createElement('div')
  el.className = 'chat-message chat-message--assistant chat-message--streaming'

  const label = document.createElement('div')
  label.className = 'chat-message__label'
  label.textContent = 'Claude'
  el.appendChild(label)

  const body = document.createElement('div')
  body.className = 'chat-message__body'
  el.appendChild(body)

  // ── State ──
  let textAccumulated = ''
  let textEl = null
  let renderTimer = null

  let thinkingEl = null
  let thinkingContent = null
  let thinkingAccumulated = ''
  let thinkingTimer = null

  const tools = new Map() // toolUseId → { details, summary, inputEl, resultEl }

  // ── Text ──
  function ensureTextEl () {
    if (!textEl) {
      textEl = document.createElement('div')
      textEl.className = 'chat-message__text'
      body.appendChild(textEl)
    }
    return textEl
  }

  function renderText () {
    const target = ensureTextEl()
    if (md) {
      target.innerHTML = md.render(textAccumulated)
    } else {
      target.textContent = textAccumulated
    }
  }

  function appendText (text) {
    textAccumulated += text
    if (!renderTimer) {
      renderTimer = setTimeout(() => { renderTimer = null; renderText() }, 80)
    }
  }

  // ── Thinking ──
  function ensureThinkingEl () {
    if (!thinkingEl) {
      thinkingEl = document.createElement('details')
      thinkingEl.className = 'chat-thinking'
      thinkingEl.open = true
      const summary = document.createElement('summary')
      summary.textContent = 'Thinking\u2026'
      thinkingEl.appendChild(summary)
      thinkingContent = document.createElement('div')
      thinkingContent.className = 'chat-thinking__content'
      thinkingEl.appendChild(thinkingContent)
      // Insert thinking before any text
      if (textEl) {
        body.insertBefore(thinkingEl, textEl)
      } else {
        body.appendChild(thinkingEl)
      }
    }
    return thinkingContent
  }

  function renderThinking () {
    const target = ensureThinkingEl()
    target.textContent = thinkingAccumulated
  }

  function appendThinking (text) {
    thinkingAccumulated += text
    if (!thinkingTimer) {
      thinkingTimer = setTimeout(() => { thinkingTimer = null; renderThinking() }, 80)
    }
  }

  // ── Tool use ──
  function startTool ({ name, toolUseId }) {
    const details = document.createElement('details')
    details.className = 'chat-tool-use'
    details.open = true

    const summary = document.createElement('summary')
    summary.innerHTML = `<span class="chat-tool-use__icon">\u2699</span> <strong>${escapeHtml(name)}</strong>`
    details.appendChild(summary)

    const inputEl = document.createElement('pre')
    inputEl.className = 'chat-tool-use__input'
    details.appendChild(inputEl)

    const resultEl = document.createElement('div')
    resultEl.className = 'chat-tool-use__result'
    resultEl.hidden = true
    details.appendChild(resultEl)

    // Insert before text block if it exists
    if (textEl) {
      body.insertBefore(details, textEl)
    } else {
      body.appendChild(details)
    }

    tools.set(toolUseId, { details, summary, inputEl, resultEl, name })
  }

  function appendToolDelta ({ toolUseId, json }) {
    const tool = tools.get(toolUseId)
    if (!tool) return
    try {
      const parsed = JSON.parse(json)
      tool.inputEl.textContent = JSON.stringify(parsed, null, 2)
      // Update summary with first meaningful param
      const firstVal = Object.values(parsed)[0]
      if (typeof firstVal === 'string' && firstVal.length < 200) {
        const short = firstVal.length > 60 ? firstVal.slice(0, 60) + '\u2026' : firstVal
        tool.summary.innerHTML = `<span class="chat-tool-use__icon">\u2699</span> <strong>${escapeHtml(tool.name)}</strong> <span class="chat-tool-use__param">${escapeHtml(short)}</span>`
      }
    } catch {
      tool.inputEl.textContent = json
    }
  }

  function endTool ({ toolUseId }) {
    const tool = tools.get(toolUseId)
    if (!tool) return
    tool.details.open = false
  }

  function setToolResult ({ toolUseId, content }) {
    const tool = tools.get(toolUseId)
    if (!tool) return
    const truncated = content.length > MAX_TOOL_RESULT_LENGTH
      ? content.slice(0, MAX_TOOL_RESULT_LENGTH) + '\n\u2026 (truncated)'
      : content
    tool.resultEl.hidden = false
    tool.resultEl.textContent = truncated
  }

  // ── Finish ──
  function finish () {
    clearTimeout(renderTimer)
    clearTimeout(thinkingTimer)
    renderTimer = null
    thinkingTimer = null
    if (textAccumulated) renderText()
    if (thinkingAccumulated) renderThinking()
    // Collapse thinking after completion
    if (thinkingEl) thinkingEl.open = false
    el.classList.remove('chat-message--streaming')
  }

  function getContent () { return textAccumulated }

  return {
    element: el,
    // Legacy compat — appendText aliases append
    append: appendText,
    appendText,
    appendThinking,
    startTool,
    appendToolDelta,
    endTool,
    setToolResult,
    finish,
    getContent,
  }
}

function escapeHtml (str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}
