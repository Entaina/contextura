/**
 * Right-side context pane controls: toggle (show/hide) and drag-to-resize.
 * Mirror of sidebar.js but anchored to the right edge. Persists width and
 * visibility through `storage`. Calls `onLayoutChange` after geometry
 * mutations so the host module can re-layout Dockview.
 */

import * as storage from '../../storage.js'

const paneEl = document.getElementById('context-pane')
const resizeHandle = document.getElementById('context-resize-handle')
const showBtn = document.getElementById('context-pane-show-btn')
const toggleBtn = document.getElementById('btn-toggle-context-pane')

const MIN_WIDTH_PX = 220
const MAX_WIDTH_RATIO = 0.5
const DEFAULT_WIDTH_PX = 320
const TOGGLE_RELAYOUT_DELAY_MS = 200

let visible = true
let onLayoutChangeRef = () => {}

/**
 * @param {Object} deps
 * @param {() => void} deps.onLayoutChange Called after toggle/resize so the
 *   host can recompute dependent layouts (typically `dockview.layout(w, h)`).
 */
export function initContextPane ({ onLayoutChange }) {
  onLayoutChangeRef = onLayoutChange

  const savedWidth = storage.contextPaneWidth.get() || DEFAULT_WIDTH_PX
  paneEl.style.width = `${savedWidth}px`

  setupResizeHandle()

  toggleBtn.addEventListener('click', toggleContextPane)
  showBtn.addEventListener('click', toggleContextPane)

  if (!storage.contextPaneVisible.get()) {
    visible = true
    toggleContextPane()
  }
}

export function toggleContextPane () {
  visible = !visible
  paneEl.classList.toggle('collapsed', !visible)
  resizeHandle.classList.toggle('hidden', !visible)
  showBtn.classList.toggle('visible', !visible)
  storage.contextPaneVisible.set(visible)
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
    startWidth = paneEl.offsetWidth
    resizeHandle.classList.add('active')
    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'
  })

  document.addEventListener('mousemove', (e) => {
    if (!dragging) return
    const delta = startX - e.clientX
    const newWidth = Math.max(
      MIN_WIDTH_PX,
      Math.min(startWidth + delta, window.innerWidth * MAX_WIDTH_RATIO)
    )
    paneEl.style.width = `${newWidth}px`
    onLayoutChangeRef()
  })

  document.addEventListener('mouseup', () => {
    if (!dragging) return
    dragging = false
    resizeHandle.classList.remove('active')
    document.body.style.cursor = ''
    document.body.style.userSelect = ''
    storage.contextPaneWidth.set(paneEl.offsetWidth)
  })
}
