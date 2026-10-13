import { Server } from 'socket.io';
import { env } from './env.js';
import { verifyToken } from '../utils/jwt.js';
import { Conversation } from '../models/Conversation.js';
import { Message } from '../models/Message.js';
import mongoose from 'mongoose';

const conversationRoom = (id) => `conversation:${id}`;
const participantFilter = (conversationId, userId) => ({
  _id: conversationId,
  $or: [{ buyer: userId }, { seller: userId }]
});

const createSocketServer = (httpServer) => {
  const io = new Server(httpServer, { cors: { origin: env.frontendUrl, credentials: true } });
  io.use((socket, next) => {
    try {
      const token = socket.handshake.auth?.token;
      if (!token) return next(new Error('Token requerido'));
      socket.user = verifyToken(token);
      next();
    } catch {
      next(new Error('Token inválido'));
    }
  });
  io.on('connection', (socket) => {
    socket.join(`user:${socket.user.id}`);
    socket.on('conversation:join', async ({ conversationId } = {}) => {
      if (!mongoose.isValidObjectId(conversationId)) return;
      const conversation = await Conversation.findOne(participantFilter(conversationId, socket.user.id)).select('_id');
      if (conversation) socket.join(conversationRoom(conversationId));
    });
    socket.on('message:send', async ({ conversationId, text } = {}) => {
      if (!mongoose.isValidObjectId(conversationId) || typeof text !== 'string' || !text.trim() || text.length > 2000) return;
      const conversation = await Conversation.findOne(participantFilter(conversationId, socket.user.id));
      if (!conversation) return;
      const userId = socket.user.id;
      const isBuyer = conversation.buyer.toString() === userId;
      const message = await Message.create({ conversation: conversationId, sender: userId, text: text.trim() });
      conversation.lastMessage = { text: message.text, senderId: userId, createdAt: message.createdAt };
      if (isBuyer) conversation.unreadSeller += 1;
      else conversation.unreadBuyer += 1;
      await conversation.save();
      
      const populated = await message.populate('sender', 'name avatar');
      io.to(conversationRoom(conversationId)).emit('message:new', populated);
    });
    socket.on('message:read', async ({ conversationId, messageId } = {}) => {
      if (!mongoose.isValidObjectId(conversationId) || !mongoose.isValidObjectId(messageId)) return;
      const conversation = await Conversation.findOne(participantFilter(conversationId, socket.user.id)).select('_id');
      if (!conversation) return;
      const message = await Message.findOneAndUpdate(
        { _id: messageId, conversation: conversationId, sender: { $ne: socket.user.id } },
        { read: true },
        { new: true }
      ).select('_id');
      if (message) io.to(conversationRoom(conversationId)).emit('message:read', { conversationId, messageId });
    });
    socket.on('user:typing', async ({ conversationId } = {}) => {
      if (!mongoose.isValidObjectId(conversationId)) return;
      const conversation = await Conversation.findOne(participantFilter(conversationId, socket.user.id)).select('_id');
      if (conversation) socket.to(conversationRoom(conversationId)).emit('user:typing', { conversationId, userId: socket.user.id });
    });
  });
  return io;
};

export { createSocketServer };
