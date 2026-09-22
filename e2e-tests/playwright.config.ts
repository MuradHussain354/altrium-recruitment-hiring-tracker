import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright configuration for the Altrium Recruitment & Hiring Tracker E2E suite.
 * Requires the app's dev stack already running locally:
 *   - backend:  http://localhost:5000  (cd server && npm run dev)
 *   - frontend: http://localhost:5173  (cd client && npm run dev)
 */
export default defineConfig({
  testDir: './tests',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  globalSetup: require.resolve('./global-setup.ts'),
  reporter: [
    ['list'],
    ['html', { outputFolder: 'playwright-report', open: 'never' }],
    ['json', { outputFile: 'test-results/results.json' }],
  ],
  timeout: 30_000,
  expect: { timeout: 8_000 },
  use: {
    baseURL: 'http://localhost:5173',
    screenshot: 'on',
    video: 'off',
    trace: 'retain-on-failure',
    actionTimeout: 12_000,
    navigationTimeout: 15_000,
  },
  projects: [
    {
      name: 'chromium-desktop',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 800 } },
      testMatch: /0[1-7]-.*\.spec\.ts/,
    },
    {
      name: 'chromium-mobile',
      use: { ...devices['Pixel 7'] },
      testMatch: /08-.*\.spec\.ts/,
      dependencies: ['chromium-desktop'],
    },
  ],
});
