import { test, expect } from '@playwright/test';
import path from 'path';
import { captureEvidence } from '../utils/evidence';
import { HR_AUTH_FILE } from '../utils/auth';
import { writeState, readState } from '../utils/state';

const CANDIDATE_NAME = 'Jordan Candidate';
const CANDIDATE_EMAIL = 'jordan.candidate@example.com';

/**
 * Candidate Application
 *
 * A real, unauthenticated candidate applies to the position created in the
 * previous suite, including an actual multipart CV file upload, and HR
 * confirms the submission lands in their queue.
 */
test.describe.serial('Candidate Application', () => {
  test('Candidate submits an application with a CV upload', async ({ page }, testInfo) => {
    const { positionId } = readState();
    await page.goto(`/careers/${positionId}`);
    await page.waitForLoadState('networkidle');

    await page.getByRole('link', { name: /apply/i }).first().click();
    await page.waitForSelector('#app-name');

    await page.fill('#app-name', CANDIDATE_NAME);
    await page.fill('#app-email', CANDIDATE_EMAIL);
    await page.fill('#app-phone', '+1 555 123 4567');
    await page.fill('#app-linkedin', 'https://www.linkedin.com/in/jordan-candidate');
    await page.setInputFiles('#app-resume-file', path.resolve(__dirname, '../utils/test-cv.pdf'));
    await page.fill('#app-notes', "Excited about the platform engineering role and Altrium's mission.");

    const [response] = await Promise.all([
      page.waitForResponse(
        (r) => r.url().includes('/public/applications') && r.request().method() === 'POST',
        { timeout: 15_000 }
      ),
      page.getByRole('button', { name: /submit application/i }).click(),
    ]);
    expect(response.status()).toBe(201);
    const body = await response.json();
    writeState({ applicationId: body.data.id, candidateName: CANDIDATE_NAME, candidateEmail: CANDIDATE_EMAIL });

    await page.waitForURL((url) => url.pathname.includes('/application-success'), { timeout: 10_000 });
    await expect(page.getByText(/application submitted/i)).toBeVisible();

    await captureEvidence(page, testInfo, 'Candidate submits application');
  });
});

test.describe('HR reviews the new application', () => {
  test.use({ storageState: HR_AUTH_FILE });

  test('HR sees the new application in the Applications list', async ({ page }, testInfo) => {
    await page.goto('/hr/applications');
    await page.waitForLoadState('networkidle');
    const row = page.getByText(CANDIDATE_NAME, { exact: false }).first();
    await expect(row).toBeVisible({ timeout: 10_000 });

    await row.click();
    await page.waitForLoadState('networkidle');
    writeState({ applicationUrl: page.url() });

    await captureEvidence(page, testInfo, 'HR sees new application');
  });
});
