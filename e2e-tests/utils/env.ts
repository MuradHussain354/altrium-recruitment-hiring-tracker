import fs from 'fs';
import path from 'path';

/**
 * Loads local-only credentials for the suite (DB connection string, email
 * token encryption key) from a gitignored `.env.e2e` file at the project
 * root, so no secret is ever committed. See `.env.e2e.example` for the
 * required keys.
 */
const ENV_FILE = path.resolve(__dirname, '../.env.e2e');

function loadEnvFile(filePath: string): void {
  if (!fs.existsSync(filePath)) return;
  const contents = fs.readFileSync(filePath, 'utf8');
  for (const line of contents.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1).trim();
    if (!process.env[key]) process.env[key] = value;
  }
}

loadEnvFile(ENV_FILE);

const REQUIRED_KEYS = ['DATABASE_URL', 'EMAIL_TOKEN_ENCRYPTION_KEY'];
const missing = REQUIRED_KEYS.filter((key) => !process.env[key]);
if (missing.length > 0) {
  throw new Error(
    `Missing required e2e env vars: ${missing.join(', ')}. ` +
      `Copy e2e-tests/.env.e2e.example to e2e-tests/.env.e2e and fill in your local dev values.`
  );
}
