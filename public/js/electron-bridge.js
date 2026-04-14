/**
 * Adapter for the Electron preload bridge exposed on `window.electronAPI`
 * by electron/preload.cjs. In the browser build the global is undefined and
 * every function in this module becomes a no-op, so callers can wire menu
 * handlers unconditionally.
 */

/**
 * @typedef {Record<string, () => void>} MenuActionHandlers
 * Keys are action names emitted by the native menu (e.g. 'new-file',
 * 'toggle-sidebar', 'save', 'toggle-history').
 */

/**
 * Subscribe to native menu actions forwarded by the preload bridge.
 * No-op when `window.electronAPI.onMenuAction` is not available.
 *
 * @param {MenuActionHandlers} handlers
 */
export function connectMenuActions (handlers) {
  const api = /** @type {any} */ (window).electronAPI
  if (!api?.onMenuAction) return
  api.onMenuAction((/** @type {string} */ action) => {
    const fn = handlers[action]
    if (fn) fn()
  })
}
