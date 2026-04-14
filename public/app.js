/**
 * Contextura — Frontend
 * CSS flex layout (sidebar + resize handle + main) with
 * DockviewComponent (tabs) in the main area.
 * WYSIWYG editor via Toast UI Editor.
 */

import { DockviewComponent } from 'https://esm.sh/dockview-core@5'

import * as api from './js/api.js'
import * as storage from './js/storage.js'
import { escapeHtml, lucideIcon } from './js/infra/dom.js'
import { absoluteDateEs, firstName, relativeTimeEs } from './js/domain/date-es.js'
import { versionTypeBadge } from './js/domain/version-badge.js'
import { treeStore } from './js/state/tree-store.js'
import { panelStore } from './js/state/panel-store.js'
import { selectionStore } from './js/state/selection-store.js'
import { connectSSE } from './js/sse-client.js'
import { connectMenuActions } from './js/electron-bridge.js'
import { WelcomeWatermark } from './js/ui/dockview/welcome.js'
import { DirtyTabRenderer } from './js/ui/dockview/dirty-tab.js'
import { createLayoutStore } from './js/ui/dockview/layout-store.js'
import { EditorPanelRenderer } from './js/ui/dockview/editor-panel.js'

// ============================================================
// State
// ============================================================

/** @type {DockviewComponent} */
let dockview = null

/** @type {ReturnType<typeof createLayoutStore> | null} */
let layoutStore = null

let sidebarVisible = true

// ============================================================
// DOM references
// ============================================================

const sidebarEl = document.getElementById('sidebar')
const fileTreeEl = document.getElementById('file-tree')
const searchInput = document.getElementById('search-input')
const btnCollapseAll = document.getElementById('btn-collapse-all')
const btnNewFile = document.getElementById('btn-new-file')
const btnNewFolder = document.getElementById('btn-new-folder')
const btnToggleSidebar = document.getElementById('btn-toggle-sidebar')
const resizeHandle = document.getElementById('resize-handle')
const dockviewContainer = document.getElementById('dockview-container')
const sidebarShowBtn = document.getElementById('sidebar-show-btn')

// ============================================================
// Dockview initialization
// ============================================================

function initDockview () {
  dockview = new DockviewComponent(dockviewContainer, {
    createComponent: (options) => {
      if (options.name === 'editor') return new EditorPanelRenderer()
      return { element: document.createElement('div'), init () {}, dispose () {} }
    },
    createTabComponent: (_options) => new DirtyTabRenderer(),
    createWatermarkComponent: () => new WelcomeWatermark(),
  })

  layoutStore = createLayoutStore({ dockview, layoutDockview })

  // Track active panel → update sidebar highlight
  dockview.onDidActivePanelChange((e) => {
    if (e?.id) {
      markActive(e.id)
      revealPath(e.id)
      storage.lastFile.set(e.id)
    }
  })

  // Persist layout on changes (debounced to avoid race conditions during fromJSON)
  dockview.onDidRemovePanel(() => {
    layoutStore.schedule()
    if (!dockview.activePanel) {
      fileTreeEl.querySelectorAll('.tree-item.active').forEach(el => el.classList.remove('active'))
    }
  })
  dockview.onDidAddPanel(() => layoutStore.schedule())
  dockview.onDidLayoutChange(() => layoutStore.schedule())

  // External drag-and-drop: show overlay when dragging files from sidebar
  dockview.onUnhandledDragOverEvent((event) => {
    if (event.nativeEvent.dataTransfer?.types?.includes('application/x-contextura-path')) {
      event.accept()
    }
  })

  // External drag-and-drop: open file at drop position
  dockview.onDidDrop((event) => {
    const path = event.nativeEvent.dataTransfer?.getData('application/x-contextura-path')
    if (!path) return

    const existing = dockview.panels.find(p => p.id === path)
    if (existing) { existing.api.setActive(); return }

    const dirMap = { top: 'above', bottom: 'below', left: 'left', right: 'right' }
    const opts = {
      id: path,
      component: 'editor',
      tabComponent: 'dirty-tab',
      title: path.split('/').pop(),
      params: { path },
    }

    if (event.group) {
      if (event.position === 'center') {
        opts.position = { referenceGroup: event.group.id }
      } else {
        opts.position = { referenceGroup: event.group.id, direction: dirMap[event.position] || event.position }
      }
    }

    dockview.addPanel(opts)
    markActive(path)
    revealPath(path)
    storage.lastFile.set(path)
  })

  // Initial layout
  layoutDockview()

  // Restore layout or last file
  if (!layoutStore.restore()) {
    const last = storage.lastFile.get()
    if (last) openFile(last)
  }
}

function layoutDockview () {
  if (!dockview) return
  const w = dockviewContainer.offsetWidth
  const h = dockviewContainer.offsetHeight
  if (w > 0 && h > 0) dockview.layout(w, h)
}

// ============================================================
// Sidebar resize (drag handle)
// ============================================================

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
    const newWidth = Math.max(180, Math.min(startWidth + delta, window.innerWidth * 0.5))
    sidebarEl.style.width = `${newWidth}px`
    layoutDockview()
  })

  document.addEventListener('mouseup', () => {
    if (!dragging) return
    dragging = false
    resizeHandle.classList.remove('active')
    document.body.style.cursor = ''
    document.body.style.userSelect = ''
    storage.sidebarWidth.set(sidebarEl.offsetWidth)
  })

  // Restore saved width
  const savedWidth = storage.sidebarWidth.get()
  if (savedWidth) sidebarEl.style.width = `${savedWidth}px`
}

// ============================================================
// Toggle sidebar
// ============================================================

function toggleSidebar () {
  sidebarVisible = !sidebarVisible
  sidebarEl.classList.toggle('collapsed', !sidebarVisible)
  resizeHandle.classList.toggle('hidden', !sidebarVisible)
  sidebarShowBtn.classList.toggle('visible', !sidebarVisible)
  storage.sidebarVisible.set(sidebarVisible)
  // Re-layout dockview after sidebar animation
  setTimeout(() => layoutDockview(), 200)
}

// ============================================================
// File operations
// ============================================================

async function openFile (path, event) {
  if (!dockview) return

  // If panel already open, activate it (unless Cmd+click for split)
  const existing = dockview.panels.find(p => p.id === path)
  if (existing) {
    existing.api.setActive()
    return
  }

  // Add new panel — Cmd+click opens in a new group to the right
  const fileName = path.split('/').pop()
  const opts = {
    id: path,
    component: 'editor',
    tabComponent: 'dirty-tab',
    title: fileName,
    params: { path },
  }
  if (event?.metaKey || event?.ctrlKey) {
    opts.position = { direction: 'right' }
  }
  dockview.addPanel(opts)

  selectionStore.setFile(path)
  markActive(path)
  revealPath(path)
  storage.lastFile.set(path)
}

function saveActiveFile () {
  if (!dockview) return
  const active = dockview.activePanel
  if (!active) return
  const s = panelStore.get(active.id)
  if (s?.renderer) s.renderer.save()
}

// ============================================================
// File tree rendering
// ============================================================

function makeFileDraggable (element, path, name) {
  element.draggable = true
  element.addEventListener('dragstart', (e) => {
    e.dataTransfer.setData('application/x-contextura-path', path)
    e.dataTransfer.effectAllowed = 'copy'
    element.classList.add('dragging')
    const ghost = document.createElement('div')
    ghost.className = 'drag-ghost'
    ghost.textContent = name
    document.body.appendChild(ghost)
    e.dataTransfer.setDragImage(ghost, 0, 0)
    requestAnimationFrame(() => ghost.remove())
  })
  element.addEventListener('dragend', () => element.classList.remove('dragging'))
}

function renderTree (nodes, container, depth = 0) {
  container.innerHTML = ''
  if (nodes.length === 0) {
    container.innerHTML = '<div class="tree-loading">Sin resultados</div>'
    return
  }
  for (const node of nodes) container.appendChild(createTreeNode(node, depth))
  if (window.lucide) lucide.createIcons({ elements: [container] })
}

function createTreeNode (node, depth) {
  const indent = depth * 14

  if (node.type === 'dir') {
    const wrapper = document.createElement('div')
    const item = document.createElement('div')
    item.className = 'tree-item dir'
    item.style.paddingLeft = `${8 + indent}px`
    item.dataset.path = node.path

    const icon = document.createElement('span')
    icon.className = 'icon'
    icon.appendChild(lucideIcon('chevron-right'))

    const label = document.createElement('span')
    label.className = 'label'
    label.textContent = node.name

    item.appendChild(icon)
    item.appendChild(label)

    const actions = document.createElement('div')
    actions.className = 'tree-item-actions'
    actions.appendChild(createActionButton('file-plus', 'Nuevo archivo aquí', () =>
      startInlineCreate(node.path, 'file', depth, children, item)))
    actions.appendChild(createActionButton('folder-plus', 'Nueva carpeta aquí', () =>
      startInlineCreate(node.path, 'folder', depth, children, item)))
    item.appendChild(actions)

    const children = document.createElement('div')
    children.className = 'tree-children'

    item.addEventListener('click', (e) => {
      e.stopPropagation()
      selectionStore.setDir(node.path)
      markActive(node.path)
      const isOpen = children.classList.contains('open')
      children.classList.toggle('open', !isOpen)
      item.classList.toggle('open', !isOpen)
      if (!isOpen && children.childElementCount === 0) {
        renderTreeChildren(node.children, children, depth + 1)
      }
    })

    wrapper.appendChild(item)
    wrapper.appendChild(children)
    return wrapper
  }

  // File
  const item = document.createElement('div')
  item.className = 'tree-item file'
  item.style.paddingLeft = `${8 + indent + 14}px`
  item.dataset.path = node.path

  const label = document.createElement('span')
  label.className = 'label'
  label.textContent = node.name
  item.appendChild(label)

  if (node.name === 'index.md') {
    const badge = document.createElement('span')
    badge.className = 'index-badge'
    badge.textContent = 'idx'
    item.appendChild(badge)
  }

  item.addEventListener('click', (e) => openFile(node.path, e))
  makeFileDraggable(item, node.path, node.name)

  // Highlight if this file is the active tab
  if (dockview?.activePanel?.id === node.path) {
    item.classList.add('active')
  }

  return item
}

function renderTreeChildren (nodes, container, depth) {
  for (const node of nodes) container.appendChild(createTreeNode(node, depth))
  if (window.lucide) lucide.createIcons({ elements: [container] })
}

function refreshTree () {
  const openPaths = new Set()
  fileTreeEl.querySelectorAll('.tree-item.dir.open').forEach(el => openPaths.add(el.dataset.path))

  renderTree(treeStore.get(), fileTreeEl)

  if (openPaths.size > 0) restoreOpenDirs(fileTreeEl, openPaths)
  if (dockview?.activePanel) markActive(dockview.activePanel.id)
}

function restoreOpenDirs (container, openPaths) {
  container.querySelectorAll('.tree-item.dir').forEach(item => {
    if (openPaths.has(item.dataset.path)) {
      const wrapper = item.parentElement
      const children = wrapper.querySelector('.tree-children')
      if (children) {
        item.classList.add('open')
        children.classList.add('open')
        const node = treeStore.findByPath(item.dataset.path)
        if (node && children.childElementCount === 0) {
          const depth = Math.floor((parseInt(item.style.paddingLeft) - 8) / 14)
          renderTreeChildren(node.children, children, depth)
        }
      }
    }
  })
}

function markActive (path) {
  fileTreeEl.querySelectorAll('.tree-item.active').forEach(el => el.classList.remove('active'))
  fileTreeEl.querySelectorAll(`.tree-item[data-path="${CSS.escape(path)}"]`).forEach(el => el.classList.add('active'))
}

function revealPath (path) {
  const parts = path.split('/')
  let cumPath = ''
  for (let i = 0; i < parts.length - 1; i++) {
    cumPath = cumPath ? `${cumPath}/${parts[i]}` : parts[i]
    const dirItem = fileTreeEl.querySelector(`.tree-item.dir[data-path="${CSS.escape(cumPath)}"]`)
    if (dirItem) {
      const wrapper = dirItem.parentElement
      const children = wrapper.querySelector('.tree-children')
      if (children && !children.classList.contains('open')) {
        dirItem.classList.add('open')
        children.classList.add('open')
        const node = treeStore.findByPath(cumPath)
        if (node && children.childElementCount === 0) {
          const depth = Math.floor((parseInt(dirItem.style.paddingLeft) - 8) / 14)
          renderTreeChildren(node.children, children, depth + 1)
        }
      }
    }
  }
}

// ============================================================
// Search
// ============================================================

searchInput.addEventListener('input', () => {
  const query = searchInput.value.trim()
  if (!query) {
    renderTree(treeStore.get(), fileTreeEl)
    if (dockview?.activePanel) { revealPath(dockview.activePanel.id); markActive(dockview.activePanel.id) }
    return
  }
  const filtered = filterTree(query, treeStore.get())
  renderFilteredTree(filtered, fileTreeEl, query)
})

function filterTree (query, nodes) {
  const q = query.toLowerCase()
  const result = []
  for (const node of nodes) {
    if (node.type === 'file' && (node.name.toLowerCase().includes(q) || node.path.toLowerCase().includes(q))) {
      result.push(node)
    } else if (node.children) {
      const sub = filterTree(query, node.children)
      if (sub.length > 0) result.push({ ...node, children: sub })
    }
  }
  return result
}

function renderFilteredTree (nodes, container, query) {
  container.innerHTML = ''
  if (nodes.length === 0) { container.innerHTML = '<div class="tree-loading">Sin resultados</div>'; return }
  flattenNodes(nodes).filter(n => n.type === 'file').forEach(node => {
    const item = document.createElement('div')
    item.className = 'tree-item file'
    item.style.paddingLeft = '8px'
    item.dataset.path = node.path
    const label = document.createElement('span')
    label.className = 'label'
    label.innerHTML = highlightMatch(node.path, query)
    item.appendChild(label)
    item.addEventListener('click', (e) => openFile(node.path, e))
    makeFileDraggable(item, node.path, node.name)
    container.appendChild(item)
  })
}

function flattenNodes (nodes, acc = []) {
  for (const n of nodes) { acc.push(n); if (n.children) flattenNodes(n.children, acc) }
  return acc
}

function highlightMatch (text, query) {
  const idx = text.toLowerCase().indexOf(query.toLowerCase())
  if (idx === -1) return escapeHtml(text)
  return escapeHtml(text.slice(0, idx)) +
    `<span class="highlight">${escapeHtml(text.slice(idx, idx + query.length))}</span>` +
    escapeHtml(text.slice(idx + query.length))
}

// ============================================================
// Inline file/folder creation (VS Code-like)
// ============================================================

function createActionButton (iconName, title, onClick) {
  const btn = document.createElement('button')
  btn.className = 'tree-action-btn'
  btn.title = title
  btn.appendChild(lucideIcon(iconName))
  btn.addEventListener('click', (e) => { e.stopPropagation(); onClick() })
  return btn
}

function startInlineCreate (parentPath, type, depth, childrenEl, folderItemEl) {
  cancelInlineCreate()

  if (folderItemEl && !childrenEl.classList.contains('open')) {
    childrenEl.classList.add('open')
    folderItemEl.classList.add('open')
    if (childrenEl.childElementCount === 0) {
      const node = treeStore.findByPath(parentPath)
      if (node) renderTreeChildren(node.children, childrenEl, depth + 1)
    }
  }

  const childDepth = depth + 1
  const indent = type === 'file'
    ? 8 + childDepth * 14 + 14
    : 8 + childDepth * 14

  const draft = document.createElement('div')
  draft.className = 'tree-item tree-draft'
  draft.dataset.draft = 'true'
  draft.style.paddingLeft = `${indent}px`

  const icon = document.createElement('span')
  icon.className = 'icon draft-icon'
  icon.appendChild(lucideIcon(type === 'file' ? 'file' : 'folder'))

  const input = document.createElement('input')
  input.className = 'draft-input'
  input.type = 'text'
  input.placeholder = type === 'file' ? 'nombre.md' : 'nueva-carpeta'
  input.autocomplete = 'off'
  input.spellcheck = false

  draft.appendChild(icon)
  draft.appendChild(input)
  childrenEl.insertBefore(draft, childrenEl.firstChild)
  input.focus()

  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { e.preventDefault(); commitInlineCreate(parentPath, type, input.value.trim()) }
    if (e.key === 'Escape') { e.preventDefault(); cancelInlineCreate() }
  })

  function onOutsideClick (e) {
    if (!draft.contains(e.target)) {
      cancelInlineCreate()
      document.removeEventListener('mousedown', onOutsideClick, true)
    }
  }
  document.addEventListener('mousedown', onOutsideClick, true)
  draft._cleanup = () => document.removeEventListener('mousedown', onOutsideClick, true)
}

function cancelInlineCreate () {
  const existing = document.querySelector('[data-draft]')
  if (!existing) return
  if (existing._cleanup) existing._cleanup()
  existing.remove()
}

async function commitInlineCreate (parentPath, type, rawName) {
  cancelInlineCreate()
  if (!rawName) return

  let filePath
  if (type === 'file') {
    const name = rawName.endsWith('.md') ? rawName : rawName + '.md'
    filePath = parentPath ? `${parentPath}/${name}` : name
  } else {
    const folderName = rawName.replace(/\//g, '-')
    filePath = parentPath ? `${parentPath}/${folderName}/index.md` : `${folderName}/index.md`
  }
  await createFile(filePath)
}

function handleHeaderCreate (type) {
  let parentPath = ''
  let depth = -1
  let childrenEl = fileTreeEl
  let folderItemEl = null

  const selPath = selectionStore.path
  const selType = selectionStore.type
  let contextPath = null
  if (selType === 'dir' && selPath) {
    contextPath = selPath
  } else if (selPath) {
    const parts = selPath.split('/')
    parts.pop()
    contextPath = parts.join('/') || null
  }

  if (contextPath) {
    const dirItem = fileTreeEl.querySelector(`.tree-item.dir[data-path="${CSS.escape(contextPath)}"]`)
    if (dirItem) {
      depth = Math.floor((parseInt(dirItem.style.paddingLeft) - 8) / 14)
      folderItemEl = dirItem
      childrenEl = dirItem.parentElement.querySelector('.tree-children')
    } else {
      parentPath = contextPath
    }
  }

  if (folderItemEl) parentPath = contextPath
  startInlineCreate(parentPath, type, depth, childrenEl, folderItemEl)
}

async function createFile (path) {
  const res = await api.putFile(path, '')
  if (!res.ok) { alert('No se pudo crear el archivo.'); return }
  await loadTree()
  refreshTree()
  await openFile(path)
}

// ============================================================
// Sidebar buttons
// ============================================================

btnNewFile.addEventListener('click', () => handleHeaderCreate('file'))
btnNewFolder.addEventListener('click', () => handleHeaderCreate('folder'))

btnCollapseAll.addEventListener('click', () => {
  cancelInlineCreate()
  fileTreeEl.querySelectorAll('.tree-item.dir.open').forEach(item => {
    item.classList.remove('open')
    const children = item.parentElement.querySelector('.tree-children')
    if (children) children.classList.remove('open')
  })
})

btnToggleSidebar.addEventListener('click', () => toggleSidebar())
sidebarShowBtn.addEventListener('click', () => toggleSidebar())

// ============================================================
// Keyboard shortcuts
// ============================================================

function setupKeybindings () {
  document.addEventListener('keydown', (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 's') {
      e.preventDefault()
      saveActiveFile()
    }
    if ((e.metaKey || e.ctrlKey) && e.key === 'b') {
      e.preventDefault()
      toggleSidebar()
    }
  })
}

// ============================================================
// SSE — live reload
// ============================================================

function setupSSE () {
  connectSSE((data) => {
    loadTree().then(() => {
      if (!searchInput.value.trim()) refreshTree()
    })
    // Reload any open panel for this file (if not dirty and not just saved by this client)
    for (const s of panelStore.values()) {
      if (data.path.endsWith(s.path) && !s.isDirty) {
        if (!s.renderer.consumeJustSaved()) {
          s.renderer.loadContent()
        }
        // The dirty state vs HEAD may have changed — invalidate cached timeline
        if (s.renderer._historyView) s.renderer._historyView.invalidate()
      }
    }
  })
}

// ============================================================
// Data loading
// ============================================================

async function loadTree () {
  treeStore.set(await api.getTree())
}

// ============================================================
// Boot
// ============================================================

async function init () {
  await loadTree()

  renderTree(treeStore.get(), fileTreeEl)
  if (window.lucide) lucide.createIcons()

  initDockview()
  setupResizeHandle()
  setupSSE()
  setupKeybindings()

  // Restore sidebar state
  if (!storage.sidebarVisible.get()) {
    sidebarVisible = true
    toggleSidebar()
  }

  // Handle window resize
  window.addEventListener('resize', () => layoutDockview())

  connectMenuActions({
    'new-file': () => btnNewFile?.click(),
    'toggle-sidebar': toggleSidebar,
    save: saveActiveFile,
    'toggle-history': () => {
      const active = dockview?.activePanel
      if (!active) return
      const renderer = panelStore.get(active.id)?.renderer
      if (!renderer) return
      if (renderer._mode === 'history') renderer._exitHistoryMode()
      else renderer._enterHistoryMode()
    },
  })
}

init().catch(console.error)
