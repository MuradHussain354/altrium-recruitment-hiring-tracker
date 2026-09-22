import './env';
import crypto from 'crypto';
import { prisma } from './prisma';

/**
 * Mirrors server/src/utils/email-crypto.ts's AES-256-GCM format
 * (`iv:authTag:ciphertext`, all hex) so the suite can decrypt a real
 * invitation token exactly as the recipient's browser would after
 * following the link in the actual email.
 */
function decryptEmailToken(encryptedPayload: string): string {
  const key = Buffer.from(process.env.EMAIL_TOKEN_ENCRYPTION_KEY!, 'hex');
  const [ivHex, authTagHex, cipherHex] = encryptedPayload.split(':');
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, Buffer.from(ivHex, 'hex'));
  decipher.setAuthTag(Buffer.from(authTagHex, 'hex'));
  return decipher.update(cipherHex, 'hex', 'utf8') + decipher.final('utf8');
}

/** Fetches and decrypts the most recent account-invitation token for a user. */
export async function getInvitationToken(userId: string): Promise<string> {
  const log = await prisma.emailDeliveryLog.findFirst({
    where: { userId, eventType: 'AccountInvitation' },
    orderBy: { createdAt: 'desc' },
  });
  if (!log) throw new Error(`No AccountInvitation email log found for user ${userId}`);
  const payload = log.payload as { encryptedToken: string };
  return decryptEmailToken(payload.encryptedToken);
}
