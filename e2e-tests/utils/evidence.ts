import { Page, TestInfo } from '@playwright/test';
import fs from 'fs';
import path from 'path';

const SCREENSHOTS_DIR = path.resolve(__dirname, '../screenshots');

let counter = 0;

/**
 * Captures a full-page screenshot, saves it under e2e-tests/screenshots
 * (numbered so file order matches execution order), and attaches it to the
 * current test so it also appears inline in the HTML report.
 */
export async function captureEvidence(page: Page, testInfo: TestInfo, label: string) {
  counter += 1;
  const slug = label.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  const filename = `${String(counter).padStart(2, '0')}-${slug}.png`;
  fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
  const filePath = path.join(SCREENSHOTS_DIR, filename);

  const buffer = await page.screenshot({ path: filePath, fullPage: true });
  await testInfo.attach(label, { body: buffer, contentType: 'image/png' });

  return filePath;
}
