/**
 * Auto-update wrapper using electron-updater. Safe no-op in dev (`electron .`)
 * and when running unpackaged.
 *
 * Note: DMGs shipped without code-signing still work with electron-updater,
 * but macOS Gatekeeper blocks the first launch of each new version. Users
 * must right-click → Open once per update. Documented in CLAUDE.md.
 */

const { app } = require('electron')

const CHECK_INTERVAL_MS = 6 * 60 * 60 * 1000 // 6 hours

let started = false

async function initAutoUpdater ({ logger = console } = {}) {
  if (started) return
  if (!app.isPackaged) {
    logger.log('[updater] Skipped (not packaged)')
    return
  }
  started = true

  let autoUpdater
  try {
    ({ autoUpdater } = require('electron-updater'))
  } catch (err) {
    logger.warn('[updater] electron-updater not installed, skipping:', err.message)
    return
  }

  autoUpdater.logger = logger
  autoUpdater.autoDownload = true
  autoUpdater.autoInstallOnAppQuit = true

  autoUpdater.on('error', (err) => logger.error('[updater] error:', err?.message || err))
  autoUpdater.on('update-available', (info) => logger.log('[updater] update available:', info?.version))
  autoUpdater.on('update-downloaded', (info) => logger.log('[updater] update downloaded:', info?.version))

  const check = () => {
    autoUpdater.checkForUpdatesAndNotify().catch((err) => {
      logger.warn('[updater] check failed:', err?.message || err)
    })
  }

  check()
  setInterval(check, CHECK_INTERVAL_MS)
}

module.exports = { initAutoUpdater }
