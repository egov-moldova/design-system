import { defineConfig } from '@playwright/test';

// The runner (scripts/adapters/consumer-fixture.mjs) serves the production build and passes
// its URL here; this file never starts a server of its own.
export default defineConfig({
  testDir: './e2e',
  reporter: 'list',
  workers: 1,
  retries: 0,
  timeout: 30_000,
  // Next to this file, which the runner copies into its temp directory: a failed run keeps the
  // directory, so CI can upload the traces with it.
  outputDir: './test-results',
  use: {
    baseURL: process.env.FIXTURE_URL,
    browserName: 'chromium',
    trace: 'retain-on-failure',
  },
});
