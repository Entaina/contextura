import { cp, mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const FIXTURES_ROOT = resolve(fileURLToPath(import.meta.url), '../../fixtures')

export async function createTmpVault ({ fixture = 'sample-vault' } = {}) {
  const dir = await mkdtemp(join(tmpdir(), 'contextura-vault-'))
  await cp(join(FIXTURES_ROOT, fixture), dir, { recursive: true })
  return {
    path: dir,
    async cleanup () {
      await rm(dir, { recursive: true, force: true })
    },
  }
}
