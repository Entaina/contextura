/**
 * Sidebar controls: toggle (show/hide) and the drag-to-resize handle.
 * Persists width and visibility through `storage`. Calls `onLayoutChange`
 * after geometry mutations so the host module can re-layout Dockview.
 */

import * as storage from '../storage.js'

const sidebarEl = document.getElementById('sidebar')
const resizeHandle = document.getElementById('resize-handle')
const btnToggleSidebar = document.getElementById('btn-toggle-sidebar')

const MIN_WIDTH_PX = 180
const MAX_WIDTH_RATIO = 0.5
const TOGGLE_RELAYOUT_DELAY_MS = 200

let visible = true
let onLayoutChangeRef = () => {}

/**
 * @param {Object} deps
 * @param {() => void} deps.onLayoutChange Called after toggle/resize so the
 *   host can recompute dependent layouts (typically `dockview.layout(w, h)`).
 */
export function initSidebar ({ onLayoutChange }) {
  onLayoutChangeRef = onLayoutChange

  setupResizeHandle()

  btnToggleSidebar.addEventListener('click', toggleSidebar)

  if (!storage.sidebarVisible.get()) {
    visible = true
    toggleSidebar()
  }
}

export function toggleSidebar () {
  visible = !visible
  sidebarEl.classList.toggle('collapsed', !visible)
  resizeHandle.classList.toggle('hidden', !visible)
  btnToggleSidebar.setAttribute('aria-pressed', String(visible))
  storage.sidebarVisible.set(visible)
  setTimeout(onLayoutChangeRef, TOGGLE_RELAYOUT_DELAY_MS)
}

function setupResizeHandle () {
  let startX = 0
  let startWidth = 0
  let dragging = false

  resizeHandle.addEventListener('mousedown', (e) => {
    e.preventDefault()
    dragging = true
    startX = e.clientX
    startWidth = sidebarEl.offsetWidth
    resizeHandle.classList.add('active')
    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'
  })

  document.addEventListener('mousemove', (e) => {
    if (!dragging) return
    const delta = e.clientX - startX
    const newWidth = Math.max(MIN_WIDTH_PX, Math.min(startWidth + delta, window.innerWidth * MAX_WIDTH_RATIO))
    sidebarEl.style.width = `${newWidth}px`
    onLayoutChangeRef()
  })

  document.addEventListener('mouseup', () => {
    if (!dragging) return
    dragging = false
    resizeHandle.classList.remove('active')
    document.body.style.cursor = ''
    document.body.style.userSelect = ''
    storage.sidebarWidth.set(sidebarEl.offsetWidth)
  })

  const savedWidth = storage.sidebarWidth.get()
  if (savedWidth) sidebarEl.style.width = `${savedWidth}px`
}
