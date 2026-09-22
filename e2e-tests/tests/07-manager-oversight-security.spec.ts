import { test, expect } from '@playwright/test';
import { captureEvidence } from '../utils/evidence';
import { MANAGER_AUTH_FILE, HR_AUTH_FILE } from '../utils/auth';

/**
 * Manager Oversight & Security
 *
 * Confirms the Manager's audit/analytics surfaces reflect this run's
 * activity, and that role-based access control blocks a non-Manager
 * session from reaching a Manager-only route.
 */
test.describe('Manager oversight', () => {
  test.use({ storageState: MANAGER_AUTH_FILE });

  test('Manager views the Access Log', async ({ page }, testInfo) => {
    await page.goto('/manager/access-log');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveURL(/\/manager\/access-log/);
    await captureEvidence(page, testInfo, 'Manager Access Log');
  });

  test('Manager views Analytics & Headcount', async ({ page }, testInfo) => {
    await page.goto('/manager/analytics');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveURL(/\/manager\/analytics/);
    await captureEvidence(page, testInfo, 'Manager Analytics');
  });
});

test.describe('RBAC enforcement', () => {
  test.use({ storageState: HR_AUTH_FILE });

  test('HR cannot reach the Manager-only area', async ({ page }, testInfo) => {
    await page.goto('/manager');
    await page.waitForLoadState('networkidle');
    await expect(page).not.toHaveURL(/^http:\/\/localhost:5173\/manager$/);
    await captureEvidence(page, testInfo, 'RBAC blocks HR from Manager area');
  });
});
