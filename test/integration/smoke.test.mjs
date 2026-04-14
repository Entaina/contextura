import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createTmpVault } from '../helpers/tmp-vault.mjs'
import { startTestServer } from '../helpers/start-test-server.mjs'

test('startServer boots against a tmp vault and stops cleanly', async () => {
  const vault = await createTmpVault()
  const server = await startTestServer({ rootPath: vault.path })
  try {
    assert.ok(server.url.startsWith('http://'))
    assert.ok(server.port > 0)
  } finally {
    await server.stop()
    await vault.cleanup()
  }
})
