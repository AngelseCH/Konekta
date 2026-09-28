import multer from 'multer';
import fs from 'node:fs';
import { env } from '../config/env.js';

const uploadDirectory = env.uploadDirectory;
fs.mkdirSync(uploadDirectory, { recursive: true });
const storage = multer.diskStorage({ destination: uploadDirectory, filename: (request, file, callback) => callback(null, `${Date.now()}-${file.originalname.replace(/[^a-zA-Z0-9._-]/g, '')}`) });
const upload = multer({ storage, limits: { fileSize: 5 * 1024 * 1024 }, fileFilter: (request, file, callback) => callback(null, /^image\/(jpeg|png|webp|gif)$/.test(file.mimetype)) });
export { upload };
