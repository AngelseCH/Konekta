import mongoose from 'mongoose';

const conversationSchema = new mongoose.Schema({
  product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  buyer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  seller: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  lastMessage: { text: String, senderId: mongoose.Schema.Types.ObjectId, createdAt: Date },
  unreadBuyer: { type: Number, default: 0 },
  unreadSeller: { type: Number, default: 0 }
}, { timestamps: true });
conversationSchema.index({ product: 1, buyer: 1, seller: 1 }, { unique: true });
const Conversation = mongoose.model('Conversation', conversationSchema);
export { Conversation };
