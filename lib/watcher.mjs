/**
 * File watcher + SSE broadcaster for live reload.
 * Watches .md files and broadcasts the changed path to all connected clients.
 *
 * chokidar is a CJS module. We load it via `createRequire` rather than an
 * `import` statement to sidestep an Electron 33 ESM→CJS translator crash
 * ("Cannot read properties of undefined (reading 'exports')") that trips
 * during module link time. Using CJS interop works identically under plain
 * Node (`node server.mjs`) and under Electron.
 */

import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const chokidar = require('chokidar');

const connections = new Set();
let debounceTimer = null;

export function createWatcher(rootPath, onInvalidate) {
  const watcher = chokidar.watch(rootPath, {
    ignoreInitial: true,
    ignored: [
      '**/node_modules/**',
      '**/.git/**',
      '**/.claude/**',
      '**/tools/**',
      '**/Archive/**',
    ],
    awaitWriteFinish: { stabilityThreshold: 200 },
  });

  watcher.on('all', (event, filePath) => {
    if (!filePath.endsWith('.md')) return;

    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      console.log(`[watch] ${event}: ${filePath}`);
      onInvalidate();
      broadcast(filePath);
    }, 300);
  });

  watcher.on('ready', () => {
    console.log(`[watch] Watching ${rootPath} for .md changes`);
  });

  return watcher;
}

function broadcast(filePath) {
  const message = JSON.stringify({ type: 'change', path: filePath });
  for (const res of connections) {
    res.write(`data: ${message}\n\n`);
  }
}

export function sseHandler(req, res) {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
  });

  res.write('data: {"type":"connected"}\n\n');

  connections.add(res);

  req.on('close', () => {
    connections.delete(res);
  });
}

/**
 * Close every active SSE connection. Called by server stop() so clients
 * disconnect cleanly before the HTTP server is shut down.
 */
export function closeAllConnections() {
  for (const res of connections) {
    try { res.end(); } catch { /* noop */ }
  }
  connections.clear();
}
