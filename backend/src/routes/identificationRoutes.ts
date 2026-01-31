import { Router } from 'express';
import {
  createSession,
  claimSession,
  checkSession,
} from '../controllers/identificationController.js';

const router = Router();

// Public routes (for self-service identification)
router.post('/session', createSession);
router.post('/claim', claimSession);
router.get('/check/:token', checkSession);

export { router as identificationRoutes };
