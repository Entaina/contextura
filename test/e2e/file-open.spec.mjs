import { test, expect } from '@playwright/test'
import { launchContextura } from './helpers/launch-app.mjs'

test('clicking a sidebar entry opens the file in an editor panel', async () => {
  const ctx = await launchContextura()
  try {
    const { window } = ctx

    // Before any click the dockview container is empty (welcome watermark
    // may render, but the file contents are not shown yet).
    const container = window.locator('#dockview-container')
    await expect(container).not.toContainText('Sample Vault')

    await window.locator('#file-tree [data-path="README.md"]').click()

    // After the click the editor panel renders the fixture README heading.
    await expect(container).toContainText('Sample Vault')
  } finally {
    await ctx.cleanup()
  }
})

test('opening a nested file renders its contents', async () => {
  const ctx = await launchContextura()
  try {
    const { window } = ctx

    // Expand the `notes` directory node so its children become clickable.
    await window.locator('#file-tree [data-path="notes"]').click()
    await window.locator('#file-tree [data-path="notes/first.md"]').click()

    await expect(window.locator('#dockview-container')).toContainText('First')
  } finally {
    await ctx.cleanup()
  }
})
