/**
 * Preload bridge — exposes a narrow IPC surface to the renderer as
 * `window.electronAPI`. Loaded with contextIsolation enabled so nothing
 * from node/electron leaks into the page scripts.
 *
 * Kept as .cjs because Electron's sandboxed preload does not support
 * ESM (`require` is injected by the runtime).
 */

const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('electronAPI', {
  isElectron: true,

  /** Ask the main process to pick a new root folder. Returns the new rootPath, or null if cancelled. */
  openFolder: () => ipcRenderer.invoke('dialog:openFolder'),

  /** Get the current root path (absolute). */
  getRootPath: () => ipcRenderer.invoke('app:getRootPath'),

  /** Get semver of the packaged app. */
  getVersion: () => ipcRenderer.invoke('app:getVersion'),

  /**
   * Subscribe to menu-driven actions dispatched from the main process.
   * Returns an unsubscribe function.
   *
   * Supported actions: 'new-file', 'toggle-sidebar', 'toggle-history', 'save'.
   */
  onMenuAction: (callback) => {
    const listener = (_event, action) => callback(action)
    ipcRenderer.on('menu:action', listener)
    return () => ipcRenderer.removeListener('menu:action', listener)
  },
})
