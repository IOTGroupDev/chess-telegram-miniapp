import { Server as SocketIOServer, Socket } from 'socket.io';
import { Chess } from 'chess.js';
import { GameService } from './GameService';
import { redis } from '../config/redis';

interface SocketData {
  userId: string;
  gameId?: string;
}

export class WebSocketService {
  private io: SocketIOServer;
  private gameService: GameService;

  constructor(io: SocketIOServer) {
    this.io = io;
    this.gameService = new GameService();
    this.setupSocketHandlers();
  }

  private setupSocketHandlers(): void {
    this.io.on('connection', (socket: Socket) => {
      console.log('Client connected:', socket.id);

      socket.on('join_game', async (data: { userId: string; gameId: string }) => {
        try {
          const { userId, gameId } = data;
          
          // Verify user and game exist
          const game = await this.gameService.getGame(gameId);
          if (!game) {
            socket.emit('error', { message: 'Game not found' });
            return;
          }

          // Check if user is part of this game
          if (game.whitePlayerId !== userId && game.blackPlayerId !== userId) {
            socket.emit('error', { message: 'You are not part of this game' });
            return;
          }

          // Join game room
          socket.join(`game-${gameId}`);
          (socket as any).data = { userId, gameId } as SocketData;

          // Store game state in Redis
          await redis.setex(`game:${gameId}`, 3600, JSON.stringify({
            fen: game.fen,
            moveNumber: game.moveNumber,
            status: game.status,
            currentTurn: game.moveNumber % 2 === 0 ? 'white' : 'black'
          }));

          // Notify other players
          socket.to(`game-${gameId}`).emit('player_joined', { userId });

          // Send current game state
          socket.emit('game_state', {
            fen: game.fen,
            moveNumber: game.moveNumber,
            status: game.status,
            currentTurn: game.moveNumber % 2 === 0 ? 'white' : 'black',
            moves: game.moves
          });

          console.log(`User ${userId} joined game ${gameId}`);
        } catch (error) {
          console.error('Error joining game:', error);
          socket.emit('error', { message: 'Failed to join game' });
        }
      });

      socket.on('player_move', async (data: { gameId: string; from: string; to: string; promotion?: string }) => {
        try {
          const { gameId, from, to, promotion } = data;
          const socketData = (socket as any).data as SocketData;

          if (!socketData || socketData.gameId !== gameId) {
            socket.emit('error', { message: 'Not in this game' });
            return;
          }

          // Get current game state from Redis
          const gameStateStr = await redis.get(`game:${gameId}`);
          if (!gameStateStr) {
            socket.emit('error', { message: 'Game state not found' });
            return;
          }

          const gameState = JSON.parse(gameStateStr);
          const chess = new Chess(gameState.fen);

          // Check if it's the player's turn
          const isWhiteTurn = gameState.currentTurn === 'white';
          const isPlayerWhite = socketData.userId === gameState.whitePlayerId;
          
          if (isWhiteTurn !== isPlayerWhite) {
            socket.emit('error', { message: 'Not your turn' });
            return;
          }

          // Validate move
          const move = chess.move({
            from,
            to,
            promotion: promotion as any,
          });

          if (!move) {
            socket.emit('error', { message: 'Invalid move' });
            return;
          }

          // Update game in database
          const updatedGame = await this.gameService.makeMove(gameId, from, to, promotion);

          // Update Redis
          await redis.setex(`game:${gameId}`, 3600, JSON.stringify({
            fen: chess.fen(),
            moveNumber: gameState.moveNumber + 1,
            status: chess.isGameOver() ? 'finished' : 'active',
            currentTurn: (gameState.moveNumber + 1) % 2 === 0 ? 'white' : 'black'
          }));

          // Notify all players in the game
          this.io.to(`game-${gameId}`).emit('game_update', {
            fen: chess.fen(),
            move: {
              from,
              to,
              piece: move.piece,
              captured: move.captured,
              promotion: move.promotion,
              san: move.san,
              uci: from + to + (promotion || '')
            },
            moveNumber: gameState.moveNumber + 1,
            nextTurn: (gameState.moveNumber + 1) % 2 === 0 ? 'white' : 'black',
            isGameOver: chess.isGameOver(),
            winner: chess.isGameOver() ? (chess.isCheckmate() ? (chess.turn() === 'w' ? 'black' : 'white') : 'draw') : null
          });

          console.log(`Move made in game ${gameId}: ${from}${to}`);
        } catch (error) {
          console.error('Error making move:', error);
          socket.emit('error', { message: 'Failed to make move' });
        }
      });

      socket.on('resign', async (data: { gameId: string }) => {
        try {
          const { gameId } = data;
          const socketData = (socket as any).data as SocketData;

          if (!socketData || socketData.gameId !== gameId) {
            socket.emit('error', { message: 'Not in this game' });
            return;
          }

          // Update game status
          await this.gameService.resignGame(gameId, socketData.userId);

          // Get game to determine winner
          const game = await this.gameService.getGame(gameId);
          if (game) {
            // Notify all players
            this.io.to(`game-${gameId}`).emit('game_ended', {
              reason: 'resignation',
              winner: socketData.userId === game.whitePlayerId ? 'black' : 'white'
            });
          }

          console.log(`Player ${socketData.userId} resigned in game ${gameId}`);
        } catch (error) {
          console.error('Error resigning:', error);
          socket.emit('error', { message: 'Failed to resign' });
        }
      });

      socket.on('draw_offer', async (data: { gameId: string }) => {
        try {
          const { gameId } = data;
          const socketData = (socket as any).data as SocketData;

          if (!socketData || socketData.gameId !== gameId) {
            socket.emit('error', { message: 'Not in this game' });
            return;
          }

          // Notify other player
          socket.to(`game-${gameId}`).emit('draw_offered', { 
            from: socketData.userId 
          });

          console.log(`Draw offered in game ${gameId} by ${socketData.userId}`);
        } catch (error) {
          console.error('Error offering draw:', error);
          socket.emit('error', { message: 'Failed to offer draw' });
        }
      });

      socket.on('draw_accept', async (data: { gameId: string }) => {
        try {
          const { gameId } = data;
          const socketData = (socket as any).data as SocketData;

          if (!socketData || socketData.gameId !== gameId) {
            socket.emit('error', { message: 'Not in this game' });
            return;
          }

          // Update game status
          await this.gameService.drawGame(gameId);

          // Notify all players
          this.io.to(`game-${gameId}`).emit('game_ended', {
            reason: 'draw',
            winner: 'draw'
          });

          console.log(`Draw accepted in game ${gameId}`);
        } catch (error) {
          console.error('Error accepting draw:', error);
          socket.emit('error', { message: 'Failed to accept draw' });
        }
      });

      socket.on('disconnect', () => {
        console.log('Client disconnected:', socket.id);
      });
    });
  }
}
