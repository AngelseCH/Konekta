import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { connectDatabase } from '../config/db.js';
import { User } from '../models/User.js';

const seed = async () => {
  await connectDatabase();
  await User.deleteMany({});
  const passwordHash = await bcrypt.hash('Admin123', 10);
  await User.insertMany([
    { name: 'Administrador Demo', email: 'admin@demo.com', password: passwordHash, role: 'admin' },
    { name: 'Vendedor Demo', email: 'vendedor@demo.com', password: await bcrypt.hash('Vendedor123', 10), role: 'vendedor' },
    { name: 'Consumidor Demo', email: 'consumidor@demo.com', password: await bcrypt.hash('Consumidor123', 10), role: 'consumidor' }
  ]);
  console.log('Usuarios demo insertados');
};

seed().then(() => mongoose.disconnect()).catch(async (error) => { console.error(error); await mongoose.disconnect(); process.exit(1); });
