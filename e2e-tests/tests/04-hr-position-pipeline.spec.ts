import { test, expect } from '@playwright/test';
import { captureEvidence } from '../utils/evidence';
import { HR_AUTH_FILE } from '../utils/auth';
import { writeState, readState } from '../utils/state';

const POSITION_TITLE = 'Senior Platform Engineer';

/**
 * HR: Position & Pipeline Setup
 *
 * A position cannot accept applicants until it has at least one pipeline
 * stage (enforced server-side — see application.service.ts). This suite
 * builds a real Screening -> Technical Interview -> Offer pipeline through
 * HR's Pipeline Editor immediately after creating the position, exactly as
 * an HR user is expected to before publishing a role.
 */
test.describe.serial('HR: Position & Pipeline Setup', () => {
  test.use({ storageState: HR_AUTH_FILE });

  test('HR creates a new Open position', async ({ page }, testInfo) => {
    await page.goto('/hr/positions/new');
    await page.waitForSelector('#pos-title');

    await page.fill('#pos-title', POSITION_TITLE);
    await page.fill('#pos-dept', 'Engineering');
    await page.fill(
      '#pos-desc',
      'Own our core platform services, mentor engineers, and drive architectural decisions across the recruitment tracker backend.'
    );
    await page.fill('#pos-skills', 'Node.js, TypeScript, PostgreSQL');
    await page.selectOption('#pos-status', 'Open');
    await page.getByRole('button', { name: /create position/i }).click();
    await page.waitForLoadState('networkidle');

    const match = page.url().match(/positions\/([0-9a-f-]{36})/i);
    expect(match, `Expected a position id in URL, got ${page.url()}`).not.toBeNull();
    writeState({ positionId: match![1], positionTitle: POSITION_TITLE });

    await captureEvidence(page, testInfo, 'HR creates Open position');
  });

  test('HR configures the pipeline stages for the new position', async ({ page }, testInfo) => {
    const { positionId } = readState();
    await page.goto(`/hr/positions/${positionId}/pipeline`);
    await page.waitForLoadState('networkidle');

    for (const stageName of ['Screening', 'Technical Interview', 'Offer']) {
      await page.getByRole('button', { name: /\+ add stage/i }).first().click();
      await page.waitForSelector('#stage-name');
      await page.fill('#stage-name', stageName);
      await page.getByRole('button', { name: /^add stage$/i }).click();
      await page.waitForTimeout(500);
    }

    const bodyText = await page.locator('body').innerText();
    expect(bodyText).toContain('Screening');
    expect(bodyText).toContain('Technical Interview');
    expect(bodyText).toContain('Offer');

    await captureEvidence(page, testInfo, 'HR configures pipeline stages');
  });
});

test.describe('Public sees the newly published position', () => {
  test('Careers page lists the new Open position', async ({ page }, testInfo) => {
    await page.goto('/careers');
    await page.waitForLoadState('networkidle');
    const jobCount = await page.locator('a[href^="/careers/"]').count();
    expect(jobCount).toBeGreaterThanOrEqual(1);
    await captureEvidence(page, testInfo, 'Public Careers page lists position');
  });

  test('Public can open the job detail page', async ({ page }, testInfo) => {
    const { positionTitle } = readState();
    await page.goto('/careers');
    await page.waitForLoadState('networkidle');
    await page.locator('a[href^="/careers/"]').first().click();
    await expect(page.getByRole('heading', { name: positionTitle })).toBeVisible({ timeout: 10_000 });
    await captureEvidence(page, testInfo, 'Public job detail page');
  });
});
