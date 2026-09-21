/**
 * Shared Account Invitation constants (S2-45).
 * Single source of truth for expiry so the token TTL, the email copy, and any
 * future validation logic can never drift out of sync with each other.
 */
export const INVITATION_EXPIRY_DAYS = 7;
export const INVITATION_EXPIRY_MS = INVITATION_EXPIRY_DAYS * 24 * 60 * 60 * 1000;

export function computeInvitationExpiry(from: Date = new Date()): Date {
  return new Date(from.getTime() + INVITATION_EXPIRY_MS);
}
