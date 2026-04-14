import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { createTmpVault } from '../helpers/tmp-vault.mjs'
import { startTestServer } from '../helpers/start-test-server.mjs'

test('GET /api/file returns raw markdown content', async () => {
  const vault = await createTmpVault()
  const server = await startTestServer({ rootPath: vault.path })
  try {
    const res = await fetch(`${server.url}/api/file?path=notes/first.md`)
    assert.equal(res.status, 200)
    assert.match(res.headers.get('content-type'), /text\/plain/)
    const body = await res.text()
    assert.match(body, /^# First/)
  } finally {
    await server.stop()
    await vault.cleanup()
  }
})

test('GET /api/file without path parameter returns 400', async () => {
  const vault = await createTmpVault()
  const server = await startTestServer({ rootPath: vault.path })
  try {
    const res = await fetch(`${server.url}/api/file`)
    assert.equal(res.status, 400)
    const body = await res.json()
    assert.match(body.error, /path/i)
  } finally {
    await server.stop()
    await vault.cleanup()
  }
})

test('GET /api/file for a missing file returns 404', async () => {
  const vault = await createTmpVault()
  const server = await startTestServer({ rootPath: vault.path })
  try {
    const res = await fetch(`${server.url}/api/file?path=does-not-exist.md`)
    assert.equal(res.status, 404)
  } finally {
    await server.stop()
    await vault.cleanup()
  }
})

test('PUT /api/file writes content to disk and GET round-trips it', async () => {
  const vault = await createTmpVault()
  const server = await startTestServer({ rootPath: vault.path })
  try {
    const body = '# Edited\n\nNuevo contenido.\n'
    const putRes = await fetch(`${server.url}/api/file?path=notes/first.md`, {
      method: 'PUT',
      body,
    })
    assert.equal(putRes.status, 200)
    assert.deepEqual(await putRes.json(), { ok: true })

    const onDisk = await readFile(join(vault.path, 'notes/first.md'), 'utf-8')
    assert.equal(onDisk, body)

    const getRes = await fetch(`${server.url}/api/file?path=notes/first.md`)
    assert.equal(await getRes.text(), body)
  } finally {
    await server.stop()
    await vault.cleanup()
  }
})

test('PUT /api/file creates missing parent directories for new files', async () => {
  const vault = await createTmpVault()
  const server = await startTestServer({ rootPath: vault.path })
  try {
    const body = '# Brand new\n'
    const putRes = await fetch(`${server.url}/api/file?path=new/nested/doc.md`, {
      method: 'PUT',
      body,
    })
    assert.equal(putRes.status, 200)
    const onDisk = await readFile(join(vault.path, 'new/nested/doc.md'), 'utf-8')
    assert.equal(onDisk, body)
  } finally {
    await server.stop()
    await vault.cleanup()
  }
})

test('PUT /api/file rejects non-markdown paths with 400', async () => {
  const vault = await createTmpVault()
  const server = await startTestServer({ rootPath: vault.path })
  try {
    const res = await fetch(`${server.url}/api/file?path=config.json`, {
      method: 'PUT',
      body: '{}',
    })
    assert.equal(res.status, 400)
    const body = await res.json()
    assert.match(body.error, /\.md/i)
  } finally {
    await server.stop()
    await vault.cleanup()
  }
})
