# CLAUDE.md — Contextura

This file provides guidance to Claude Code (claude.ai/code) when working on Contextura.

## Overview

**Contextura** is a native macOS editor for organizations to manage their markdown knowledge base (prompts, docs, playbooks, anything their teams and AI tools consume as context). Features:

- VS Code-like file tree sidebar
- Tabbed/split editing via Dockview
- WYSIWYG markdown editing via Toast UI Editor
- Inline git history with Google-Docs-style diffs and restore
- Live reload when files change on disk
- Native folder picker — works on any folder, not tied to a specific repo

The source code lives at the root of this repository ([github.com/Entaina/contextura](https://github.com/Entaina/contextura)), which is the same repo used for release binaries. The app was originally developed inside the [Entaina/para](https://github.com/Entaina/para) monorepo under `tools/contextura/` and was extracted here in April 2026.

## Commands

```bash
npm install                 # Install deps (electron, electron-builder, chokidar, etc.)
npm run desktop             # Launch the native Electron app in dev mode
npm run dist                # Build DMG for macOS into dist/ (no publish)
./scripts/build-icon.sh     # Regenerate assets/icon.icns from assets/source/Pi_01.png
./scripts/release.sh patch  # Full release: version bump, build, publish to GitHub
```

## Architecture

Zero-build vanilla JavaScript with a Node.js backend and an Electron shell. The app has a single entry point: `npm run desktop` boots `electron/main.cjs`, which calls `startServer({ rootPath, port: 0 })` in-process and loads the resulting `http://127.0.0.1:<port>` URL inside a `BrowserWindow`. The `rootPath` is user-chosen (persisted in `~/Library/Application Support/Contextura/config.json`), so the app can browse *any* folder.

### Backend (`server.mjs`)

- Pure Node.js HTTP server (no Express). Exports `startServer({ rootPath, port, host })` which the Electron main process calls via `await import()`.
- Returns `{ port, url, rootPath, stop }`. Electron calls `stop()` before swapping to a new `rootPath` (File → Open Folder…).
- Serves static files from `public/`
- API endpoints:
  - `GET /api/tree` — Returns recursive tree of `.md` files
  - `GET /api/file?path=<path>` — Reads file content
  - `PUT /api/file?path=<path>` — Writes file content (only `.md` files)
  - `GET /api/index` — Returns filename-to-path map for wikilink resolution
  - `GET /api/root` — Returns the currently-bound rootPath (used by the Electron bridge)
  - `GET /api/history` — git history + uncommitted status for a file
  - `GET /api/content` — raw content at a specific revision
  - `GET /api/diff` — unified diff between two revisions
  - `GET /sse` — Server-Sent Events for live reload on file changes

### Frontend (`public/app.js`)

- Single-file vanilla JS module (~1700 lines)
- **DockviewComponent** for tabbed/split panel layout
- **Toast UI Editor** for WYSIWYG markdown editing
- Custom renderers:
  - `EditorPanelRenderer` — Content panel with editor, save/dirty state
  - `DirtyTabRenderer` — Tab with dirty indicator and close button
  - `WelcomeWatermark` — Shown when no files open
- State persisted to localStorage under the `contextura:*` namespace (layout, sidebar width, last file, per-file editor mode)
- Drag-and-drop uses the MIME type `application/x-contextura-path`

### File Scanner (`lib/scanner.mjs`)

- Builds recursive tree of `.md` files
- Respects `.indexignore` exclusions (falls back to hardcoded list: `.git`, `.claude`, `.obsidian`, `node_modules`, `tools`, `Archive`)
- Generates filename index for wikilink resolution

### File Watcher (`lib/watcher.mjs`)

- Uses chokidar to watch for `.md` changes
- Broadcasts changes via SSE to trigger live reload
- Exposes `closeAllConnections()` so the Electron bridge can tear down cleanly when swapping rootPath

### Git History (`lib/git-history.mjs`)

- Wraps `git` CLI via `child_process.execFile` (zero deps)
- `getFileHistory(abs, root, {limit})` — `git log --follow` for a single file
- `getFileAtRevision(abs, root, sha)` — `git show sha:path`
- `getFileDiff(abs, root, sha, base='working')` — unified diff against working tree or another sha
- `getUncommittedStatus(abs, root)` — detects unstaged edits / untracked files for the current file

### History View (frontend — inline mode)

- `HistoryView` in `public/app.js` is an embeddable component (NOT a Dockview panel) owned by each `EditorPanelRenderer`
- Toggled via `EditorPanelRenderer._enterHistoryMode()` / `_exitHistoryMode()`: the editor is hidden via CSS (`.mode-history` on the panel root) and the history view takes its place within the same Dockview tab
- Cabecera del pane cambia a `Historial: <archivo>`; botón reloj y Guardar se ocultan; aparece `← Volver al editor`
- Unsaved edits in the editor are preserved (editor stays alive in DOM, just `display:none`)
- Timeline (left) + Google-Docs-style inline diff via markdown-it + htmldiff-js (right)
- UX is anti-git-jargon: shows relative dates + first name + commit subject, never hashes/commit/SHA
- "Restaurar esta versión" calls the `HistoryView.onAfterRestore` callback → the parent reloads the editor and auto-exits history mode

## Design System Integration

Uses Entaina Design System via CDN:

- CSS variables from `https://design-system.entaina.ai/tokens/css/variables.css`
- Tailwind config from `https://design-system.entaina.ai/tokens/tailwind/tailwind.config.js`
- Theme: `data-theme="technology"` on `<html>`
- Sidebar uses dark hoki shades manually since no dark theme exists

**Known limitation**: first launch requires internet. The desktop app caches those assets after the first load, but offline cold starts won't render styles correctly. Vendorizing into `public/vendor/` is tracked as a v1.1 nice-to-have.

## Key Patterns

- **Path safety**: `safePath()` validates all file operations stay within `ROOT_PATH`
- **Dirty tracking**: Compares editor markdown against original content (post-normalization)
- **Layout persistence**: Dockview layout serialized to localStorage (`contextura:layout`), restored on load
- **Inline creation**: VS Code-style inline input for new files/folders in the tree

## Desktop build (Electron)

`electron/` wraps the backend as a native macOS app. All files are **CJS** on purpose (see "ESM caveats" below).

### Files

- `electron/main.cjs` — Main process: app lifecycle, `BrowserWindow`, native menu, folder-picker flow, server swap on root change. Sets `app.setName('Contextura')`.
- `electron/preload.cjs` — Context-isolated bridge. Exposes `window.electronAPI` with `openFolder`, `getRootPath`, `getVersion`, `onMenuAction`.
- `electron/config.cjs` — Persists `{ rootPath, windowBounds }` to `app.getPath('userData')/config.json`.
- `electron/updater.cjs` — `electron-updater` wrapper. No-op when `!app.isPackaged`. Production builds check GitHub Releases at boot + every 6h.
- `electron-builder.yml` — Build config. Outputs unsigned DMG (arm64 + x64) to `dist/`. `publish: github` pointing at `Entaina/contextura`.
- `assets/icon.icns` — App icon. Generated by `scripts/build-icon.sh` from `assets/source/Pi_01.png` (Entaina brand mascot) with Marengo grey (#6c6e72) padding.
- `assets/source/Pi_01.png` — Source image for the icon. Original Entaina brand asset copied here to keep the repo self-contained.

### Menu actions

Menu clicks dispatch to the renderer via `ipcRenderer.send('menu:action', <action>)`, handled in `public/app.js`:

- `new-file` → triggers the "+" button in the sidebar
- `save` → calls `saveActiveFile()`
- `toggle-sidebar` → `toggleSidebar()`
- `toggle-history` → toggles `_enterHistoryMode` / `_exitHistoryMode` on the active panel's renderer

`Open Folder…` is handled directly in main.cjs (dialog → save config → `swapServer` → `win.loadURL`).

### ESM caveats (why everything Electron-side is .cjs)

- Electron 33's ESM loader trips over `import from 'electron'` in the main process with `TypeError: Cannot read properties of undefined (reading 'exports')` during link time. The only robust workaround today is to keep main-process files as CommonJS (`.cjs`).
- `server.mjs` (ESM) is loaded via `await import('../server.mjs')` from `main.cjs`, which works fine because the dynamic import runs after app initialization.
- `lib/watcher.mjs` loads `chokidar` via `createRequire` instead of an ESM `import` statement, also to sidestep the translator.
- If you invoke `electron .` from an environment that has `ELECTRON_RUN_AS_NODE=1` set (e.g. some CI and agent sandboxes), the binary runs as plain Node and `require('electron')` returns undefined. Run with `env -u ELECTRON_RUN_AS_NODE electron .` or unset it before the command.

### Runtime requirements

- macOS with `git` in PATH (Electron shells out via `child_process.execFile` for history/diff). Xcode Command Line Tools suffice.
- Internet access on first launch (Design System CDN assets — cached afterwards).

### Config location

```
~/Library/Application Support/Contextura/config.json
```

```json
{
  "rootPath": "/absolute/path/to/any/folder",
  "windowBounds": { "width": 1400, "height": 900 }
}
```

Delete the file to reset the app to a clean state (next launch shows the folder picker).

**Note**: there may be a stale `~/Library/Application Support/Context Viewer/` directory left over from the pre-rename era. Safe to delete.

## Release process

Contextura releases are published manually from the maintainer's Mac to [github.com/Entaina/contextura/releases](https://github.com/Entaina/contextura/releases) (this same repo). CI-based releases via GitHub Actions are a potential future improvement but not needed yet.

### One-time setup

1. **GitHub token**. Create a personal access token at https://github.com/settings/tokens with scope `repo`. Store it in the macOS Keychain (never in `.env` or shell history):

   ```bash
   security add-generic-password \
     -a contextura \
     -s github-release-token \
     -w ghp_xxxxxxxxxxxxxxxxxxxxxxxx
   ```

   `scripts/release.sh` reads the token from Keychain at release time.

2. **App icon**. The repo ships with `assets/icon.icns` already generated. Only regenerate if you change the source PNG:

   ```bash
   ./scripts/build-icon.sh
   ```

   Reads `assets/source/Pi_01.png` (the Entaina brand mascot) and pads it to 1024×1024 on a Marengo grey (#6c6e72) background. Idempotent.

3. **Dependencies installed**: `npm install` (electron, electron-builder, electron-updater already in devDependencies).

### Cutting a release

```bash
./scripts/release.sh patch    # 0.1.0 → 0.1.1
./scripts/release.sh minor    # 0.1.0 → 0.2.0
./scripts/release.sh major    # 0.1.0 → 1.0.0
./scripts/release.sh --no-bump  # use the current package.json version (for the very first release)
```

What the script does, in order:

1. Verifies clean git tree, icon present, deps installed
2. Loads `GH_TOKEN` from Keychain
3. Bumps `package.json` + `package-lock.json` version, commits, tags as `contextura-v<version>`
4. Runs `electron-builder --mac dmg --publish always`, which:
   - Builds `Contextura-<version>-arm64.dmg` and `Contextura-<version>.dmg`
   - Uploads them plus `latest-mac.yml` to a new GitHub Release on `Entaina/contextura`
5. Pushes the version commit and tag to the PARA remote

Takes ~3–4 minutes end-to-end (most of it is the x64 DMG build).

### Verifying a release

After `scripts/release.sh` exits cleanly:

- `gh release view v<version> --repo Entaina/contextura` should list 5 assets (2 DMGs, 2 blockmaps, 1 yml)
- Visit https://github.com/Entaina/contextura/releases/tag/v<version> and confirm the DMGs download
- `curl -I https://github.com/Entaina/contextura/releases/latest/download/latest-mac.yml` should return 200 — this is what electron-updater reads from installed clients

### Auto-update flow (installed clients)

`electron-updater` embedded in each build checks the GitHub release feed:

- Once at startup
- Every 6 hours while running
- Compares `latest-mac.yml` version against the local bundle version
- If newer, downloads in the background and applies on next quit (`autoInstallOnAppQuit: true`)

There are no hooks, no user prompts, no opt-in: the update just happens silently. Quit and relaunch the app to see a new version.

**Caveat for unsigned builds**: macOS Gatekeeper re-quarantines each freshly-downloaded DMG even when delivered via auto-update. The first launch after an update may require right-click → Open once. To eliminate the friction, sign builds with an Apple Developer ID (see "Out of scope" below).

## Out of scope (v1.1+)

- **GitHub Actions CI for releases**: deferred until post-extraction to avoid building twice
- **Apple Developer ID signing + notarization** (~€99/yr): removes the right-click-to-open friction on every update
- **Vendorized Design System assets**: serve CSS/fonts from `public/vendor/` so cold launches work offline
- **Windows / Linux builds**: out of scope per product decision (macOS-only)
- **Custom landing page at `contextura.entaina.ai`**: hosted on Cloudflare Pages, auto-detects arch and redirects to the right DMG
- **Crash reporting / telemetry**: none
- **Bespoke app icon**: current icon is Pi_01 on Marengo grey; a purpose-designed icon could come in a v1.2 branding pass
