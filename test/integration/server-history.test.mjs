import { test } from 'node:test'
import assert from 'node:assert/strict'
import { writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { createTmpGitRepo } from '../helpers/tmp-git-repo.mjs'
import { startTestServer } from '../helpers/start-test-server.mjs'

test('GET /api/history returns versions + clean uncommitted state for a tracked file', async () => {
  const repo = await createTmpGitRepo()
  try {
    const sha1 = await repo.commit('v1', { 'doc.md': '# v1\n' })
    const sha2 = await repo.commit('v2', { 'doc.md': '# v2\n' })

    const server = await startTestServer({ rootPath: repo.path })
    try {
      const res = await fetch(`${server.url}/api/history?path=doc.md`)
      assert.equal(res.status, 200)
      const body = await res.json()

      assert.equal(body.notInGit, false)
      assert.equal(body.hasUncommittedChanges, false)
      assert.equal(body.untracked, false)
      assert.equal(body.versions.length, 2)
      assert.deepEqual(
        body.versions.map(v => v.sha),
        [sha2, sha1]
      )
    } finally {
      await server.stop()
    }
  } finally {
    await repo.cleanup()
  }
})

test('GET /api/history reports hasUncommittedChanges after an unstaged edit', async () => {
  const repo = await createTmpGitRepo()
  try {
    await repo.commit('v1', { 'doc.md': '# v1\n' })
    await writeFile(join(repo.path, 'doc.md'), '# v1 modified\n', 'utf-8')

    const server = await startTestServer({ rootPath: repo.path })
    try {
      const res = await fetch(`${server.url}/api/history?path=doc.md`)
      const body = await res.json()
      assert.equal(body.hasUncommittedChanges, true)
      assert.equal(body.untracked, false)
    } finally {
      await server.stop()
    }
  } finally {
    await repo.cleanup()
  }
})

test('GET /api/history reports untracked=true for a brand-new file', async () => {
  const repo = await createTmpGitRepo()
  try {
    await repo.commit('seed', { 'README.md': '# seed\n' })
    await repo.writeFile('brand-new.md', '# new\n')

    const server = await startTestServer({ rootPath: repo.path })
    try {
      const res = await fetch(`${server.url}/api/history?path=brand-new.md`)
      const body = await res.json()
      assert.equal(body.notInGit, true)
      assert.equal(body.hasUncommittedChanges, true)
      assert.equal(body.untracked, true)
      assert.deepEqual(body.versions, [])
    } finally {
      await server.stop()
    }
  } finally {
    await repo.cleanup()
  }
})

test('GET /api/content returns the content of a file at a specific revision', async () => {
  const repo = await createTmpGitRepo()
  try {
    const sha1 = await repo.commit('v1', { 'doc.md': 'first\n' })
    await repo.commit('v2', { 'doc.md': 'second\n' })

    const server = await startTestServer({ rootPath: repo.path })
    try {
      const res = await fetch(`${server.url}/api/content?path=doc.md&rev=${sha1}`)
      assert.equal(res.status, 200)
      const body = await res.json()
      assert.equal(body.content, 'first\n')
    } finally {
      await server.stop()
    }
  } finally {
    await repo.cleanup()
  }
})

test('GET /api/diff returns a unified diff between a revision and the working tree', async () => {
  const repo = await createTmpGitRepo()
  try {
    const sha1 = await repo.commit('v1', { 'doc.md': 'alpha\nbeta\ngamma\n' })
    await writeFile(join(repo.path, 'doc.md'), 'alpha\nBETA\ngamma\n', 'utf-8')

    const server = await startTestServer({ rootPath: repo.path })
    try {
      const res = await fetch(`${server.url}/api/diff?path=doc.md&rev=${sha1}`)
      assert.equal(res.status, 200)
      const body = await res.json()
      assert.match(body.diff, /^diff --git/m)
      assert.match(body.diff, /-beta/)
      assert.match(body.diff, /\+BETA/)
      assert.equal(body.oldContent, 'alpha\nbeta\ngamma\n')
    } finally {
      await server.stop()
    }
  } finally {
    await repo.cleanup()
  }
})

test('GET /api/history returns 400 when the path parameter is missing', async () => {
  const repo = await createTmpGitRepo()
  try {
    await repo.commit('seed', { 'README.md': '# seed\n' })
    const server = await startTestServer({ rootPath: repo.path })
    try {
      const res = await fetch(`${server.url}/api/history`)
      assert.equal(res.status, 400)
    } finally {
      await server.stop()
    }
  } finally {
    await repo.cleanup()
  }
})
