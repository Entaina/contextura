import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, rm, writeFile, mkdir } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { buildTree, buildFileIndex } from '../../lib/scanner.mjs'
import { createTmpVault } from '../helpers/tmp-vault.mjs'

test('buildTree walks the fixture vault respecting .indexignore', async () => {
  const vault = await createTmpVault()
  try {
    const tree = buildTree(vault.path)

    const names = tree.map(n => n.name).sort()
    assert.deepEqual(names, ['README.md', 'notes'])

    const ignored = tree.find(n => n.name === 'ignored')
    assert.equal(ignored, undefined, 'ignored/ must be excluded by .indexignore')

    const notes = tree.find(n => n.name === 'notes')
    assert.equal(notes.type, 'dir')
    assert.equal(notes.path, 'notes')
    assert.deepEqual(
      notes.children.map(c => c.name),
      ['first.md', 'second.md']
    )
    for (const child of notes.children) {
      assert.equal(child.type, 'file')
      assert.ok(child.path.startsWith('notes/'))
    }
  } finally {
    await vault.cleanup()
  }
})

test('buildTree falls back to default exclusions when .indexignore is absent', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'contextura-scanner-'))
  try {
    await writeFile(join(dir, 'root.md'), '# root\n', 'utf-8')
    await mkdir(join(dir, 'node_modules'))
    await writeFile(join(dir, 'node_modules', 'ignored.md'), '# nope\n', 'utf-8')
    await mkdir(join(dir, '.git'))
    await writeFile(join(dir, '.git', 'HEAD'), 'ref: refs/heads/main\n', 'utf-8')

    const tree = buildTree(dir)
    const names = tree.map(n => n.name)
    assert.deepEqual(names, ['root.md'])
  } finally {
    await rm(dir, { recursive: true, force: true })
  }
})

test('buildTree prunes directories that contain no .md files', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'contextura-scanner-'))
  try {
    await mkdir(join(dir, 'empty'))
    await writeFile(join(dir, 'empty', 'notes.txt'), 'no markdown here', 'utf-8')
    await writeFile(join(dir, 'keep.md'), '# keep\n', 'utf-8')

    const tree = buildTree(dir)
    assert.deepEqual(tree.map(n => n.name), ['keep.md'])
  } finally {
    await rm(dir, { recursive: true, force: true })
  }
})

test('buildFileIndex maps both full name and stem to the file path', async () => {
  const vault = await createTmpVault()
  try {
    const tree = buildTree(vault.path)
    const index = buildFileIndex(tree)

    assert.equal(index['README.md'], 'README.md')
    assert.equal(index.README, 'README.md')
    assert.equal(index['first.md'], 'notes/first.md')
    assert.equal(index.first, 'notes/first.md')
    assert.equal(index['second.md'], 'notes/second.md')
    assert.equal(index.second, 'notes/second.md')
  } finally {
    await vault.cleanup()
  }
})
