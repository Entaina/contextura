import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createTmpVault } from '../helpers/tmp-vault.mjs'
import { startTestServer } from '../helpers/start-test-server.mjs'

test('GET /api/tree returns the expected tree for the fixture vault', async () => {
  const vault = await createTmpVault()
  const server = await startTestServer({ rootPath: vault.path })
  try {
    const res = await fetch(`${server.url}/api/tree`)
    assert.equal(res.status, 200)
    assert.match(res.headers.get('content-type'), /application\/json/)

    const tree = await res.json()
    assert.deepEqual(
      tree.map(n => n.name).sort(),
      ['README.md', 'notes']
    )
    assert.equal(tree.find(n => n.name === 'ignored'), undefined)

    const notes = tree.find(n => n.name === 'notes')
    assert.equal(notes.type, 'dir')
    assert.deepEqual(
      notes.children.map(c => c.name),
      ['first.md', 'second.md']
    )
  } finally {
    await server.stop()
    await vault.cleanup()
  }
})

test('GET /api/index returns both filename and stem mappings', async () => {
  const vault = await createTmpVault()
  const server = await startTestServer({ rootPath: vault.path })
  try {
    const res = await fetch(`${server.url}/api/index`)
    assert.equal(res.status, 200)
    const index = await res.json()
    assert.equal(index['README.md'], 'README.md')
    assert.equal(index.README, 'README.md')
    assert.equal(index['first.md'], 'notes/first.md')
    assert.equal(index.first, 'notes/first.md')
  } finally {
    await server.stop()
    await vault.cleanup()
  }
})

test('GET /api/root returns the absolute rootPath the server is bound to', async () => {
  const vault = await createTmpVault()
  const server = await startTestServer({ rootPath: vault.path })
  try {
    const res = await fetch(`${server.url}/api/root`)
    const body = await res.json()
    assert.equal(body.rootPath, server.rootPath)
  } finally {
    await server.stop()
    await vault.cleanup()
  }
})
