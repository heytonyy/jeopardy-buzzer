import 'dotenv/config';
import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
import { initDb } from './db.js';
import authRouter from './routes/auth.js';
import roomRouter from './routes/rooms.js';
import { registerSocketHandlers } from './socket.js';

// Crash loudly on startup if required secrets are missing
const REQUIRED_ENV = ['JWT_SECRET', 'TEACHER_USERNAME', 'TEACHER_PASSWORD'];
for (const key of REQUIRED_ENV) {
  if (!process.env[key]) {
    console.error(`ERROR: Missing required environment variable: ${key}`);
    process.exit(1);
  }
}

const app = express();
const httpServer = createServer(app);

const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:5173';

const corsOptions = {
  origin: CLIENT_URL,
  credentials: true,
  methods: ['GET', 'POST', 'DELETE'],
};

const io = new Server(httpServer, {
  cors: { ...corsOptions, methods: ['GET', 'POST'] },
});

app.set('trust proxy', 1); // Required for secure cookies behind Heroku's proxy
app.use(cors(corsOptions));
app.use(cookieParser());
app.use(express.json());

app.use('/api/auth', authRouter);
app.use('/api/rooms', roomRouter);
app.get('/api/health', (_req, res) => res.json({ ok: true }));

// In production, serve the React build and let client-side routing handle the rest
if (process.env.NODE_ENV === 'production') {
  const clientDist = join(__dirname, '../../client/dist');
  app.use(express.static(clientDist));
  app.get('*', (_req, res) => res.sendFile(join(clientDist, 'index.html')));
}

initDb();
registerSocketHandlers(io);

const PORT = process.env.PORT || 3001;
httpServer.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
