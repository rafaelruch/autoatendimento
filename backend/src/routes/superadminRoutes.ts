import { Router } from 'express';
import type { Response, NextFunction } from 'express';
import { authMiddleware, type AuthRequest } from '../middlewares/auth.js';
import { createError } from '../middlewares/errorHandler.js';
import {
  getStores,
  createStore,
  updateStore,
  deleteStore,
} from '../controllers/storeController.js';

export const superadminRoutes = Router();

// Middleware to check SUPER_ADMIN role
function requireSuperAdmin(req: AuthRequest, _res: Response, next: NextFunction) {
  if (req.userRole !== 'SUPER_ADMIN') {
    return next(createError('Acesso negado. Requer permissão de Super Admin.', 403));
  }
  next();
}

// All routes require authentication and SUPER_ADMIN role
superadminRoutes.use(authMiddleware);
superadminRoutes.use(requireSuperAdmin);

// Store management
superadminRoutes.get('/stores', getStores);
superadminRoutes.post('/stores', createStore);
superadminRoutes.put('/stores/:id', updateStore);
superadminRoutes.delete('/stores/:id', deleteStore);
