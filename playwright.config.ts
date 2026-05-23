import { defineConfig } from '@playwright/test';

export default defineConfig({
  outputDir: '.playwright-mcp',
  workers: process.env.CI ? 2 : 1,
  timeout: 30_000, // Maxim 30 de secunde per test
});
