import { Router } from 'express';

import { login, refreshAccessToken, register } from '../controllers/auth.controller.js';

const router = Router();

router.post('/register', register);
router.post('/login', login);
router.post('/refresh', refreshAccessToken);

export default router;
