/**
 * Lightweight JSON config persisted in Electron's userData directory.
 * Stores the last-used rootPath and window bounds between launches.
 */

const { app } = require('electron')
const { readFileSync, writeFileSync, mkdirSync, existsSync } = require('node:fs')
const { join, dirname } = require('node:path')

const CONFIG_FILENAME = 'config.json'

function configPath () {
  return join(app.getPath('userData'), CONFIG_FILENAME)
}

const DEFAULTS = {
  rootPath: null,
  windowBounds: { width: 1400, height: 900 },
}

function userDataPath () {
  return app.getPath('userData')
}

function loadConfig () {
  const file = configPath()
  if (!existsSync(file)) return { ...DEFAULTS }
  try {
    const raw = readFileSync(file, 'utf-8')
    return { ...DEFAULTS, ...JSON.parse(raw) }
  } catch (err) {
    console.error('[config] Failed to read config, using defaults:', err.message)
    return { ...DEFAULTS }
  }
}

function saveConfig (partial) {
  const file = configPath()
  const current = loadConfig()
  const next = { ...current, ...partial }
  try {
    mkdirSync(dirname(file), { recursive: true })
    writeFileSync(file, JSON.stringify(next, null, 2), 'utf-8')
  } catch (err) {
    console.error('[config] Failed to write config:', err.message)
  }
  return next
}

module.exports = { loadConfig, saveConfig, userDataPath }
