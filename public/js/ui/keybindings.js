/**
 * Global keyboard shortcuts. Handlers are injected so this module stays
 * decoupled from the save/sidebar implementations.
 */

/**
 * @param {Object} handlers
 * @param {() => void} handlers.save Cmd/Ctrl+S.
 * @param {() => void} handlers.toggleSidebar Cmd/Ctrl+B.
 * @param {() => void} handlers.toggleContextPane Cmd/Ctrl+Alt+B.
 * @param {() => void} handlers.toggleChat Shift+Cmd/Ctrl+L.
 */
export function initKeybindings ({ save, toggleSidebar, toggleContextPane, toggleChat }) {
  document.addEventListener('keydown', (e) => {
    if (!(e.metaKey || e.ctrlKey)) return
    if (e.key === 's') {
      e.preventDefault()
      save()
    } else if (e.shiftKey && (e.key === 'l' || e.key === 'L')) {
      e.preventDefault()
      toggleChat()
    } else if (e.key === 'b') {
      e.preventDefault()
      if (e.altKey) toggleContextPane()
      else toggleSidebar()
    }
  })
}
