import multer from 'multer';
import fs from 'node:fs';
import path from 'node:path';
import { env } from '../config/env.js';
import { isCloudinaryEnabled, uploadBufferToCloudinary } from '../config/cloudinary.js';
import { ApiError } from '../utils/ApiError.js';

const uploadDirectory = env.uploadDirectory;
fs.mkdirSync(uploadDirectory, { recursive: true });
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (request, file, callback) => callback(null, /^image\/(jpeg|png|webp|gif)$/.test(file.mimetype))
});

const persistUpload = async (file) => {
  if (!file) return null;

  if (isCloudinaryEnabled()) {
    try {
      const uploaded = await uploadBufferToCloudinary(file.buffer, file.originalname, env.cloudinaryFolder);
      return uploaded?.secure_url || null;
    } catch (error) {
      console.error('Cloudinary image upload failed:', error.message);
      throw new ApiError(502, 'Cloudinary no pudo guardar la imagen. Revisa las credenciales y configuración del servicio.');
    }
  }

  if (env.nodeEnv === 'production') {
     throw new ApiError(503, 'El almacenamiento de imágenes no está configurado. Contacta al administrador.');
  }

  const safeName = `${Date.now()}-${file.originalname.replace(/[^a-zA-Z0-9._-]/g, '')}`;
  const target = path.join(uploadDirectory, safeName);
  await fs.promises.writeFile(target, file.buffer);
  return `/uploads/${safeName}`;
};

export { upload, persistUpload };
