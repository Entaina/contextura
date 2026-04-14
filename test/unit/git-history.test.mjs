import { test } from 'node:test'
import assert from 'node:assert/strict'
import { writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import {
  getFileHistory,
  getUncommittedStatus,
  getFileAtRevision,
  getFileDiff,
} from '../../lib/git-history.mjs'
import { createTmpGitRepo } from '../helpers/tmp-git-repo.mjs'

test('getFileHistory returns an empty array for an untracked file', async () => {
  const repo = await createTmpGitRepo()
  try {
    await repo.commit('seed', { 'README.md': '# seed\n' })
    const abs = await repo.writeFile('orphan.md', '# orphan\n')
    const history = await getFileHistory(abs, repo.path)
    assert.deepEqual(history, [])
  } finally {
    await repo.cleanup()
  }
})

test('getFileHistory returns commits newest-first with structured fields', async () => {
  const repo = await createTmpGitRepo()
  try {
    const sha1 = await repo.commit('first', { 'notes/a.md': '# v1\n' })
    const sha2 = await repo.commit('second', { 'notes/a.md': '# v2\n' })
    const sha3 = await repo.commit('third', { 'notes/a.md': '# v3\n' })

    const history = await getFileHistory(join(repo.path, 'notes/a.md'), repo.path)
    assert.equal(history.length, 3)
    assert.deepEqual(
      history.map(h => h.subject),
      ['third', 'second', 'first']
    )
    assert.deepEqual(
      history.map(h => h.sha),
      [sha3, sha2, sha1]
    )
    for (const entry of history) {
      assert.equal(typeof entry.shortSha, 'string')
      assert.ok(entry.shortSha.length >= 4)
      assert.equal(entry.authorName, 'Contextura Test')
      assert.equal(entry.authorEmail, 'test@contextura.local')
      assert.match(entry.dateIso, /^\d{4}-\d{2}-\d{2}T/)
      assert.equal(entry.path, 'notes/a.md')
    }
  } finally {
    await repo.cleanup()
  }
})

test('getFileHistory respects the limit option', async () => {
  const repo = await createTmpGitRepo()
  try {
    for (let i = 0; i < 5; i++) {
      await repo.commit(`edit ${i}`, { 'log.md': `# v${i}\n` })
    }
    const history = await getFileHistory(join(repo.path, 'log.md'), repo.path, { limit: 2 })
    assert.equal(history.length, 2)
    assert.deepEqual(history.map(h => h.subject), ['edit 4', 'edit 3'])
  } finally {
    await repo.cleanup()
  }
})

test('getFileHistory tracks renames via --follow and reports oldPath', async () => {
  const repo = await createTmpGitRepo()
  try {
    await repo.commit('initial', { 'old.md': '# content line 1\ncontent line 2\n' })
    await repo.git(['mv', 'old.md', 'new.md'])
    await repo.commit('rename')

    const history = await getFileHistory(join(repo.path, 'new.md'), repo.path)
    assert.equal(history.length, 2)

    const renameEntry = history[0]
    assert.equal(renameEntry.subject, 'rename')
    assert.equal(renameEntry.status, 'R')
    assert.equal(renameEntry.path, 'new.md')
    assert.equal(renameEntry.oldPath, 'old.md')
    assert.ok(renameEntry.similarity !== null && renameEntry.similarity >= 50)
  } finally {
    await repo.cleanup()
  }
})

test('getUncommittedStatus reports clean, modified, and untracked states', async () => {
  const repo = await createTmpGitRepo()
  try {
    await repo.commit('initial', { 'notes/a.md': '# v1\n' })
    const tracked = join(repo.path, 'notes/a.md')

    let status = await getUncommittedStatus(tracked, repo.path)
    assert.deepEqual(status, { hasChanges: false, untracked: false })

    await writeFile(tracked, '# v1\nmodified\n', 'utf-8')
    status = await getUncommittedStatus(tracked, repo.path)
    assert.deepEqual(status, { hasChanges: true, untracked: false })

    const untracked = join(repo.path, 'notes/b.md')
    await writeFile(untracked, '# new\n', 'utf-8')
    status = await getUncommittedStatus(untracked, repo.path)
    assert.deepEqual(status, { hasChanges: true, untracked: true })
  } finally {
    await repo.cleanup()
  }
})

test('getUncommittedStatus returns no-changes for a path outside the repo', async () => {
  const repo = await createTmpGitRepo()
  try {
    await repo.commit('seed', { 'README.md': '# seed\n' })
    const outside = '/tmp/definitely-not-in-repo.md'
    const status = await getUncommittedStatus(outside, repo.path)
    assert.deepEqual(status, { hasChanges: false, untracked: false })
  } finally {
    await repo.cleanup()
  }
})

test('getFileAtRevision returns the file contents at a given sha', async () => {
  const repo = await createTmpGitRepo()
  try {
    const sha1 = await repo.commit('v1', { 'doc.md': 'first\n' })
    await repo.commit('v2', { 'doc.md': 'second\n' })

    const atFirst = await getFileAtRevision(join(repo.path, 'doc.md'), repo.path, sha1)
    assert.equal(atFirst, 'first\n')
  } finally {
    await repo.cleanup()
  }
})

test('getFileAtRevision returns null when the file is absent at that revision', async () => {
  const repo = await createTmpGitRepo()
  try {
    const sha1 = await repo.commit('seed', { 'other.md': '# other\n' })
    await repo.commit('add doc', { 'doc.md': '# doc\n' })

    const missing = await getFileAtRevision(join(repo.path, 'doc.md'), repo.path, sha1)
    assert.equal(missing, null)
  } finally {
    await repo.cleanup()
  }
})

test('getFileDiff returns a unified diff between a revision and the working tree', async () => {
  const repo = await createTmpGitRepo()
  try {
    const sha1 = await repo.commit('v1', { 'doc.md': 'alpha\nbeta\ngamma\n' })
    await writeFile(join(repo.path, 'doc.md'), 'alpha\nBETA\ngamma\n', 'utf-8')

    const diff = await getFileDiff(join(repo.path, 'doc.md'), repo.path, sha1)
    assert.match(diff, /^diff --git/m)
    assert.match(diff, /-beta/)
    assert.match(diff, /\+BETA/)
  } finally {
    await repo.cleanup()
  }
})

test('getFileDiff returns a unified diff between two revisions', async () => {
  const repo = await createTmpGitRepo()
  try {
    const sha1 = await repo.commit('v1', { 'doc.md': 'alpha\n' })
    const sha2 = await repo.commit('v2', { 'doc.md': 'alpha\nbeta\n' })

    const diff = await getFileDiff(join(repo.path, 'doc.md'), repo.path, sha2, sha1)
    assert.match(diff, /^diff --git/m)
    assert.match(diff, /-beta/)
  } finally {
    await repo.cleanup()
  }
})
