/**
 * Context pane host: owns the tab bar and the module slots inside the right
 * pane. Routes active-file changes to the history module regardless of which
 * tab is visible, so switching back always shows the correct file.
 *
 * Modules:
 * - history  — git version timeline for the active file
 * - chat     — Claude chat panel (session-scoped, independent of active file)
 */

import { HistoryModule } from './history-module.js'
import { ChatView } from '../chat/chat-view.js'
import { panelStore } from '../../state/panel-store.js'
import { lucideIcon, refreshIcons } from '../../infra/dom.js'
import * as storage from '../../storage.js'

const tabsEl = document.getElementById('context-pane-tabs')
const bodyEl = document.getElementById('context-pane-body')

let historyModule = null
let chatView = null
let currentPath = null
let activeTab = null
let onVersionSelectRef = () => {}
let getContextRef = () => ({})

// Module containers (created once, toggled via .active class)
let historyContainer = null
let chatContainer = null

// Tab buttons
let historyTabBtn = null
let chatTabBtn = null

/**
 * @param {Object} deps
 * @param {(path: string, version: object) => void} deps.onVersionSelect
 *   Called when the user clicks an entry in the history timeline.
 */
export function initContextHost ({ onVersionSelect, getContext }) {
  onVersionSelectRef = onVersionSelect || (() => {})
  getContextRef = getContext || (() => ({}))

  // -- Build tab buttons --
  historyTabBtn = createTabButton('clock', 'Historial')
  chatTabBtn = createTabButton('message-circle', 'Chat')

  historyTabBtn.addEventListener('click', () => switchTab('history'))
  chatTabBtn.addEventListener('click', () => switchTab('chat'))

  tabsEl.appendChild(historyTabBtn)
  tabsEl.appendChild(chatTabBtn)
  refreshIcons(tabsEl)

  // -- Build module containers --
  historyContainer = document.createElement('div')
  historyContainer.className = 'context-module context-module-history'

  chatContainer = document.createElement('div')
  chatContainer.className = 'context-module context-module-chat'

  bodyEl.innerHTML = ''
  bodyEl.appendChild(historyContainer)
  bodyEl.appendChild(chatContainer)

  // -- Restore persisted tab --
  const saved = storage.contextPaneTab.get()
  switchTab(saved === 'chat' ? 'chat' : 'history')
}

/**
 * @param {string} id  'history' | 'chat'
 */
function switchTab (id) {
  if (activeTab === id) return
  activeTab = id
  storage.contextPaneTab.set(id)

  historyTabBtn.classList.toggle('active', id === 'history')
  chatTabBtn.classList.toggle('active', id === 'chat')

  historyContainer.classList.toggle('active', id === 'history')
  chatContainer.classList.toggle('active', id === 'chat')

  // Lazy-create modules on first activation
  if (id === 'history') ensureHistoryModule()
  if (id === 'chat') ensureChatView()
}

function ensureHistoryModule () {
  if (historyModule) return
  historyModule = new HistoryModule({
    onVersionSelect: (v) => onVersionSelectRef(currentPath, v),
    isEditorDirty: (p) => !!panelStore.get(p)?.isDirty,
  })
  historyContainer.appendChild(historyModule.element)
  if (currentPath) {
    historyModule.setPath(currentPath)
    historyModule.load()
  }
}

function ensureChatView () {
  if (chatView) return
  chatView = new ChatView(chatContainer, { getContext: getContextRef })
}

/**
 * @param {string | null} path Active file path, or null when no file is active.
 */
export function setActiveFile (path) {
  if (path === currentPath) return
  currentPath = path

  if (!path) {
    if (!historyModule) return
    // Clear history but keep chat untouched
    historyContainer.innerHTML = ''
    historyContainer.appendChild(historyModule.element)
    return
  }

  // Always update history module (even if chat tab is active) so switching
  // back to the history tab shows the correct file immediately.
  ensureHistoryModule()
  historyModule.setPath(path)
  historyModule.load()
}

/**
 * Drop any cached history for a path — called from the SSE watcher when the
 * file changes on disk. If the invalidated path is the active one, also
 * reloads immediately so the timeline stays current.
 */
export function invalidateHistory (path) {
  if (!historyModule) return
  historyModule.invalidate(path)
  if (path === currentPath) historyModule.load()
}

/**
 * Re-render the history timeline without refetching. Called by editor panels
 * when the editor dirty flag transitions so HEAD absorption and the
 * "Versión actual" subtitle stay in sync with in-memory edits.
 */
export function notifyEditorDirtyChanged (path) {
  if (!historyModule || path !== currentPath) return
  historyModule.refresh()
}

/** Switch to the chat tab (used by the toggle-chat action). */
export function activateChatTab () {
  switchTab('chat')
}

/** @returns {string} Current active tab id ('history' | 'chat'). */
export function getActiveTab () {
  return activeTab
}

// -- Helpers --

function createTabButton (iconName, tooltip) {
  const btn = document.createElement('button')
  btn.className = 'context-tab'
  btn.title = tooltip
  btn.appendChild(lucideIcon(iconName))
  return btn
}
