import dotenv from 'dotenv';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const currentDirectory = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: resolve(currentDirectory, '../../.env') });
const configuredOrigins = [process.env.FRONTEND_URL, process.env.RENDER_EXTERNAL_URL];
if (process.env.NODE_ENV !== 'production') configuredOrigins.push('http://localhost:5500');
const frontendOrigins = [...new Set(configuredOrigins.filter(Boolean).flatMap((value) => value.split(',').map((origin) => origin.trim())))];

const env = {
  port: Number(process.env.PORT || 4000),
  nodeEnv: process.env.NODE_ENV || 'development',
  mongoUri: process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/konekta',
  jwtSecret: process.env.JWT_SECRET || 'cambia-esta-clave-en-produccion',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  frontendUrl: frontendOrigins,
  uploadDirectory: process.env.UPLOAD_DIR || resolve(currentDirectory, '../../uploads'),
  cloudinaryCloudName: process.env.CLOUDINARY_CLOUD_NAME || '',
  cloudinaryApiKey: process.env.CLOUDINARY_API_KEY || '',
  cloudinaryApiSecret: process.env.CLOUDINARY_API_SECRET || '',
  cloudinaryFolder: process.env.CLOUDINARY_FOLDER || 'konekta'
};

export { env };
