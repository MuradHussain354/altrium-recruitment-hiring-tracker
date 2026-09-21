import bcrypt from 'bcryptjs';
import prisma from '../config/prisma';

/**
 * Test/dev-script helper only (never used by production code paths).
 *
 * Since Batch 4's correction pass, UserService.createManagedUser() no longer
 * accepts a Manager-supplied password: new accounts are created inactive and
 * invitation-pending (S2-45). Pre-existing test/seed scripts need an
 * immediately-usable, known-password account, so this helper activates a
 * just-created pending user directly via Prisma, bypassing the invitation
 * email/token flow entirely (which is exercised separately by the dedicated
 * Batch 4 invitation tests).
 */
export async function activateTestUserWithPassword(email: string, password: string): Promise<void> {
  const passwordHash = await bcrypt.hash(password, 10);
  await prisma.user.update({
    where: { email: email.toLowerCase() },
    data: {
      passwordHash,
      isActive: true,
      invitationTokenHash: null,
      invitationExpiresAt: null,
    },
  });
}
