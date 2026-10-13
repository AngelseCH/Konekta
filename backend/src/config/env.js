import dotenv from 'dotenv';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const currentDirectory = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: resolve(currentDirectory, '../../.env') });
const nodeEnv = process.env.NODE_ENV || 'development';
const mongoUri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/konekta';
const jwtSecret = process.env.JWT_SECRET || 'cambia-esta-clave-en-produccion';
if (nodeEnv === 'production' && !process.env.MONGO_URI) throw new Error('MONGO_URI es obligatorio en producción.');
if (nodeEnv === 'production' && (!process.env.JWT_SECRET || jwtSecret.length < 32)) throw new Error('Configura JWT_SECRET con al menos 32 caracteres en producción.');
const configuredOrigins = [process.env.FRONTEND_URL, process.env.RENDER_EXTERNAL_URL];
if (nodeEnv !== 'production') configuredOrigins.push('http://localhost:5500');
const frontendOrigins = [...new Set(configuredOrigins.filter(Boolean).flatMap((value) => value.split(',').map((origin) => origin.trim())))];

const env = {
  port: Number(process.env.PORT || 4000),
  nodeEnv,
  mongoUri,
  jwtSecret,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  frontendUrl: frontendOrigins,
  uploadDirectory: process.env.UPLOAD_DIR || resolve(currentDirectory, '../../uploads'),
  cloudinaryCloudName: process.env.CLOUDINARY_CLOUD_NAME || '',
  cloudinaryApiKey: process.env.CLOUDINARY_API_KEY || '',
  cloudinaryApiSecret: process.env.CLOUDINARY_API_SECRET || '',
  cloudinaryFolder: process.env.CLOUDINARY_FOLDER || 'konekta',
  resendApiKey: process.env.RESEND_API_KEY || '',
  mailFrom: process.env.MAIL_FROM || '',
  smtpHost: process.env.SMTP_HOST || 'smtp.gmail.com',
  smtpPort: Number(process.env.SMTP_PORT || 465),
  smtpUser: process.env.SMTP_USER || '',
  smtpPass: process.env.SMTP_PASS || ''
};

export { env };
