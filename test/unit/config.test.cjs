'use strict'

// config.cjs requires 'electron' and reads `app.getPath('userData')` on every
// call. We stub the module resolution so the test can point it at a temp
// directory per case, without depending on an Electron runtime.

const test = require('node:test')
const assert = require('node:assert/strict')
const { mkdtempSync, rmSync, writeFileSync, readFileSync, existsSync } = require('node:fs')
const { tmpdir } = require('node:os')
const { join } = require('node:path')
const Module = require('node:module')

let userDataDir = null
const origLoad = Module._load
Module._load = function (request, ...rest) {
  if (request === 'electron') {
    return {
      app: {
        getPath (name) {
          if (name === 'userData') return userDataDir
          throw new Error(`Unexpected getPath(${name})`)
        },
      },
    }
  }
  return origLoad.call(this, request, ...rest)
}

const { loadConfig, saveConfig } = require('../../electron/config.cjs')

function freshTmp () {
  return mkdtempSync(join(tmpdir(), 'contextura-config-'))
}

test.after(() => {
  Module._load = origLoad
})

test('loadConfig returns defaults when no config file exists', () => {
  userDataDir = freshTmp()
  try {
    const cfg = loadConfig()
    assert.equal(cfg.rootPath, null)
    assert.deepEqual(cfg.windowBounds, { width: 1400, height: 900 })
  } finally {
    rmSync(userDataDir, { recursive: true, force: true })
  }
})

test('loadConfig reads and merges an existing config file with defaults', () => {
  userDataDir = freshTmp()
  try {
    writeFileSync(
      join(userDataDir, 'config.json'),
      JSON.stringify({ rootPath: '/tmp/vault' }),
      'utf-8'
    )
    const cfg = loadConfig()
    assert.equal(cfg.rootPath, '/tmp/vault')
    // windowBounds missing from persisted file → filled from DEFAULTS
    assert.deepEqual(cfg.windowBounds, { width: 1400, height: 900 })
  } finally {
    rmSync(userDataDir, { recursive: true, force: true })
  }
})

test('loadConfig falls back to defaults on corrupted JSON', () => {
  userDataDir = freshTmp()
  const origError = console.error
  console.error = () => {}
  try {
    writeFileSync(join(userDataDir, 'config.json'), '{ not json', 'utf-8')
    const cfg = loadConfig()
    assert.equal(cfg.rootPath, null)
    assert.deepEqual(cfg.windowBounds, { width: 1400, height: 900 })
  } finally {
    console.error = origError
    rmSync(userDataDir, { recursive: true, force: true })
  }
})

test('saveConfig writes a merged partial and loadConfig round-trips it', () => {
  userDataDir = freshTmp()
  try {
    const saved = saveConfig({ rootPath: '/tmp/vault-a' })
    assert.equal(saved.rootPath, '/tmp/vault-a')
    assert.deepEqual(saved.windowBounds, { width: 1400, height: 900 })

    const file = join(userDataDir, 'config.json')
    assert.ok(existsSync(file))
    const onDisk = JSON.parse(readFileSync(file, 'utf-8'))
    assert.equal(onDisk.rootPath, '/tmp/vault-a')

    const loaded = loadConfig()
    assert.equal(loaded.rootPath, '/tmp/vault-a')
  } finally {
    rmSync(userDataDir, { recursive: true, force: true })
  }
})

test('saveConfig preserves existing keys when merging a partial update', () => {
  userDataDir = freshTmp()
  try {
    saveConfig({ rootPath: '/tmp/vault-b' })
    const merged = saveConfig({ windowBounds: { width: 1600, height: 1000 } })
    assert.equal(merged.rootPath, '/tmp/vault-b')
    assert.deepEqual(merged.windowBounds, { width: 1600, height: 1000 })
  } finally {
    rmSync(userDataDir, { recursive: true, force: true })
  }
})
