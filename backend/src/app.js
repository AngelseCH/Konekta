import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import authRoutes from './routes/auth.js';
import categoryRoutes from './routes/categories.js';
import productRoutes from './routes/products.js';
import userRoutes from './routes/users.js';
import reviewRoutes from './routes/reviews.js';
import chatRoutes from './routes/chat.js';
import statsRoutes from './routes/stats.js';
import { env } from './config/env.js';
import { notFound, errorHandler } from './middlewares/error.js';

const app = express();
const __dirname = path.dirname(fileURLToPath(import.meta.url));
app.use(helmet({
	crossOriginResourcePolicy: { policy: 'cross-origin' },
	contentSecurityPolicy: {
		directives: {
			...helmet.contentSecurityPolicy.getDefaultDirectives(),
			'connect-src': ["'self'", 'ws:', 'wss:'],
			'style-src': ["'self'", 'https://fonts.googleapis.com'],
			'font-src': ["'self'", 'https://fonts.gstatic.com', 'data:']
		}
	}
}));
app.use(cors({ origin: env.frontendUrl, credentials: true }));
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));
if (env.nodeEnv !== 'test') app.use(morgan('dev'));
app.use(rateLimit({ windowMs: 15 * 60 * 1000, limit: 300, standardHeaders: true }));
app.get('/health', (request, response) => response.json({ ok: true, data: { service: 'konekta-api', status: 'up' } }));
app.use(express.static(path.join(__dirname, '../../frontend')));
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));
app.use('/api/auth', authRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/products', productRoutes);
app.use('/api/users', userRoutes);
app.use('/api/products', reviewRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/stats', statsRoutes);
app.get('/{*splat}', (request, response, next) => {
	if (request.path.startsWith('/api') || request.path.startsWith('/uploads')) return next();
	response.sendFile(path.join(__dirname, '../../frontend/index.html'));
});
app.use(notFound);
app.use(errorHandler);

export default app;
