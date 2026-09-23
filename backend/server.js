import dns from 'node:dns';
dns.setServers(['8.8.8.8', '8.8.4.4']); // Usa Google DNS o '1.1.1.1' (Cloudflare)

// ... el resto de tus imports (express, mongoose, etc.)
import http from 'node:http';
import app from './src/app.js';
import { connectDatabase } from './src/config/db.js';
import { createSocketServer } from './src/config/socket.js';
import { env } from './src/config/env.js';

const server = http.createServer(app);
const io = createSocketServer(server);
app.set('io', io);

const start = async () => {
  await connectDatabase();
  server.listen(env.port, () => {
    console.log(`Konekta API escuchando en http://localhost:${env.port}`);
  });
};

start().catch((error) => {
  console.error('No se pudo iniciar Konekta:', error.message);
  process.exit(1);
});

process.on('SIGTERM', () => server.close(() => process.exit(0)));
