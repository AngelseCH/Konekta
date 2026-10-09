import { v2 as cloudinary } from 'cloudinary';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true
});

const isCloudinaryEnabled = () => Boolean(
  process.env.CLOUDINARY_CLOUD_NAME &&
  process.env.CLOUDINARY_API_KEY &&
  process.env.CLOUDINARY_API_SECRET
);

const uploadBufferToCloudinary = async (buffer, originalName, folder = process.env.CLOUDINARY_FOLDER || 'konekta') => {
  if (!isCloudinaryEnabled()) return null;
  const safeName = String(originalName || 'upload').replace(/\.[^/.]+$/, '');
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder,
        public_id: `${Date.now()}-${safeName}`.replace(/[^a-zA-Z0-9._-]/g, '-').slice(0, 120),
        resource_type: 'image'
      },
      (error, result) => {
        if (error) return reject(error);
        resolve(result);
      }
    );
    uploadStream.end(buffer);
  });
};

export { cloudinary, isCloudinaryEnabled, uploadBufferToCloudinary };
