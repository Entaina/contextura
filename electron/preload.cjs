/**
 * Preload bridge — exposes a narrow IPC surface to the renderer as
 * `window.electronAPI`. Loaded with contextIsolation enabled so nothing
 * from node/electron leaks into the page scripts.
 *
 * Kept as .cjs because Electron's sandboxed preload does not support
 * ESM (`require` is injected by the runtime).
 */

const { contextBridge, ipcRenderer } = require('electron')

// Tag the document as running inside Electron on macOS, so CSS can
// reserve space for the native traffic lights that float over the app-bar.
if (process.platform === 'darwin') {
  window.addEventListener('DOMContentLoaded', () => {
    document.body.classList.add('platform-darwin')
  })
}

contextBridge.exposeInMainWorld('electronAPI', {
  isElectron: true,

  /** Ask the main process to pick a new root folder. Returns the new rootPath, or null if cancelled. */
  openFolder: () => ipcRenderer.invoke('dialog:openFolder'),

  /** Get the current root path (absolute). */
  getRootPath: () => ipcRenderer.invoke('app:getRootPath'),

  /** Get semver of the packaged app. */
  getVersion: () => ipcRenderer.invoke('app:getVersion'),

  /** Get the configured Claude CLI binary path (null = auto-detect). */
  getClaudeBinaryPath: () => ipcRenderer.invoke('config:getClaudeBinaryPath'),

  /** Open a native file dialog to pick the Claude CLI binary. Returns the path, or null if cancelled. */
  browseClaudeBinary: () => ipcRenderer.invoke('config:browseClaudeBinary'),

  /** Save the Claude CLI binary path (null to reset to auto-detect). */
  saveClaudeBinaryPath: (path) => ipcRenderer.invoke('config:saveClaudeBinaryPath', path),

  /** Open the Preferences window. */
  openPreferences: () => ipcRenderer.invoke('config:openPreferences'),

  /** Subscribe to config changes. Callback receives the changed key. Returns unsubscribe. */
  onConfigChanged: (callback) => {
    const listener = (_event, key) => callback(key)
    ipcRenderer.on('config:changed', listener)
    return () => ipcRenderer.removeListener('config:changed', listener)
  },

  /**
   * Subscribe to menu-driven actions dispatched from the main process.
   * Returns an unsubscribe function.
   *
   * Supported actions: 'new-file', 'toggle-sidebar', 'toggle-context-pane', 'save'.
   */
  onMenuAction: (callback) => {
    const listener = (_event, action) => callback(action)
    ipcRenderer.on('menu:action', listener)
    return () => ipcRenderer.removeListener('menu:action', listener)
  },
})
