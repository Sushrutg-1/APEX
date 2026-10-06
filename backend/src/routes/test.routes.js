import { Router } from 'express';

import authMiddleware from '../middlewares/auth.middleware.js';

const router = Router();

router.get('/protected', authMiddleware, (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Authentication successful',
    user: req.user,
  });
});

export default router;
