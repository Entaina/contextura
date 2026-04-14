/**
 * Global keyboard shortcuts. Handlers are injected so this module stays
 * decoupled from the save/sidebar implementations.
 */

/**
 * @param {Object} handlers
 * @param {() => void} handlers.save Cmd/Ctrl+S.
 * @param {() => void} handlers.toggleSidebar Cmd/Ctrl+B.
 */
export function initKeybindings ({ save, toggleSidebar }) {
  document.addEventListener('keydown', (e) => {
    if (!(e.metaKey || e.ctrlKey)) return
    if (e.key === 's') {
      e.preventDefault()
      save()
    } else if (e.key === 'b') {
      e.preventDefault()
      toggleSidebar()
    }
  })
}
