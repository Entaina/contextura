import { test } from 'node:test'
import assert from 'node:assert/strict'
import { writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { createTmpVault } from '../helpers/tmp-vault.mjs'
import { startTestServer } from '../helpers/start-test-server.mjs'

// Minimal SSE reader: yields parsed JSON payloads from each `data: ...\n\n`
// frame in the response body. Consumed once inside a single for-await loop so
// the underlying generator is not prematurely closed between events.
async function * readSseEvents (response) {
  const decoder = new TextDecoder()
  let buffer = ''
  for await (const chunk of response.body) {
    buffer += decoder.decode(chunk, { stream: true })
    let sep
    while ((sep = buffer.indexOf('\n\n')) !== -1) {
      const frame = buffer.slice(0, sep)
      buffer = buffer.slice(sep + 2)
      for (const line of frame.split('\n')) {
        if (line.startsWith('data: ')) {
          yield JSON.parse(line.slice('data: '.length))
        }
      }
    }
  }
}

test('GET /sse emits a change event when an .md file is modified', async () => {
  const vault = await createTmpVault()
  const server = await startTestServer({ rootPath: vault.path })
  const controller = new AbortController()
  // Hard ceiling: if we never receive a change event the fetch is aborted so
  // the for-await loop terminates and the test fails fast instead of hanging.
  const hardTimeout = setTimeout(() => controller.abort(), 8000)

  let connected = false
  let change = null

  try {
    const response = await fetch(`${server.url}/sse`, { signal: controller.signal })
    assert.equal(response.status, 200)
    assert.match(response.headers.get('content-type'), /text\/event-stream/)

    try {
      for await (const event of readSseEvents(response)) {
        if (event.type === 'connected') {
          connected = true
          // Let chokidar finish its initial scan before perturbing the vault.
          // awaitWriteFinish stability is 200 ms + watcher debounce 300 ms.
          setTimeout(() => {
            writeFile(join(vault.path, 'notes/first.md'), '# touched by sse test\n', 'utf-8')
              .catch(() => { /* best-effort: failure will surface as missing event */ })
          }, 300)
          continue
        }
        if (event.type === 'change') {
          change = event
          break
        }
      }
    } catch (err) {
      if (err.name !== 'AbortError') throw err
    }
  } finally {
    clearTimeout(hardTimeout)
    controller.abort()
    await server.stop()
    await vault.cleanup()
  }

  assert.ok(connected, 'did not receive connected handshake')
  assert.ok(change, 'did not receive change event within 8s')
  assert.ok(change.path.endsWith('.md'))
})
