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

const { loadConfig, saveConfig } = require('./config.cjs')
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
  serverHandle = await start({ rootPath, port: 0 })
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
  serverHandle = await start({ rootPath, port: 0 })
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
