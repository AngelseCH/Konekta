import { Server } from 'socket.io';
import { env } from './env.js';
import { verifyToken } from '../utils/jwt.js';
import { Conversation } from '../models/Conversation.js';
import { Message } from '../models/Message.js';

const createSocketServer = (httpServer) => {
  const io = new Server(httpServer, { cors: { origin: env.frontendUrl } });
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
    socket.on('conversation:join', async ({ conversationId }) => {
      socket.join(`conversation:${conversationId}`);
    });
    socket.on('message:send', async ({ conversationId, text }) => {
      if (!text?.trim()) return;
      const conversation = await Conversation.findById(conversationId);
      if (!conversation) return;
      const userId = socket.user.id;
      const isBuyer = conversation.buyer.toString() === userId;
      const isSeller = conversation.seller.toString() === userId;
      if (!isBuyer && !isSeller) return;
      const message = await Message.create({ conversation: conversationId, sender: userId, text: text.trim() });
      conversation.lastMessage = { text: message.text, senderId: userId, createdAt: message.createdAt };
      if (isBuyer) conversation.unreadSeller += 1;
      else conversation.unreadBuyer += 1;
      await conversation.save();
      const populated = await message.populate('sender', 'name avatar');
      io.to(`conversation:${conversationId}`).emit('message:new', populated);
    });
    socket.on('message:read', async ({ conversationId, messageId }) => {
      await Message.findOneAndUpdate({ _id: messageId, conversation: conversationId }, { read: true });
      io.to(`conversation:${conversationId}`).emit('message:read', { conversationId, messageId });
    });
    socket.on('user:typing', ({ conversationId }) => socket.to(`conversation:${conversationId}`).emit('user:typing', { conversationId, userId: socket.user.id }));
  });
  return io;
};

export { createSocketServer };
