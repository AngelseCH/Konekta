import mongoose from 'mongoose';

const categorySchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true, trim: true },
  listingType: { type: String, enum: ['product', 'service'], default: 'product' },
  icon: { type: String, default: 'grid' }
}, { timestamps: true });

const Category = mongoose.model('Category', categorySchema);
export { Category };
