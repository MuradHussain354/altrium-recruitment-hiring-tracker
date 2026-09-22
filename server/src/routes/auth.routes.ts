import { Router } from 'express';
import { AuthController } from '../controllers/auth.controller';
import { requireAuth } from '../middlewares/auth.middleware';

const router = Router();

// Public Authentication Endpoints
// POST /api/v1/auth/login
router.post('/login', AuthController.login);

// GET /api/v1/auth/invitation-details (S2-45, public)
router.get('/invitation-details', AuthController.getInvitationDetails);

// POST /api/v1/auth/accept-invitation (S2-45, public)
router.post('/accept-invitation', AuthController.acceptInvitation);

// Authenticated Endpoints (require active ACCESS token)
// GET /api/v1/auth/me
router.get('/me', requireAuth, AuthController.getMe);

// POST /api/v1/auth/logout
router.post('/logout', requireAuth, AuthController.logout);

export default router;
