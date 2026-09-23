import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { register, login, me, logout } from '../controllers/auth.js';
import { registerRules, loginRules } from '../validators/auth.js';
import { validate } from '../middlewares/validate.js';
import { authRequired } from '../middlewares/auth.js';

const loginLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 5, standardHeaders: true, message: { ok: false, message: 'Demasiados intentos. Intenta de nuevo más tarde.' } });
const router = Router();
router.post('/register', registerRules, validate, register);
router.post('/login', loginLimiter, loginRules, validate, login);
router.get('/me', authRequired, me);
router.post('/logout', authRequired, logout);

export default router;
