import { User } from '../models/User.js';
import { Product } from '../models/Product.js';
import { Review } from '../models/Review.js';
import { Conversation } from '../models/Conversation.js';
import { asyncHandler } from '../utils/asyncHandler.js';
const sellerStats = asyncHandler(async (request, response) => { const products = await Product.find({ owner: request.user._id }); response.json({ ok: true, data: { products: products.length, reviews: products.reduce((sum, product) => sum + product.rating.count, 0), average: products.length ? Number((products.reduce((sum, product) => sum + product.rating.average, 0) / products.length).toFixed(1)) : 0, messages: 0 } }); });
const adminStats = asyncHandler(async (request, response) => response.json({ ok: true, data: { users: await User.countDocuments(), products: await Product.countDocuments(), reviews: await Review.countDocuments(), conversations: await Conversation.countDocuments() } }));
export { sellerStats, adminStats };
