import { test, expect } from '@playwright/test';
import { captureEvidence } from '../utils/evidence';
import { HR_AUTH_FILE, TL_AUTH_FILE } from '../utils/auth';
import { readState } from '../utils/state';

/**
 * Interview Scheduling & Feedback
 *
 * HR schedules a Technical Interview and assigns the Team Lead as the
 * interviewer; the Team Lead then reviews the assignment and submits a
 * real evaluation, which rolls back up onto HR's view of the application.
 */
test.describe.serial('HR schedules the interview', () => {
  test.use({ storageState: HR_AUTH_FILE });

  test('HR schedules an interview and assigns the Team Lead', async ({ page }, testInfo) => {
    const { applicationUrl, tlEmail } = readState();
    await page.goto(applicationUrl!);
    await page.waitForLoadState('networkidle');

    await page.getByRole('button', { name: /schedule interview/i }).first().click();
    await page.waitForSelector('#sched-stage');

    const stageOptions = await page.locator('#sched-stage option').count();
    if (stageOptions > 1) {
      await page.locator('#sched-stage').selectOption({ index: 1 });
    }

    const tlRow = page.locator('.interviewer-checklist__item', { hasText: tlEmail! });
    await tlRow.locator('input[type="checkbox"]').check();
    await page.getByRole('button', { name: /^schedule interview$/i }).click();
    await page.waitForTimeout(1500);

    await captureEvidence(page, testInfo, 'HR schedules interview');
  });
});

test.describe.serial('Team Lead handles the assigned interview', () => {
  test.use({ storageState: TL_AUTH_FILE });

  test("Team Lead sees the assignment on their dashboard", async ({ page }, testInfo) => {
    await page.goto('/team-lead');
    await page.waitForLoadState('networkidle');
    await captureEvidence(page, testInfo, 'Team Lead dashboard shows assignment');
  });

  test('Team Lead opens the Assigned Interviews list', async ({ page }, testInfo) => {
    const { candidateName, positionTitle } = readState();
    await page.goto('/team-lead/interviews');
    await page.waitForLoadState('networkidle');
    const bodyText = await page.locator('body').innerText();
    expect(bodyText.includes(candidateName!) || bodyText.includes(positionTitle!)).toBe(true);
    await captureEvidence(page, testInfo, 'Team Lead assigned interviews list');
  });

  test('Team Lead submits evaluation feedback', async ({ page }, testInfo) => {
    await page.goto('/team-lead/interviews');
    await page.waitForLoadState('networkidle');
    await page.getByRole('link', { name: /inspect/i }).first().click();
    await page.waitForLoadState('networkidle');

    const feedbackBtn = page.getByRole('button', { name: /submit evaluation feedback/i }).first();
    await expect(feedbackBtn).toBeVisible({ timeout: 10_000 });
    await feedbackBtn.click();

    await page.waitForSelector('textarea');
    const ratingInput = page.getByPlaceholder(/4.5 or 85/i);
    if (await ratingInput.count()) await ratingInput.fill('4.5');
    await page
      .locator('textarea')
      .first()
      .fill('Strong technical depth, clear communicator, solid system design instincts. Recommend advancing.');
    await page.getByRole('button', { name: /submit evaluation/i }).last().click();
    await page.waitForTimeout(1500);

    await expect(page.getByText(/submit evaluation feedback now/i)).toHaveCount(0);
    await captureEvidence(page, testInfo, 'Team Lead submits feedback');
  });
});

test.describe('HR reviews consolidated feedback', () => {
  test.use({ storageState: HR_AUTH_FILE });

  test('HR views the Team Lead evaluation on the application', async ({ page }, testInfo) => {
    const { applicationUrl } = readState();
    await page.goto(applicationUrl!);
    await page.waitForLoadState('networkidle');
    await captureEvidence(page, testInfo, 'HR views consolidated feedback');
  });
});
