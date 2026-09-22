import path from 'path';
import { Page } from '@playwright/test';

export const MANAGER_AUTH_FILE = path.resolve(__dirname, '../.auth/manager.json');
export const HR_AUTH_FILE = path.resolve(__dirname, '../.auth/hr.json');
export const TL_AUTH_FILE = path.resolve(__dirname, '../.auth/tl.json');

/** Logs in through the real UI login form (email + password only, no 2FA). */
export async function loginViaUi(page: Page, email: string, password: string) {
  await page.goto('/login');
  await page.locator('input[type="email"]').fill(email);
  await page.locator('input[type="password"]').fill(password);
  await page.getByRole('button', { name: /sign in/i }).click();
  await page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 15_000 });
  await page.waitForLoadState('networkidle');
}
