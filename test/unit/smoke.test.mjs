import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createTmpVault } from '../helpers/tmp-vault.mjs'

test('node:test runner works', () => {
  assert.equal(1 + 1, 2)
})

test('tmp-vault helper copies fixture to a scratch directory', async () => {
  const vault = await createTmpVault()
  try {
    assert.match(vault.path, /contextura-vault-/)
  } finally {
    await vault.cleanup()
  }
})
