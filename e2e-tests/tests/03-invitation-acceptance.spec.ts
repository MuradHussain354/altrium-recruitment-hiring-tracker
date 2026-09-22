import { test, expect } from '@playwright/test';
import { captureEvidence } from '../utils/evidence';
import { getInvitationToken } from '../utils/email-token';
import { HR_AUTH_FILE, TL_AUTH_FILE, MANAGER_AUTH_FILE } from '../utils/auth';
import { readState, writeState } from '../utils/state';

const HR_PASSWORD = 'HrRecruiter!2026';
const TL_PASSWORD = 'TeamLead!2026';

/**
 * Invitation Acceptance
 *
 * The Manager never sets a password for a new account (S2-45 invitation
 * flow) — instead an encrypted, time-limited token is emailed to the
 * invitee. This suite decrypts the real EmailDeliveryLog row exactly as the
 * recipient's mail client would resolve the link, then completes account
 * activation through the actual UI form.
 */
test.describe.serial('Invitation Acceptance', () => {
  test('HR accepts their invitation and sets a password', async ({ page }, testInfo) => {
    const state = readState();
    const token = await getInvitationToken(state.hrUserId!);

    await page.goto(`/accept-invitation?token=${token}`);
    await page.waitForSelector('input[type="password"]');
    const passwordInputs = page.locator('input[type="password"]');
    await passwordInputs.nth(0).fill(HR_PASSWORD);
    await passwordInputs.nth(1).fill(HR_PASSWORD);
    await page.getByRole('button', { name: /activate account/i }).click();
    await page.waitForURL((url) => url.pathname.startsWith('/hr'), { timeout: 15_000 });
    await page.waitForLoadState('networkidle');

    await expect(page).toHaveURL(/\/hr/);
    writeState({ hrPassword: HR_PASSWORD });
    await captureEvidence(page, testInfo, 'HR accepts invitation');
    await page.context().storageState({ path: HR_AUTH_FILE });
  });

  test('Team Lead accepts their invitation and sets a password', async ({ page }, testInfo) => {
    const state = readState();
    const token = await getInvitationToken(state.tlUserId!);

    await page.goto(`/accept-invitation?token=${token}`);
    await page.waitForSelector('input[type="password"]');
    const passwordInputs = page.locator('input[type="password"]');
    await passwordInputs.nth(0).fill(TL_PASSWORD);
    await passwordInputs.nth(1).fill(TL_PASSWORD);
    await page.getByRole('button', { name: /activate account/i }).click();
    await page.waitForURL((url) => url.pathname.startsWith('/team-lead'), { timeout: 15_000 });
    await page.waitForLoadState('networkidle');

    await expect(page).toHaveURL(/\/team-lead/);
    writeState({ tlPassword: TL_PASSWORD });
    await captureEvidence(page, testInfo, 'Team Lead accepts invitation');
    await page.context().storageState({ path: TL_AUTH_FILE });
  });
});

test.describe('Manager Accounts directory reflects activation', () => {
  test.use({ storageState: MANAGER_AUTH_FILE });

  test('Manager Accounts directory now shows both accounts as Active', async ({ page }, testInfo) => {
    await page.goto('/manager/accounts');
    await page.waitForLoadState('networkidle');
    const bodyText = await page.locator('body').innerText();
    expect(/Invited \(Pending\)/i.test(bodyText)).toBe(false);
    await captureEvidence(page, testInfo, 'Manager confirms accounts active');
  });
});
