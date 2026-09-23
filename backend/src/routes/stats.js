import { Router } from 'express';
import { authRequired, allowRoles } from '../middlewares/auth.js';
import { sellerStats, adminStats } from '../controllers/stats.js';
const router = Router();
router.get('/seller', authRequired, allowRoles('vendedor', 'admin'), sellerStats);
router.get('/admin', authRequired, allowRoles('admin'), adminStats);
export default router;
