import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { register, login, me, logout, forgotPassword, resetPassword } from '../controllers/auth.js';
import { registerRules, loginRules, forgotPasswordRules, resetPasswordRules } from '../validators/auth.js';
import { validate } from '../middlewares/validate.js';
import { authRequired } from '../middlewares/auth.js';

const loginLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 5, standardHeaders: true, message: { ok: false, message: 'Demasiados intentos. Intenta de nuevo más tarde.' } });
const passwordResetLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 3, standardHeaders: true, message: { ok: false, message: 'Solicitaste varios códigos. Espera unos minutos e inténtalo de nuevo.' } });
const router = Router();
router.post('/register', registerRules, validate, register);
router.post('/login', loginLimiter, loginRules, validate, login);
router.post('/forgot-password', passwordResetLimiter, forgotPasswordRules, validate, forgotPassword);
router.post('/reset-password', resetPasswordRules, validate, resetPassword);
router.get('/me', authRequired, me);
router.post('/logout', authRequired, logout);

export default router;
