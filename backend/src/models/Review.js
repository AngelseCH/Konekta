import mongoose from 'mongoose';

const reviewSchema = new mongoose.Schema({
  product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  author: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  stars: { type: Number, required: true, min: 1, max: 5 },
  text: { type: String, required: true, trim: true, maxlength: 1000 }
}, { timestamps: true });
reviewSchema.index({ product: 1, author: 1 }, { unique: true });
const Review = mongoose.model('Review', reviewSchema);
export { Review };
