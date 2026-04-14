import { _electron as electron } from '@playwright/test'
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createTmpVault } from '../../helpers/tmp-vault.mjs'

const REPO_ROOT = resolve(fileURLToPath(import.meta.url), '../../../..')

/**
 * Launch the packaged Electron app against an isolated userData dir and a
 * pre-seeded config.json pointing at a disposable fixture vault. This
 * bypasses the first-run folder picker deterministically without touching
 * production code.
 *
 * The redirection goes through Chromium's --user-data-dir switch. An
 * earlier attempt used HOME override, which does not work on macOS because
 * app.getPath('userData') resolves via NSSearchPathForDirectoriesInDomains
 * and ignores the HOME environment variable.
 *
 * The ELECTRON_RUN_AS_NODE gotcha documented in docs/desarrollo.md is also
 * defused: if the variable is set in the parent environment (some CI
 * sandboxes set it), we strip it before launching so Electron starts as
 * the desktop shell and not as plain Node.
 */
export async function launchContextura ({ fixture = 'sample-vault' } = {}) {
  const vault = await createTmpVault({ fixture })
  const userData = await mkdtemp(join(tmpdir(), 'contextura-userdata-'))
  await mkdir(userData, { recursive: true })
  await writeFile(
    join(userData, 'config.json'),
    JSON.stringify({
      rootPath: vault.path,
      windowBounds: { width: 1200, height: 800 },
    }),
    'utf-8'
  )

  const env = { ...process.env }
  delete env.ELECTRON_RUN_AS_NODE

  const app = await electron.launch({
    args: [REPO_ROOT, `--user-data-dir=${userData}`],
    cwd: REPO_ROOT,
    env,
  })

  const window = await app.firstWindow()

  return {
    app,
    window,
    vault,
    userData,
    async cleanup () {
      // Terminate the main process via app.exit(0) so Electron bypasses the
      // before-quit / will-quit / window-all-closed flow. On darwin those
      // hooks kick off an async serverHandle.stop() that races SSE/HTTP
      // socket shutdowns and can hang indefinitely — irrelevant for tests,
      // which just want the process gone. We fall back to kill() if even
      // the exit() handshake stalls.
      try {
        await app.evaluate(({ app: a }) => a.exit(0))
      } catch { /* process may already be gone */ }
      try {
        await Promise.race([
          app.waitForEvent('close', { timeout: 5000 }),
          new Promise((resolve) => setTimeout(resolve, 5000)),
        ])
      } catch { /* idem */ }
      try { app.process().kill('SIGKILL') } catch { /* idem */ }
      await rm(userData, { recursive: true, force: true })
      await vault.cleanup()
    },
  }
}
