import { defineConfig } from '@playwright/test'

// Contextura e2e tests boot the real Electron main process via
// playwright._electron. They must run serially because each launch owns
// process-level Electron state and writes to its own tmp HOME.
export default defineConfig({
  testDir: 'test/e2e',
  timeout: 60_000,
  expect: { timeout: 10_000 },
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? [['line']] : [['list']],
  workers: 1,
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
})
