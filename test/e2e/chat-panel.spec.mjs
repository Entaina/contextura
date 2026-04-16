/**
 * Chat panel — Playwright browser test (Node mode).
 *
 * Boots the HTTP server directly (no Electron) and opens Chromium against it.
 * This validates the chat UI in a real browser without requiring the Electron
 * binary to work.
 */

import { test, expect, chromium } from '@playwright/test'
import { mkdtemp } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createTmpVault } from '../helpers/tmp-vault.mjs'
import { startTestServer } from '../helpers/start-test-server.mjs'

let server, vault, browser, page, userDataDir

test.beforeAll(async () => {
  vault = await createTmpVault()
  userDataDir = await mkdtemp(join(tmpdir(), 'contextura-chat-test-'))
  server = await startTestServer({ rootPath: vault.path, userDataPath: userDataDir })
  browser = await chromium.launch()
})

test.afterAll(async () => {
  if (page) await page.close()
  if (browser) await browser.close()
  if (server) await server.stop()
  if (vault) await vault.cleanup()
})

test.beforeEach(async () => {
  page = await browser.newPage()
  await page.goto(server.url)
  // Wait for the app to finish initialising (file tree rendered)
  await expect(page.locator('#file-tree [data-path]').first()).toBeVisible()
})

test.afterEach(async () => {
  if (page) await page.close()
  page = null
})

test('chat toggle button is visible in the titlebar', async () => {
  const btn = page.locator('#btn-toggle-chat')
  await expect(btn).toBeVisible()
  await expect(btn).toHaveAttribute('title', /Chat/)
})

test('clicking the chat button opens a chat panel in dockview', async () => {
  await page.locator('#btn-toggle-chat').click()

  // The chat panel should appear inside the dockview container
  const chatView = page.locator('.chat-view')
  await expect(chatView).toBeVisible()

  // Empty state text should be shown
  await expect(page.locator('.chat-empty-state')).toContainText('Start a conversation')
})

test('chat panel has an input area and send button', async () => {
  await page.locator('#btn-toggle-chat').click()

  const input = page.locator('.chat-input')
  await expect(input).toBeVisible()
  await expect(input).toHaveAttribute('placeholder', /Message Claude/)

  const sendBtn = page.locator('.chat-send-btn')
  await expect(sendBtn).toBeVisible()
})

test('chat status endpoint returns availability info', async () => {
  await page.locator('#btn-toggle-chat').click()

  const res = await page.evaluate(() =>
    fetch('/api/chat/status').then(r => r.json())
  )
  // The status endpoint should return the new shape with available/authenticated
  expect(typeof res.available).toBe('boolean')
  expect(typeof res.authenticated).toBe('boolean')
  expect(typeof res.hasApiKey).toBe('boolean')
})

test('chat input is enabled when claude CLI is available', async () => {
  await page.locator('#btn-toggle-chat').click()

  // On this dev machine claude is installed and authenticated,
  // so the input should be enabled
  const res = await page.evaluate(() =>
    fetch('/api/chat/status').then(r => r.json())
  )
  const input = page.locator('.chat-input')
  if (res.available && res.authenticated) {
    await expect(input).toBeEnabled()
  } else {
    await expect(input).toBeDisabled()
  }
})

test('clicking the chat button twice does not create a duplicate panel', async () => {
  await page.locator('#btn-toggle-chat').click()
  await expect(page.locator('.chat-view')).toBeVisible()

  // Click again — should activate the existing one, not create a second
  await page.locator('#btn-toggle-chat').click()

  const chatViews = page.locator('.chat-view')
  await expect(chatViews).toHaveCount(1)
})

test('chat panel coexists with an editor panel', async () => {
  // Open a file first
  await page.locator('#file-tree [data-path="README.md"]').click()
  await expect(page.locator('#dockview-container')).toContainText('Sample Vault')

  // Then open chat
  await page.locator('#btn-toggle-chat').click()
  await expect(page.locator('.chat-view')).toBeVisible()

  // Both should exist in the DOM
  await expect(page.locator('.chat-view')).toHaveCount(1)
  await expect(page.locator('.editor-panel')).toHaveCount(1)
})

test('chat conversations CRUD works via API', async () => {
  // Create
  const created = await page.evaluate(() =>
    fetch('/api/chat/conversations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'Test from Playwright' }),
    }).then(r => r.json())
  )
  expect(created.id).toBeTruthy()
  expect(created.sessionId).toBeNull()
  expect(created.title).toBe('Test from Playwright')

  // List
  const list = await page.evaluate(() =>
    fetch('/api/chat/conversations').then(r => r.json())
  )
  expect(list.length).toBeGreaterThanOrEqual(1)

  // Load
  const loaded = await page.evaluate((id) =>
    fetch(`/api/chat/conversations/${id}`).then(r => r.json()),
  created.id
  )
  expect(loaded.id).toBe(created.id)
  expect(loaded.messages).toEqual([])

  // Delete
  const deleted = await page.evaluate((id) =>
    fetch(`/api/chat/conversations/${id}`, { method: 'DELETE' }).then(r => r.json()),
  created.id
  )
  expect(deleted.deleted).toBe(true)
})
