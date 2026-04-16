/**
 * chat-options.js — Options bar for the chat input area.
 *
 * Renders a row of pill selectors (model, effort, mode) and a `/` button
 * to open the slash command popup. Each pill opens a dropdown on click.
 *
 * Pure DOM construction, no framework.
 */

import { lucideIcon, refreshIcons } from '../../infra/dom.js'

// ── Pill selector factory ─────────────────────────────────────────

/**
 * Create a pill-style dropdown selector.
 *
 * @param {Object} opts
 * @param {string} opts.icon       Lucide icon name.
 * @param {{ value: string, label: string }[]} opts.options
 * @param {string} opts.defaultValue
 * @param {(value: string) => void} opts.onChange
 * @returns {{ element: HTMLElement, getValue: () => string, setValue: (v: string) => void }}
 */
function createPillSelector ({ icon, options, defaultValue, onChange }) {
  let current = defaultValue
  let dropdownVisible = false

  // -- Pill button --
  const pill = document.createElement('button')
  pill.className = 'chat-pill'
  pill.type = 'button'

  const iconEl = lucideIcon(icon)
  const label = document.createElement('span')
  label.className = 'chat-pill__label'
  label.textContent = options.find(o => o.value === current)?.label || current

  const chevron = document.createElement('span')
  chevron.className = 'chat-pill__chevron'
  chevron.textContent = '\u25BE' // ▾

  pill.appendChild(iconEl)
  pill.appendChild(label)
  pill.appendChild(chevron)

  // -- Dropdown --
  const dropdown = document.createElement('div')
  dropdown.className = 'chat-pill-dropdown'
  dropdown.hidden = true

  function renderDropdown () {
    dropdown.innerHTML = ''
    for (const opt of options) {
      const item = document.createElement('div')
      item.className = 'chat-pill-option'
      if (opt.value === current) item.classList.add('active')
      item.textContent = opt.label
      item.addEventListener('click', (e) => {
        e.stopPropagation()
        current = opt.value
        label.textContent = opt.label
        closeDropdown()
        onChange(opt.value)
      })
      dropdown.appendChild(item)
    }
  }

  function openDropdown () {
    renderDropdown()
    dropdown.hidden = false
    dropdownVisible = true
    document.addEventListener('click', onDocClick, true)
  }

  function closeDropdown () {
    dropdown.hidden = true
    dropdownVisible = false
    document.removeEventListener('click', onDocClick, true)
  }

  function onDocClick (e) {
    if (!pill.contains(e.target) && !dropdown.contains(e.target)) {
      closeDropdown()
    }
  }

  pill.addEventListener('click', (e) => {
    e.stopPropagation()
    if (dropdownVisible) closeDropdown()
    else openDropdown()
  })

  // -- Wrapper (for absolute positioning of dropdown) --
  const wrapper = document.createElement('div')
  wrapper.className = 'chat-pill-wrapper'
  wrapper.appendChild(pill)
  wrapper.appendChild(dropdown)
  refreshIcons(wrapper)

  return {
    element: wrapper,
    getValue: () => current,
    setValue: (v) => {
      const opt = options.find(o => o.value === v)
      if (!opt) return
      current = v
      label.textContent = opt.label
      onChange(v)
    },
  }
}

// ── Options bar ───────────────────────────────────────────────────

/**
 * Create the options bar with pill selectors and a commands button.
 *
 * @param {Object} opts
 * @param {{ model: string, effort: string, mode: string }} opts.defaults  Initial values.
 * @param {(key: string, value: string) => void} opts.onChange  Called on any pill change.
 * @param {() => void} opts.onCommandsClick  Called when the `/` button is clicked.
 * @returns {{
 *   element: HTMLElement,
 *   getModel: () => string, getEffort: () => string, getMode: () => string,
 *   setModel: (v: string) => void, setEffort: (v: string) => void, setMode: (v: string) => void,
 * }}
 */
export function createOptionsBar ({ defaults, onChange, onCommandsClick }) {
  const bar = document.createElement('div')
  bar.className = 'chat-options-bar'

  // Commands button
  const cmdBtn = document.createElement('button')
  cmdBtn.className = 'chat-cmd-btn'
  cmdBtn.type = 'button'
  cmdBtn.title = 'Commands'
  cmdBtn.textContent = '/'
  cmdBtn.addEventListener('click', () => onCommandsClick())
  bar.appendChild(cmdBtn)

  // Model pill
  const modelPill = createPillSelector({
    icon: 'cpu',
    options: [
      { value: 'sonnet', label: 'Sonnet' },
      { value: 'opus', label: 'Opus' },
      { value: 'haiku', label: 'Haiku' },
    ],
    defaultValue: defaults.model,
    onChange: (v) => onChange('model', v),
  })
  bar.appendChild(modelPill.element)

  // Effort pill
  const effortPill = createPillSelector({
    icon: 'brain',
    options: [
      { value: 'low', label: 'Low' },
      { value: 'medium', label: 'Medium' },
      { value: 'high', label: 'High' },
      { value: 'max', label: 'Max' },
    ],
    defaultValue: defaults.effort,
    onChange: (v) => onChange('effort', v),
  })
  bar.appendChild(effortPill.element)

  // Mode pill
  const modePill = createPillSelector({
    icon: 'shield',
    options: [
      { value: 'default', label: 'Ask' },
      { value: 'acceptEdits', label: 'Auto-edit' },
      { value: 'bypassPermissions', label: 'Yolo' },
      { value: 'plan', label: 'Plan' },
    ],
    defaultValue: defaults.mode,
    onChange: (v) => onChange('mode', v),
  })
  bar.appendChild(modePill.element)

  return {
    element: bar,
    getModel: () => modelPill.getValue(),
    getEffort: () => effortPill.getValue(),
    getMode: () => modePill.getValue(),
    setModel: (v) => modelPill.setValue(v),
    setEffort: (v) => effortPill.setValue(v),
    setMode: (v) => modePill.setValue(v),
  }
}
