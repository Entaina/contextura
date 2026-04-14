/**
 * Persists and restores Dockview layout state through `storage.layout`.
 * Instantiated once with the live Dockview component and the function that
 * recomputes its dimensions — both are created by the host module before
 * any layout change can fire.
 *
 * The `isRestoring` guard debounces the burst of `onDidLayoutChange` events
 * that `dockview.fromJSON()` emits synchronously, plus a short async tail
 * (500ms) to absorb any deferred events.
 */

import * as storage from '../../storage.js'

const SAVE_DEBOUNCE_MS = 300
const RESTORE_GUARD_MS = 500

/**
 * @param {Object} deps
 * @param {import('https://esm.sh/dockview-core@5').DockviewComponent} deps.dockview
 * @param {() => void} deps.layoutDockview Recomputes container dimensions.
 * @returns {{ schedule: () => void, restore: () => boolean }}
 */
export function createLayoutStore ({ dockview, layoutDockview }) {
  let isRestoring = false
  let saveTimer = null

  function schedule () {
    clearTimeout(saveTimer)
    saveTimer = setTimeout(save, SAVE_DEBOUNCE_MS)
  }

  function save () {
    if (isRestoring) return
    try {
      const data = dockview.toJSON()
      if (data?.panels && Object.keys(data.panels).length > 0) {
        storage.layout.set(JSON.stringify(data))
      }
    } catch (e) {
      console.warn('Failed to save layout', e)
    }
  }

  function restore () {
    const saved = storage.layout.get()
    if (!saved) return false
    try {
      const data = JSON.parse(saved)
      if (!data?.panels || Object.keys(data.panels).length === 0) return false
      isRestoring = true
      dockview.fromJSON(data)
      layoutDockview()
      setTimeout(() => { isRestoring = false }, RESTORE_GUARD_MS)
      return true
    } catch (e) {
      isRestoring = false
      console.warn('Failed to restore layout', e)
      storage.layout.remove()
      return false
    }
  }

  return { schedule, restore }
}
