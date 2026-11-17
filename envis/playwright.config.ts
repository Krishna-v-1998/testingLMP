/**
 * playwright.config.ts
 *
 * Loads the correct .env file based on the ENV variable (default: qa).
 *
 * Usage:
 *   ENV=qa       npx playwright test   ← default
 *   ENV=staging  npx playwright test
 */

import { defineConfig, devices } from '@playwright/test';
import * as dotenv from 'dotenv';
import * as path   from 'path';

// ── Load environment file ─────────────────────────────────────────────────────

const env = process.env.ENV ?? 'qa';
dotenv.config({ path: path.resolve(__dirname, `.env.${env}`) });

console.log(`[playwright.config] ENV=${env} → BASE_URL=${process.env.BASE_URL}`);

// ── Config ────────────────────────────────────────────────────────────────────

export default defineConfig({
  testDir: './tests',
  timeout:  60_000,
  retries:  process.env.CI ? 1 : 0,
  workers:  process.env.CI ? 1 : undefined,

  reporter: [
    ['list'],
    ['html', { outputFolder: `playwright-report-${env}`, open: 'never' }],
  ],

  use: {
    baseURL:          process.env.BASE_URL,
    headless:         true,
    screenshot:       'only-on-failure',
    video:            'retain-on-failure',
    trace:            'retain-on-failure',
    actionTimeout:    15_000,
    navigationTimeout: 30_000,
  },

  projects: [
    {
      name: 'chromium',
      use:  { ...devices['Desktop Chrome'] },
    },
  ],
});
