/**
 * Thin DOM helpers shared across the UI layer.
 * No state, no side effects beyond the element they return.
 */

/**
 * Create a Lucide icon element. Calls `lucide.createIcons()` on it if the
 * global is available so the raw `<i data-lucide>` gets swapped for the SVG.
 *
 * @param {string} name Lucide icon name (e.g. 'file-plus').
 * @returns {HTMLSpanElement}
 */
export function lucideIcon (name) {
  const span = document.createElement('span')
  span.className = 'lucide-icon'
  span.innerHTML = `<i data-lucide="${name}"></i>`
  if (window.lucide) window.lucide.createIcons({ elements: [span] })
  return span
}

/**
 * Escape the 4 HTML-significant characters. Use before interpolating
 * user-controlled text into an `innerHTML` string.
 *
 * @param {string} str
 * @returns {string}
 */
export function escapeHtml (str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}
