import mongoose from 'mongoose';

const productSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, maxlength: 120 },
  listingType: { type: String, enum: ['product', 'service'], default: 'product', index: true },
  isActive: { type: Boolean, default: true, index: true },
  company: { type: String, required: true, trim: true },
  contactPhone: { type: String, trim: true, maxlength: 30 },
  category: { type: String, required: true, trim: true },
  desc: { type: String, required: true, trim: true },
  price: { type: Number, required: true, min: 0 },
  images: [String],
  location: {
    address: { type: String, trim: true, maxlength: 240 },
    lat: { type: Number, min: -90, max: 90 },
    lng: { type: Number, min: -180, max: 180 }
  },
  schedule: {
    monday: { type: String, trim: true, default: '' },
    tuesday: { type: String, trim: true, default: '' },
    wednesday: { type: String, trim: true, default: '' },
    thursday: { type: String, trim: true, default: '' },
    friday: { type: String, trim: true, default: '' },
    saturday: { type: String, trim: true, default: '' },
    sunday: { type: String, trim: true, default: '' }
  },
  owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  rating: { average: { type: Number, default: 0 }, count: { type: Number, default: 0 } }
}, { timestamps: true });

const Product = mongoose.model('Product', productSchema);
export { Product };
