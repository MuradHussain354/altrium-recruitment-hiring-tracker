/**
 * Sprint 2 Batch 4 correction pass — pure-logic unit tests.
 *
 * These tests deliberately touch NO database: they exercise crypto,
 * HTML/header escaping, and password-policy validation in isolation. They can
 * run in any environment (no Postgres required), unlike test-batch4-integration.ts.
 *
 * Run with: npx tsx src/scripts/test-batch4-unit.ts
 */
import { encryptEmailToken, decryptEmailToken } from '../utils/email-crypto';
import { escapeHtml, sanitizeHeader } from '../services/email/templates/master-layout';
import { renderInterviewScheduled } from '../services/email/templates';
import { strongPasswordSchema } from '../schemas/auth.schema';
import { ResendProviderAdapter } from '../services/email/resend-provider.adapter';

let passed = 0;
let failed = 0;

function assert(condition: boolean, label: string) {
  if (condition) {
    passed++;
    console.log(`  PASS: ${label}`);
  } else {
    failed++;
    console.error(`  FAIL: ${label}`);
  }
}

async function run() {
  console.log('=== Batch 4 Correction: Pure-Logic Unit Tests ===\n');

  // ── AES-256-GCM email token encryption ──────────────────────────────────
  console.log('[Email Token Encryption]');
  process.env.EMAIL_TOKEN_ENCRYPTION_KEY = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef'.slice(0, 64);
  const rawToken = 'a'.repeat(64); // simulate a 32-byte hex token
  const encrypted = encryptEmailToken(rawToken);
  assert(encrypted.split(':').length === 3, '1. Encrypted payload has iv:authTag:ciphertext format');
  assert(!encrypted.includes(rawToken), '2. Ciphertext does not contain the raw token in plaintext');
  const decrypted = decryptEmailToken(encrypted);
  assert(decrypted === rawToken, '3. Decrypt(encrypt(token)) round-trips correctly');

  // Tampered ciphertext must fail authentication (GCM auth tag)
  const [iv, authTag, ciphertext] = encrypted.split(':');
  const tampered = `${iv}:${authTag}:${ciphertext.slice(0, -2)}00`;
  let tamperRejected = false;
  try {
    decryptEmailToken(tampered);
  } catch {
    tamperRejected = true;
  }
  assert(tamperRejected, '4. Tampered ciphertext is rejected (GCM authentication)');

  // Missing key must fail safely (throw), never fall back to plaintext
  delete process.env.EMAIL_TOKEN_ENCRYPTION_KEY;
  let missingKeyThrew = false;
  try {
    encryptEmailToken(rawToken);
  } catch {
    missingKeyThrew = true;
  }
  assert(missingKeyThrew, '5. encryptEmailToken() throws when EMAIL_TOKEN_ENCRYPTION_KEY is missing (fail-safe)');

  // Restore for subsequent tests
  process.env.EMAIL_TOKEN_ENCRYPTION_KEY = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef'.slice(0, 64);

  // Dedicated key: encryptEmailToken() must ignore TWO_FACTOR_ENCRYPTION_KEY
  // entirely and fail even if it happens to be set, proving no fallback reuse.
  delete process.env.EMAIL_TOKEN_ENCRYPTION_KEY;
  process.env.TWO_FACTOR_ENCRYPTION_KEY = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
  let ignoredTotpKey = false;
  try {
    encryptEmailToken(rawToken);
  } catch {
    ignoredTotpKey = true;
  }
  assert(ignoredTotpKey, '6. encryptEmailToken() never falls back to TWO_FACTOR_ENCRYPTION_KEY');
  process.env.EMAIL_TOKEN_ENCRYPTION_KEY = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef'.slice(0, 64);

  // ── HTML escaping / CRLF sanitization ───────────────────────────────────
  console.log('\n[Template Escaping]');
  const xssAttempt = `"><script>alert(1)</script>`;
  const escaped = escapeHtml(xssAttempt);
  assert(!escaped.includes('<script>'), '7. escapeHtml() neutralizes <script> tags');
  assert(!escaped.includes('"'), '8. escapeHtml() encodes double quotes');

  const crlfSubject = 'Hello\r\nBcc: attacker@evil.com';
  const sanitizedSubject = sanitizeHeader(crlfSubject);
  assert(!sanitizedSubject.includes('\r') && !sanitizedSubject.includes('\n'), '9. sanitizeHeader() strips CRLF sequences');

  // meetingLink attribute-injection regression test (the exact Batch 4 finding)
  const maliciousMeetingLink = `https://zoom.us/j/123?x="onmouseover="alert(document.cookie)`;
  const rendered = renderInterviewScheduled({
    candidateName: 'Jane Doe',
    positionTitle: 'Engineer',
    stageName: 'Technical Interview',
    scheduledAt: new Date().toISOString(),
    durationMinutes: 60,
    meetingLink: maliciousMeetingLink,
  });
  const hrefMatch = rendered.html.match(/href="([^"]*)"[^>]*>Join Online Interview/);
  assert(
    !!hrefMatch && !rendered.html.includes(`href="${maliciousMeetingLink}"`),
    '10. meetingLink is HTML-escaped before being placed in the href attribute (no raw quote breakout)'
  );
  assert(
    rendered.html.includes('&quot;onmouseover=&quot;') || !rendered.html.includes('onmouseover="alert'),
    '11. Malicious onmouseover payload cannot break out of the href attribute'
  );
  // Plain-text rendering exists and is non-empty
  assert(typeof rendered.text === 'string' && rendered.text.length > 0, '12. Plain-text version is rendered alongside HTML');

  // ── Password policy ──────────────────────────────────────────────────────
  console.log('\n[Password Policy]');
  const weakPasswords = ['short1!', 'alllowercase1!', 'ALLUPPERCASE1!', 'NoDigitsHere!', 'NoSpecialChar123'];
  for (const pw of weakPasswords) {
    const result = strongPasswordSchema.safeParse(pw);
    assert(!result.success, `13. Weak password rejected: "${pw}"`);
  }
  const strongResult = strongPasswordSchema.safeParse('Str0ng!Passw0rd');
  assert(strongResult.success, '14. Strong password (8+, upper, lower, number, special char) accepted');

  // ── Resend provider status-code -> permanent/transient mapping ─────────
  console.log('\n[Resend Provider Status Mapping]');
  const originalFetch = global.fetch;
  const mockFetchWithStatus = (status: number, body: any = {}) => {
    // @ts-expect-error simplified fetch mock for this status-mapping test only
    global.fetch = async () => ({
      ok: status >= 200 && status < 300,
      status,
      json: async () => body,
    });
  };

  const adapter = new ResendProviderAdapter('fake-api-key', 'Test <test@example.com>');

  mockFetchWithStatus(429, { message: 'Rate limited' });
  const res429 = await adapter.sendEmail({ to: 'x@example.com', subject: 's', html: '<p>h</p>' });
  assert(res429.success === false && res429.error?.isPermanent === false, '15. HTTP 429 is treated as TRANSIENT (retryable)');

  mockFetchWithStatus(400, { message: 'Invalid recipient' });
  const res400 = await adapter.sendEmail({ to: 'x@example.com', subject: 's', html: '<p>h</p>' });
  assert(res400.success === false && res400.error?.isPermanent === true, '16. HTTP 400 is treated as PERMANENT (no retry)');

  mockFetchWithStatus(500, { message: 'Provider outage' });
  const res500 = await adapter.sendEmail({ to: 'x@example.com', subject: 's', html: '<p>h</p>' });
  assert(res500.success === false && res500.error?.isPermanent === false, '17. HTTP 500 is treated as TRANSIENT (retryable)');

  mockFetchWithStatus(200, { id: 'msg_123' });
  const res200 = await adapter.sendEmail({ to: 'x@example.com', subject: 's', html: '<p>h</p>' });
  assert(res200.success === true && res200.messageId === 'msg_123', '18. HTTP 200 is treated as success with providerMessageId captured');

  global.fetch = originalFetch;

  console.log(`\n=== Results: ${passed} passed, ${failed} failed ===`);
  if (failed > 0) {
    process.exitCode = 1;
  }
}

run().catch((err) => {
  console.error('Unit test run crashed:', err);
  process.exitCode = 1;
});
