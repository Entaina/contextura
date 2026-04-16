import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const SERVER_URL = new URL('../../server.mjs', import.meta.url)

export async function startTestServer ({ rootPath, userDataPath } = {}) {
  const abs = resolve(rootPath)
  const { startServer } = await import(SERVER_URL.href)
  const handle = await startServer({ rootPath: abs, port: 0, userDataPath })
  return handle
}

export const REPO_ROOT = resolve(fileURLToPath(import.meta.url), '../../..')
