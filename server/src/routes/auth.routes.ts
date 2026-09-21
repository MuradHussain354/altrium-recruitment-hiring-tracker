import { Router } from 'express';
import { AuthController } from '../controllers/auth.controller';
import { requireAuth } from '../middlewares/auth.middleware';

const router = Router();

// Public Authentication Endpoints
// POST /api/v1/auth/login (Step 1)
router.post('/login', AuthController.login);

// POST /api/v1/auth/2fa/verify-login (Step 2)
router.post('/2fa/verify-login', AuthController.verify2FALogin);

// GET /api/v1/auth/invitation-details (S2-45, public)
router.get('/invitation-details', AuthController.getInvitationDetails);

// POST /api/v1/auth/accept-invitation (S2-45, public)
router.post('/accept-invitation', AuthController.acceptInvitation);

// Authenticated Endpoints (require active ACCESS token)
// GET /api/v1/auth/me
router.get('/me', requireAuth, AuthController.getMe);

// POST /api/v1/auth/logout
router.post('/logout', requireAuth, AuthController.logout);

// 2FA Management Endpoints (Internal Users)
// GET /api/v1/auth/2fa/status
router.get('/2fa/status', requireAuth, AuthController.get2FAStatus);

// POST /api/v1/auth/2fa/setup
router.post('/2fa/setup', requireAuth, AuthController.setup2FA);

// POST /api/v1/auth/2fa/enable
router.post('/2fa/enable', requireAuth, AuthController.enable2FA);

// POST /api/v1/auth/2fa/disable
router.post('/2fa/disable', requireAuth, AuthController.disable2FA);

// POST /api/v1/auth/2fa/backup-codes/regenerate
router.post('/2fa/backup-codes/regenerate', requireAuth, AuthController.regenerateBackupCodes);

export default router;
