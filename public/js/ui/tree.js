/**
 * Sidebar file tree UI: rendering, drag-and-drop, search/filter, and inline
 * file/folder creation. Call `configureTree({ openFile, getActivePanel })`
 * once at boot; the rest of the module reads treeStore/selectionStore/api
 * directly.
 */

import * as api from '../api.js'
import { escapeHtml, lucideIcon, refreshIcons } from '../infra/dom.js'
import { treeStore } from '../state/tree-store.js'
import { selectionStore } from '../state/selection-store.js'

const fileTreeEl = document.getElementById('file-tree')
const searchInput = document.getElementById('search-input')
const btnNewFile = document.getElementById('btn-new-file')
const btnNewFolder = document.getElementById('btn-new-folder')
const btnCollapseAll = document.getElementById('btn-collapse-all')

export const DRAG_MIME = 'application/x-contextura-path'

/** @type {(path: string, event?: MouseEvent) => void} */
let openFileRef = null
/** @type {() => { id?: string } | null | undefined} */
let getActivePanelRef = null

/**
 * Wire up the external collaborators the tree UI needs and attach the
 * top-level event listeners that depend on them (search input, header
 * buttons). Must be called once before any tree render.
 *
 * @param {Object} deps
 * @param {(path: string, event?: MouseEvent) => void} deps.openFile
 * @param {() => { id?: string } | null | undefined} deps.getActivePanel
 */
export function configureTree ({ openFile, getActivePanel }) {
  openFileRef = openFile
  getActivePanelRef = getActivePanel

  searchInput.addEventListener('input', onSearchInput)
  btnNewFile.addEventListener('click', () => handleHeaderCreate('file'))
  btnNewFolder.addEventListener('click', () => handleHeaderCreate('folder'))
  btnCollapseAll.addEventListener('click', collapseAll)
}

// ============================================================
// Rendering
// ============================================================

export function renderTree (nodes, container = fileTreeEl, depth = 0) {
  // Clearing innerHTML drops draft elements without firing their cleanup;
  // walk and release their document-level mousedown listeners first.
  container.querySelectorAll('[data-draft]').forEach(el => el._cleanup?.())
  container.innerHTML = ''
  if (nodes.length === 0) {
    container.innerHTML = '<div class="tree-loading">Sin resultados</div>'
    return
  }
  for (const node of nodes) container.appendChild(createTreeNode(node, depth))
  refreshIcons(container)
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

  item.addEventListener('click', (e) => openFileRef(node.path, e))
  makeFileDraggable(item, node.path, node.name)

  if (getActivePanelRef()?.id === node.path) {
    item.classList.add('active')
  }

  return item
}

function renderTreeChildren (nodes, container, depth) {
  for (const node of nodes) container.appendChild(createTreeNode(node, depth))
  refreshIcons(container)
}

export function refreshTree () {
  const openPaths = new Set()
  fileTreeEl.querySelectorAll('.tree-item.dir.open').forEach(el => openPaths.add(el.dataset.path))

  renderTree(treeStore.get(), fileTreeEl)

  if (openPaths.size > 0) restoreOpenDirs(fileTreeEl, openPaths)
  const active = getActivePanelRef()
  if (active) markActive(active.id)
}

function restoreOpenDirs (container, openPaths) {
  container.querySelectorAll('.tree-item.dir').forEach(item => {
    if (!openPaths.has(item.dataset.path)) return
    const wrapper = item.parentElement
    const children = wrapper.querySelector('.tree-children')
    if (!children) return
    item.classList.add('open')
    children.classList.add('open')
    const node = treeStore.findByPath(item.dataset.path)
    if (node && children.childElementCount === 0) {
      const depth = Math.floor((parseInt(item.style.paddingLeft) - 8) / 14)
      renderTreeChildren(node.children, children, depth)
    }
  })
}

export function markActive (path) {
  fileTreeEl.querySelectorAll('.tree-item.active').forEach(el => el.classList.remove('active'))
  fileTreeEl.querySelectorAll(`.tree-item[data-path="${CSS.escape(path)}"]`).forEach(el => el.classList.add('active'))
}

export function clearActive () {
  fileTreeEl.querySelectorAll('.tree-item.active').forEach(el => el.classList.remove('active'))
}

export function revealPath (path) {
  const parts = path.split('/')
  let cumPath = ''
  for (let i = 0; i < parts.length - 1; i++) {
    cumPath = cumPath ? `${cumPath}/${parts[i]}` : parts[i]
    const dirItem = fileTreeEl.querySelector(`.tree-item.dir[data-path="${CSS.escape(cumPath)}"]`)
    if (!dirItem) continue
    const wrapper = dirItem.parentElement
    const children = wrapper.querySelector('.tree-children')
    if (!children || children.classList.contains('open')) continue
    dirItem.classList.add('open')
    children.classList.add('open')
    const node = treeStore.findByPath(cumPath)
    if (node && children.childElementCount === 0) {
      const depth = Math.floor((parseInt(dirItem.style.paddingLeft) - 8) / 14)
      renderTreeChildren(node.children, children, depth + 1)
    }
  }
}

// ============================================================
// Drag-and-drop
// ============================================================

function makeFileDraggable (element, path, name) {
  element.draggable = true
  element.addEventListener('dragstart', (e) => {
    e.dataTransfer.setData(DRAG_MIME, path)
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

// ============================================================
// Search
// ============================================================

function onSearchInput () {
  const query = searchInput.value.trim()
  if (!query) {
    renderTree(treeStore.get(), fileTreeEl)
    const active = getActivePanelRef()
    if (active) { revealPath(active.id); markActive(active.id) }
    return
  }
  const filtered = filterTree(query, treeStore.get())
  renderFilteredTree(filtered, fileTreeEl, query)
}

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
  container.querySelectorAll('[data-draft]').forEach(el => el._cleanup?.())
  container.innerHTML = ''
  if (nodes.length === 0) {
    container.innerHTML = '<div class="tree-loading">Sin resultados</div>'
    return
  }
  flattenNodes(nodes).filter(n => n.type === 'file').forEach(node => {
    const item = document.createElement('div')
    item.className = 'tree-item file'
    item.style.paddingLeft = '8px'
    item.dataset.path = node.path
    const label = document.createElement('span')
    label.className = 'label'
    label.innerHTML = highlightMatch(node.path, query)
    item.appendChild(label)
    item.addEventListener('click', (e) => openFileRef(node.path, e))
    makeFileDraggable(item, node.path, node.name)
    container.appendChild(item)
  })
}

function flattenNodes (nodes, acc = []) {
  for (const n of nodes) {
    acc.push(n)
    if (n.children) flattenNodes(n.children, acc)
  }
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
// Inline file/folder creation (VS-Code style)
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
    contextPath = parentPath(selPath)
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
  treeStore.set(await api.getTree())
  refreshTree()
  await openFileRef(path)
}

function collapseAll () {
  cancelInlineCreate()
  fileTreeEl.querySelectorAll('.tree-item.dir.open').forEach(item => {
    item.classList.remove('open')
    const children = item.parentElement.querySelector('.tree-children')
    if (children) children.classList.remove('open')
  })
}
