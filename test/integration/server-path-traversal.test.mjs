import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createTmpVault } from '../helpers/tmp-vault.mjs'
import { startTestServer } from '../helpers/start-test-server.mjs'

test('GET /api/file rejects ../ traversal with 403', async () => {
  const vault = await createTmpVault()
  const server = await startTestServer({ rootPath: vault.path })
  try {
    const res = await fetch(`${server.url}/api/file?path=${encodeURIComponent('../../etc/passwd')}`)
    assert.equal(res.status, 403)
  } finally {
    await server.stop()
    await vault.cleanup()
  }
})

test('GET /api/file rejects absolute paths that escape the root with 403', async () => {
  const vault = await createTmpVault()
  const server = await startTestServer({ rootPath: vault.path })
  try {
    const res = await fetch(`${server.url}/api/file?path=${encodeURIComponent('/etc/hosts')}`)
    assert.equal(res.status, 403)
  } finally {
    await server.stop()
    await vault.cleanup()
  }
})

test('PUT /api/file rejects ../ traversal with 403 and does not write anything', async () => {
  const vault = await createTmpVault()
  const server = await startTestServer({ rootPath: vault.path })
  try {
    const res = await fetch(
      `${server.url}/api/file?path=${encodeURIComponent('../escape.md')}`,
      { method: 'PUT', body: 'pwned' }
    )
    assert.equal(res.status, 403)
  } finally {
    await server.stop()
    await vault.cleanup()
  }
})

test('GET /api/history, /api/content and /api/diff apply the same traversal check', async () => {
  const vault = await createTmpVault()
  const server = await startTestServer({ rootPath: vault.path })
  try {
    const traversal = encodeURIComponent('../../etc/passwd')
    const endpoints = [
      `/api/history?path=${traversal}`,
      `/api/content?path=${traversal}&rev=HEAD`,
      `/api/diff?path=${traversal}&rev=HEAD`,
    ]
    for (const endpoint of endpoints) {
      const res = await fetch(`${server.url}${endpoint}`)
      assert.equal(res.status, 403, `expected 403 for ${endpoint}`)
    }
  } finally {
    await server.stop()
    await vault.cleanup()
  }
})
