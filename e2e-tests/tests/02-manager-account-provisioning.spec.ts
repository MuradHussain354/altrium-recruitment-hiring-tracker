import { test, expect } from '@playwright/test';
import { captureEvidence } from '../utils/evidence';
import { loginViaUi, MANAGER_AUTH_FILE } from '../utils/auth';
import { readState, writeState } from '../utils/state';
import { prisma } from '../utils/prisma';

const HR_EMAIL = 'hr.recruiter@altrium.local';
const HR_NAME = 'Priya HR';
const TL_EMAIL = 'lead.techlead@altrium.local';
const TL_NAME = 'Tariq Lead';

/**
 * Manager: Account Provisioning
 *
 * The Manager is the only role that can exist before an invitation flow
 * runs, so this suite seeds it in global-setup and drives everything else
 * — including HR and Team Lead accounts — through the real UI here.
 */
test.describe.serial('Manager: Account Provisioning', () => {
  test('Manager can log in with email and password', async ({ page }, testInfo) => {
    const state = readState();
    await loginViaUi(page, state.managerEmail!, state.managerPassword!);
    await expect(page).toHaveURL(/\/manager/);
    await captureEvidence(page, testInfo, 'Manager login');
    await page.context().storageState({ path: MANAGER_AUTH_FILE });
  });

  test.describe('authenticated as Manager', () => {
    test.use({ storageState: MANAGER_AUTH_FILE });

    test('Manager dashboard renders', async ({ page }, testInfo) => {
      await page.goto('/manager');
      await page.waitForLoadState('networkidle');
      await expect(page).toHaveURL(/\/manager/);
      await captureEvidence(page, testInfo, 'Manager dashboard');
    });

    test('Manager navigates to the User Accounts directory', async ({ page }, testInfo) => {
      await page.goto('/manager');
      await page.getByRole('link', { name: /user accounts/i }).click();
      await expect(page).toHaveURL(/\/manager\/accounts/);
      await captureEvidence(page, testInfo, 'Manager Accounts directory');
    });

    test('Manager invites an HR user', async ({ page }, testInfo) => {
      await page.goto('/manager/accounts');
      await page.getByPlaceholder(/Sarah Jenkins/i).fill(HR_NAME);
      await page.getByPlaceholder(/sarah.jenkins@altrium.com/i).fill(HR_EMAIL);
      await page.locator('select').first().selectOption('HR');
      await page.getByRole('button', { name: 'Send Invitation', exact: true }).click();
      await page.waitForTimeout(800);

      const hrUser = await prisma.user.findUnique({ where: { email: HR_EMAIL } });
      expect(hrUser).not.toBeNull();
      expect(hrUser!.isActive).toBe(false);
      writeState({ hrEmail: HR_EMAIL, hrUserId: hrUser!.id });

      await captureEvidence(page, testInfo, 'Manager invites HR user');
    });

    test('Manager invites a Team Lead user', async ({ page }, testInfo) => {
      await page.goto('/manager/accounts');
      await page.getByPlaceholder(/Sarah Jenkins/i).fill(TL_NAME);
      await page.getByPlaceholder(/sarah.jenkins@altrium.com/i).fill(TL_EMAIL);
      await page.locator('select').first().selectOption('TeamLead');
      await page.getByRole('button', { name: 'Send Invitation', exact: true }).click();
      await page.waitForTimeout(800);

      const tlUser = await prisma.user.findUnique({ where: { email: TL_EMAIL } });
      expect(tlUser).not.toBeNull();
      expect(tlUser!.isActive).toBe(false);
      writeState({ tlEmail: TL_EMAIL, tlUserId: tlUser!.id });

      await captureEvidence(page, testInfo, 'Manager invites Team Lead user');
    });

    test('Accounts directory shows both invitees as Invited (Pending)', async ({ page }, testInfo) => {
      await page.goto('/manager/accounts');
      await page.waitForLoadState('networkidle');
      const bodyText = await page.locator('body').innerText();
      const pendingMatches = bodyText.match(/Invited \(Pending\)/gi) || [];
      expect(pendingMatches.length).toBeGreaterThanOrEqual(2);
      await captureEvidence(page, testInfo, 'Accounts directory pending invites');
    });
  });
});
