import { Router } from 'express';
import { upload, uploadLogo, uploadImage, uploadImageHandler } from '../controllers/uploadController.js';
import { authMiddleware, requireRole } from '../middlewares/auth.js';

const router = Router();

// Upload logo - requires SUPER_ADMIN or ADMIN
router.post(
  '/logo',
  authMiddleware,
  requireRole(['SUPER_ADMIN', 'ADMIN']),
  upload.single('logo'),
  uploadLogo
);

// Upload generic image - requires authentication
router.post(
  '/image',
  authMiddleware,
  uploadImage.single('image'),
  uploadImageHandler
);

export const uploadRoutes = router;
