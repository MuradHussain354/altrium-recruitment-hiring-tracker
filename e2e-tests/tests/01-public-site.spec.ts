import { test, expect } from '@playwright/test';
import { captureEvidence } from '../utils/evidence';

/**
 * Public Website (Unauthenticated)
 *
 * Confirms the marketing/informational pages of the site render correctly
 * for an anonymous visitor before any accounts exist.
 */
test.describe('Public Website (Unauthenticated)', () => {
  test('Home page loads', async ({ page }, testInfo) => {
    const response = await page.goto('/');
    expect(response?.status()).toBe(200);
    await expect(page).toHaveTitle(/Altrium/i);
    await captureEvidence(page, testInfo, 'Home page loads');
  });

  test('About page is reachable from navigation', async ({ page }, testInfo) => {
    await page.goto('/');
    await page.getByRole('link', { name: /about/i }).first().click();
    await expect(page).toHaveURL(/\/about/);
    await captureEvidence(page, testInfo, 'About page');
  });

  test('Contact page is reachable from navigation', async ({ page }, testInfo) => {
    await page.goto('/');
    await page.getByRole('link', { name: /contact/i }).first().click();
    await expect(page).toHaveURL(/\/contact/);
    await captureEvidence(page, testInfo, 'Contact page');
  });

  test('FAQ page is reachable from navigation', async ({ page }, testInfo) => {
    await page.goto('/');
    await page.getByRole('link', { name: /faq/i }).first().click();
    await expect(page).toHaveURL(/\/faq/);
    await captureEvidence(page, testInfo, 'FAQ page');
  });

  test('Careers page shows an empty state with no open positions', async ({ page }, testInfo) => {
    await page.goto('/careers');
    await page.waitForLoadState('networkidle');
    const jobCount = await page.locator('a[href^="/careers/"]').count();
    expect(jobCount).toBe(0);
    await captureEvidence(page, testInfo, 'Careers page empty state');
  });
});
