import * as OTPAuth from 'otpauth';
import QRCode from 'qrcode';

export interface TotpEnrollment {
  secret: string; // Base32 encoded TOTP secret
  uri: string;    // otpauth:// URI
}

const DEFAULT_ISSUER = 'Altrium';
const DEFAULT_PERIOD = 30;
const DEFAULT_DIGITS = 6;
const DEFAULT_WINDOW = 1;

/**
 * Generates a new cryptographically random TOTP secret (Base32 encoded)
 * and its corresponding otpauth:// URI for the user.
 */
export function generateTotpSecret(email: string, issuer: string = DEFAULT_ISSUER): TotpEnrollment {
  const secret = new OTPAuth.Secret({ size: 20 });
  const totp = new OTPAuth.TOTP({
    issuer,
    label: email,
    algorithm: 'SHA1',
    digits: DEFAULT_DIGITS,
    period: DEFAULT_PERIOD,
    secret,
  });

  return {
    secret: secret.base32,
    uri: totp.toString(),
  };
}

/**
 * Generates a QR Code as a base64 Data URL (image/png) for a given otpauth:// URI.
 */
export async function generateQrCodeDataUrl(uri: string): Promise<string> {
  return QRCode.toDataURL(uri, {
    errorCorrectionLevel: 'M',
    margin: 2,
    width: 240,
  });
}

/**
 * Verifies a 6-digit TOTP token against a base32 encoded secret.
 * Supports configurable window (default ±1 window step, i.e., 30s drift).
 * Returns true if valid, false otherwise. Never logs the secret.
 */
export function verifyTotpToken(
  token: string,
  secretBase32: string,
  window: number = DEFAULT_WINDOW
): boolean {
  if (!token || typeof token !== 'string') {
    return false;
  }

  // Clean input: remove whitespace/dashes
  const sanitizedToken = token.replace(/[\s-]/g, '');
  if (!/^\d{6}$/.test(sanitizedToken)) {
    return false;
  }

  try {
    const totp = new OTPAuth.TOTP({
      issuer: DEFAULT_ISSUER,
      algorithm: 'SHA1',
      digits: DEFAULT_DIGITS,
      period: DEFAULT_PERIOD,
      secret: OTPAuth.Secret.fromBase32(secretBase32),
    });

    const delta = totp.validate({
      token: sanitizedToken,
      window,
    });

    return delta !== null;
  } catch (_err) {
    return false;
  }
}
