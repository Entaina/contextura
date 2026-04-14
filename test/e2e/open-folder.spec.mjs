import { test, expect } from '@playwright/test'
import { launchContextura } from './helpers/launch-app.mjs'

test('Electron app boots against the configured vault and renders the tree', async () => {
  const ctx = await launchContextura()
  try {
    const { window } = ctx
    const tree = window.locator('#file-tree')

    await expect(tree.locator('[data-path="README.md"]')).toHaveCount(1)
    await expect(tree.locator('[data-path="notes"]')).toHaveCount(1)

    // `ignored/` is excluded by .indexignore, must not appear in the sidebar.
    await expect(tree.locator('[data-path="ignored"]')).toHaveCount(0)
  } finally {
    await ctx.cleanup()
  }
})
