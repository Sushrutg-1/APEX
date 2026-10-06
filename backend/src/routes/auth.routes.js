import { Router } from 'express';

import { login, refreshAccessToken } from '../controllers/auth.controller.js';

const router = Router();

router.post('/login', login);
router.post('/refresh', refreshAccessToken);

export default router;
