import request from 'supertest';
import express from 'express';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';

// Create a test app
const app = express();
const server = createServer(app);
const io = new SocketIOServer(server);

// Mock the database and Redis for testing
jest.mock('../config/database', () => ({
  AppDataSource: {
    getRepository: jest.fn(() => ({
      findOne: jest.fn(),
      find: jest.fn(),
      save: jest.fn(),
    })),
  },
}));

jest.mock('../config/redis', () => ({
  redis: {
    get: jest.fn(),
    setex: jest.fn(),
  },
}));

describe('Online Game API', () => {
  describe('POST /api/online-games', () => {
    it('should create a waiting game', async () => {
      const response = await request(app)
        .post('/api/online-games')
        .send({
          telegramId: 123456789,
          mode: 'waiting'
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('id');
      expect(response.body.status).toBe('waiting');
      expect(response.body.message).toBe('Waiting for opponent...');
    });

    it('should join existing waiting game', async () => {
      // First create a waiting game
      await request(app)
        .post('/api/online-games')
        .send({
          telegramId: 123456789,
          mode: 'waiting'
        });

      // Then join it
      const response = await request(app)
        .post('/api/online-games')
        .send({
          telegramId: 987654321,
          mode: 'join'
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('id');
      expect(response.body.status).toBe('active');
      expect(response.body).toHaveProperty('whitePlayer');
      expect(response.body).toHaveProperty('blackPlayer');
    });
  });

  describe('GET /api/online-games/:id', () => {
    it('should get game by id', async () => {
      // First create a game
      const createResponse = await request(app)
        .post('/api/online-games')
        .send({
          telegramId: 123456789,
          mode: 'waiting'
        });

      const gameId = createResponse.body.id;

      const response = await request(app)
        .get(`/api/online-games/${gameId}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('id', gameId);
      expect(response.body).toHaveProperty('status');
      expect(response.body).toHaveProperty('fen');
    });

    it('should return 404 for non-existent game', async () => {
      const response = await request(app)
        .get('/api/online-games/non-existent-id');

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('error', 'Game not found');
    });
  });

  describe('GET /api/online-games/waiting/list', () => {
    it('should return waiting games', async () => {
      // Create a waiting game
      await request(app)
        .post('/api/online-games')
        .send({
          telegramId: 123456789,
          mode: 'waiting'
        });

      const response = await request(app)
        .get('/api/online-games/waiting/list');

      expect(response.status).toBe(200);
      if (response.body) {
        expect(response.body).toHaveProperty('id');
        expect(response.body).toHaveProperty('whitePlayer');
        expect(response.body).toHaveProperty('createdAt');
      }
    });
  });
});
