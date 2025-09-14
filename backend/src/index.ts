import express from 'express';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';

import { initializeDatabase } from './config/database';
import { initializeRedis } from './config/redis';
import { corsHandler } from './middleware/cors';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';
import gameRoutes from './routes/gameRoutes';
import userRoutes from './routes/userRoutes';
import onlineGameRoutes from './routes/onlineGameRoutes';
import { WebSocketService } from './services/WebSocketService';

// Load environment variables
dotenv.config();

const app = express();
const server = createServer(app);
const io = new SocketIOServer(server, {
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    methods: ['GET', 'POST']
  }
});

const PORT = process.env.PORT || 3000;

// Middleware
app.use(helmet());
app.use(morgan('combined'));
app.use(corsHandler);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/games', gameRoutes);
app.use('/api/online-games', onlineGameRoutes);
app.use('/api/users', userRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Initialize WebSocket service
const webSocketService = new WebSocketService(io);

// Error handling
app.use(notFoundHandler);
app.use(errorHandler);

// Initialize database and start server
const startServer = async () => {
  try {
    await initializeDatabase();
    await initializeRedis();
    
    server.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
      console.log(`Health check: http://localhost:${PORT}/health`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();

export { io };
