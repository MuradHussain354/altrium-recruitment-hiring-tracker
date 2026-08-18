import { Router } from 'express';
import { AuthController } from '../controllers/auth.controller';
import { requireAuth } from '../middlewares/auth.middleware';

const router = Router();

// POST /api/v1/auth/login
router.post('/login', AuthController.login);

// GET /api/v1/auth/me
router.get('/me', requireAuth, AuthController.getMe);

export default router;
