import { test, expect } from '@playwright/test';
import { captureEvidence } from '../utils/evidence';
import { TL_AUTH_FILE } from '../utils/auth';

/**
 * Responsive / Mobile
 *
 * Runs under the `chromium-mobile` project (Pixel 7 viewport/UA — see
 * playwright.config.ts) against the same data the desktop suites created.
 */
test.describe('Mobile: Team Lead', () => {
  test.use({ storageState: TL_AUTH_FILE });

  test('Assigned Interviews list renders correctly at mobile width', async ({ page }, testInfo) => {
    await page.goto('/team-lead/interviews');
    await page.waitForLoadState('networkidle');
    const viewport = page.viewportSize();
    expect(viewport && viewport.width).toBeLessThan(500);
    await captureEvidence(page, testInfo, 'Mobile Team Lead interviews');
  });
});

test.describe('Mobile: Public', () => {
  test('Careers page renders correctly at mobile width', async ({ page }, testInfo) => {
    await page.goto('/careers');
    await page.waitForLoadState('networkidle');
    const viewport = page.viewportSize();
    expect(viewport && viewport.width).toBeLessThan(500);
    await captureEvidence(page, testInfo, 'Mobile Careers page');
  });
});
