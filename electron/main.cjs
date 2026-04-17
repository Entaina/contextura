/**
 * Electron main process for Contextura desktop.
 *
 * Reuses the existing Node HTTP backend (server.mjs) in-process: the
 * renderer (BrowserWindow) loads http://127.0.0.1:<port> and talks to
 * the same REST API the web build uses. Swapping the root folder stops
 * the current server and starts a fresh one with the new rootPath.
 *
 * This file is CommonJS (not ESM) because Electron's built-in `electron`
 * module is only injected by the main-process CJS loader. An ESM main
 * that tries to `import from 'electron'` trips the ESM→CJS translator in
 * Electron 33. CJS here lets us `require('electron')` cleanly, and we
 * still load the ESM `server.mjs` via `await import()`.
 */

const { app, BrowserWindow, dialog, Menu, ipcMain, nativeTheme, shell } = require('electron')
const { basename, join } = require('node:path')
const { existsSync, statSync } = require('node:fs')

const { loadConfig, saveConfig, userDataPath } = require('./config.cjs')
const { initAutoUpdater } = require('./updater.cjs')

const PRELOAD_PATH = join(__dirname, 'preload.cjs')

let mainWindow = null
let serverHandle = null
let startServer = null // lazy-loaded from ESM ../server.mjs

app.setName('Contextura')

// Contextura siempre en light mode (tema "hoja de papel"); ignoramos el
// modo oscuro del sistema para que la titlebar y el chrome nativo no
// rompan la composición del tema propio.
nativeTheme.themeSource = 'light'

async function loadStartServer () {
  if (startServer) return startServer
  const mod = await import('../server.mjs')
  startServer = mod.startServer
  return startServer
}

function isValidDirectory (path) {
  if (!path) return false
  try {
    return statSync(path).isDirectory()
  } catch {
    return false
  }
}

async function pickFolder (defaultPath) {
  const result = await dialog.showOpenDialog({
    title: 'Open folder',
    message: 'Select the folder Contextura should browse',
    defaultPath: defaultPath && existsSync(defaultPath) ? defaultPath : app.getPath('home'),
    properties: ['openDirectory', 'createDirectory'],
  })
  if (result.canceled || result.filePaths.length === 0) return null
  return result.filePaths[0]
}

async function ensureRootPath (config) {
  if (isValidDirectory(config.rootPath)) return config.rootPath
  const picked = await pickFolder(config.rootPath)
  if (!picked) return null
  saveConfig({ rootPath: picked })
  return picked
}

async function swapServer (rootPath) {
  if (serverHandle) {
    try { await serverHandle.stop() } catch (err) { console.warn('[main] stop failed:', err.message) }
    serverHandle = null
  }
  const start = await loadStartServer()
  serverHandle = await start({
    rootPath,
    port: 0,
    userDataPath: userDataPath(),
    claudeBinaryPath: loadConfig().claudeBinaryPath,
  })
  return serverHandle
}

function updateWindowTitle (rootPath) {
  if (!mainWindow) return
  mainWindow.setTitle(`Contextura — ${basename(rootPath)}`)
}

async function openFolderFlow () {
  const config = loadConfig()
  const picked = await pickFolder(config.rootPath)
  if (!picked) return null
  if (picked === config.rootPath && serverHandle) return picked

  saveConfig({ rootPath: picked })
  await swapServer(picked)
  if (mainWindow && serverHandle) {
    mainWindow.loadURL(serverHandle.url)
    updateWindowTitle(picked)
  }
  return picked
}

let prefsWindow = null

function openPreferences () {
  if (prefsWindow) {
    prefsWindow.focus()
    return
  }

  prefsWindow = new BrowserWindow({
    width: 480,
    height: 200,
    resizable: false,
    minimizable: false,
    maximizable: false,
    fullscreenable: false,
    title: 'Preferences',
    parent: mainWindow,
    modal: false,
    show: false,
    webPreferences: {
      preload: PRELOAD_PATH,
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  })

  const url = `${serverHandle.url}/public/preferences.html`
  prefsWindow.loadURL(url).catch((err) => {
    console.error('[main] Failed to load preferences:', err.message)
    if (prefsWindow) { prefsWindow.destroy(); prefsWindow = null }
  })
  prefsWindow.once('ready-to-show', () => prefsWindow.show())
  prefsWindow.on('closed', () => { prefsWindow = null })
}

async function pushClaudeBinaryToServer (path) {
  if (!serverHandle) return
  try {
    await fetch(`${serverHandle.url}/api/config/claude-binary`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path }),
    })
  } catch (err) {
    console.warn('[main] Failed to push claude binary path to server:', err.message)
  }
}

function buildMenu () {
  const isMac = process.platform === 'darwin'

  const sendAction = (action) => {
    if (mainWindow) mainWindow.webContents.send('menu:action', action)
  }

  const template = [
    ...(isMac
      ? [{
          label: app.name,
          submenu: [
            { role: 'about' },
            { type: 'separator' },
            {
              label: 'Preferences…',
              accelerator: 'CmdOrCtrl+,',
              click: () => { openPreferences() },
            },
            { type: 'separator' },
            { role: 'services' },
            { type: 'separator' },
            { role: 'hide' },
            { role: 'hideOthers' },
            { role: 'unhide' },
            { type: 'separator' },
            { role: 'quit' },
          ],
        }]
      : []),
    {
      label: 'File',
      submenu: [
        {
          label: 'Open Folder…',
          accelerator: 'CmdOrCtrl+O',
          click: () => { openFolderFlow() },
        },
        { type: 'separator' },
        {
          label: 'New File',
          accelerator: 'CmdOrCtrl+N',
          click: () => sendAction('new-file'),
        },
        {
          label: 'Save',
          accelerator: 'CmdOrCtrl+S',
          click: () => sendAction('save'),
        },
        { type: 'separator' },
        isMac
          ? {
              label: 'Close Tab',
              accelerator: 'CmdOrCtrl+W',
              click: () => sendAction('close-tab'),
            }
          : { role: 'quit' },
      ],
    },
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        { role: 'selectAll' },
      ],
    },
    {
      label: 'View',
      submenu: [
        {
          label: 'Toggle Sidebar',
          accelerator: 'CmdOrCtrl+B',
          click: () => sendAction('toggle-sidebar'),
        },
        {
          label: 'Toggle Context Pane',
          accelerator: 'CmdOrCtrl+Alt+B',
          click: () => sendAction('toggle-context-pane'),
        },
        {
          label: 'Toggle Chat',
          accelerator: 'Shift+CmdOrCtrl+L',
          click: () => sendAction('toggle-chat'),
        },
        { type: 'separator' },
        { role: 'reload' },
        { role: 'toggleDevTools' },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' },
      ],
    },
    {
      label: 'Window',
      submenu: [
        { role: 'minimize' },
        { role: 'zoom' },
        ...(isMac
          ? [
              { type: 'separator' },
              { role: 'front' },
              { type: 'separator' },
              {
                label: 'Close Window',
                accelerator: 'Shift+CmdOrCtrl+W',
                role: 'close',
              },
            ]
          : [
              { role: 'close' },
            ]),
      ],
    },
    {
      role: 'help',
      submenu: [
        {
          label: 'Project Repository',
          click: () => shell.openExternal('https://github.com/'),
        },
      ],
    },
  ]

  Menu.setApplicationMenu(Menu.buildFromTemplate(template))
}

function createWindow (url) {
  const config = loadConfig()
  const { width, height } = config.windowBounds || { width: 1400, height: 900 }

  mainWindow = new BrowserWindow({
    width,
    height,
    minWidth: 900,
    minHeight: 600,
    title: 'Contextura',
    backgroundColor: '#ffffff', // matching --background del tema propio
    ...(process.platform === 'darwin' && {
      titleBarStyle: 'hiddenInset',
      trafficLightPosition: { x: 12, y: 10 },
    }),
    webPreferences: {
      preload: PRELOAD_PATH,
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  })

  mainWindow.loadURL(url)

  mainWindow.on('close', () => {
    if (!mainWindow) return
    const [w, h] = mainWindow.getSize()
    saveConfig({ windowBounds: { width: w, height: h } })
  })

  mainWindow.on('closed', () => {
    mainWindow = null
  })
}

function wireIpc () {
  ipcMain.handle('dialog:openFolder', async () => openFolderFlow())
  ipcMain.handle('app:getRootPath', () => serverHandle?.rootPath || null)
  ipcMain.handle('app:getVersion', () => app.getVersion())

  ipcMain.handle('config:getClaudeBinaryPath', () => {
    return loadConfig().claudeBinaryPath || null
  })

  ipcMain.handle('config:browseClaudeBinary', async () => {
    const parent = prefsWindow || mainWindow
    const result = await dialog.showOpenDialog(parent, {
      title: 'Select Claude CLI binary',
      properties: ['openFile', 'showHiddenFiles', 'treatPackageAsDirectory'],
    })
    if (result.canceled || !result.filePaths.length) return null
    return result.filePaths[0]
  })

  ipcMain.handle('config:saveClaudeBinaryPath', async (_event, path) => {
    saveConfig({ claudeBinaryPath: path })
    await pushClaudeBinaryToServer(path)
    if (mainWindow) mainWindow.webContents.send('config:changed', 'claudeBinaryPath')
    return path
  })

  ipcMain.handle('config:openPreferences', () => {
    openPreferences()
  })
}

async function bootstrap () {
  wireIpc()

  const config = loadConfig()
  const rootPath = await ensureRootPath(config)

  if (!rootPath) {
    app.quit()
    return
  }

  const start = await loadStartServer()
  serverHandle = await start({
    rootPath,
    port: 0,
    userDataPath: userDataPath(),
    claudeBinaryPath: config.claudeBinaryPath,
  })
  buildMenu()
  createWindow(serverHandle.url)
  updateWindowTitle(rootPath)

  initAutoUpdater().catch((err) => console.warn('[updater] init failed:', err.message))
}

app.whenReady().then(bootstrap).catch((err) => {
  console.error('[main] bootstrap failed:', err)
  dialog.showErrorBox('Contextura', `Failed to start: ${err.message}`)
  app.quit()
})

let isQuitting = false
app.on('before-quit', (event) => {
  if (isQuitting) return
  isQuitting = true
  if (!serverHandle) return
  event.preventDefault()
  const timeout = new Promise(resolve => setTimeout(resolve, 2000))
  Promise.race([serverHandle.stop(), timeout])
    .catch(err => console.warn('[main] stop failed:', err.message))
    .finally(() => { serverHandle = null; app.exit(0) })
})

app.on('window-all-closed', async () => {
  if (serverHandle) {
    try { await serverHandle.stop() } catch { /* noop */ }
    serverHandle = null
  }
  if (process.platform !== 'darwin') app.quit()
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0 && serverHandle) {
    createWindow(serverHandle.url)
    updateWindowTitle(serverHandle.rootPath)
  }
})
