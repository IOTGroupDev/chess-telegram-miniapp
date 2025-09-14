import {
  WebSocketGateway as WSGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { GameService } from '../game/game.service';
import { UserService } from '../user/user.service';
import { Chess } from 'chess.js';

interface SocketData {
  userId: string;
  gameId?: string;
}

@WSGateway({
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    credentials: true,
  },
})
export class WebSocketGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server;

  constructor(
    private gameService: GameService,
    private userService: UserService,
  ) {}

  handleConnection(client: Socket) {
    console.log('Client connected:', client.id);
  }

  handleDisconnect(client: Socket) {
    console.log('Client disconnected:', client.id);
  }

  @SubscribeMessage('join_game')
  async handleJoinGame(
    @MessageBody() data: { userId: string; gameId: string },
    @ConnectedSocket() client: Socket,
  ) {
    try {
      const { userId, gameId } = data;
      
      // Verify user exists
      const user = await this.userService.findById(userId);
      if (!user) {
        client.emit('error', { message: 'User not found' });
        return;
      }

      // Get game
      const game = await this.gameService.findById(gameId);
      if (!game) {
        client.emit('error', { message: 'Game not found' });
        return;
      }

      // Check if user is part of this game
      if (game.whitePlayerId !== userId && game.blackPlayerId !== userId) {
        client.emit('error', { message: 'You are not part of this game' });
        return;
      }

      // Join game room
      client.join(`game-${gameId}`);
      (client as any).data = { userId, gameId } as SocketData;

      // Notify other players
      client.to(`game-${gameId}`).emit('player_joined', { userId });

      // Send current game state
      client.emit('game_state', {
        id: game.id,
        status: game.status,
        fen: game.fen,
        moveNumber: game.moveNumber,
        whitePlayer: game.whitePlayer,
        blackPlayer: game.blackPlayer,
        moves: game.moves,
      });

      console.log(`User ${userId} joined game ${gameId}`);
    } catch (error) {
      console.error('Error joining game:', error);
      client.emit('error', { message: 'Failed to join game' });
    }
  }

  @SubscribeMessage('player_move')
  async handlePlayerMove(
    @MessageBody() data: { gameId: string; from: string; to: string; promotion?: string },
    @ConnectedSocket() client: Socket,
  ) {
    try {
      const { gameId, from, to, promotion } = data;
      const socketData = (client as any).data as SocketData;

      if (!socketData || socketData.gameId !== gameId) {
        client.emit('error', { message: 'Not in this game' });
        return;
      }

      // Make the move
      const result = await this.gameService.makeMove(gameId, {
        userId: socketData.userId,
        from,
        to,
        promotion,
      });

      // Notify all players in the game
      this.server.to(`game-${gameId}`).emit('game_update', {
        fen: result.game.fen,
        move: {
          from,
          to,
          piece: result.move.piece,
          captured: result.move.captured,
          promotion: result.move.promotion,
          san: result.move.san,
          uci: result.move.uci,
        },
        moveNumber: result.game.moveNumber,
        nextTurn: result.game.moveNumber % 2 === 0 ? 'white' : 'black',
        isGameOver: result.game.status === 'FINISHED',
        winner: result.game.winner?.toLowerCase(),
      });

      console.log(`Move made in game ${gameId}: ${from}${to}`);
    } catch (error) {
      console.error('Error making move:', error);
      client.emit('error', { message: (error as Error).message || 'Failed to make move' });
    }
  }

  @SubscribeMessage('resign')
  async handleResign(
    @MessageBody() data: { gameId: string },
    @ConnectedSocket() client: Socket,
  ) {
    try {
      const { gameId } = data;
      const socketData = (client as any).data as SocketData;

      if (!socketData || socketData.gameId !== gameId) {
        client.emit('error', { message: 'Not in this game' });
        return;
      }

      // Resign the game
      const game = await this.gameService.resign(gameId, socketData.userId);

      // Notify all players
      this.server.to(`game-${gameId}`).emit('game_ended', {
        reason: 'resignation',
        winner: game.winner?.toLowerCase(),
      });

      console.log(`Player ${socketData.userId} resigned in game ${gameId}`);
    } catch (error) {
      console.error('Error resigning:', error);
      client.emit('error', { message: 'Failed to resign' });
    }
  }

  @SubscribeMessage('draw_offer')
  async handleDrawOffer(
    @MessageBody() data: { gameId: string },
    @ConnectedSocket() client: Socket,
  ) {
    try {
      const { gameId } = data;
      const socketData = (client as any).data as SocketData;

      if (!socketData || socketData.gameId !== gameId) {
        client.emit('error', { message: 'Not in this game' });
        return;
      }

      // Notify other player
      client.to(`game-${gameId}`).emit('draw_offered', { 
        from: socketData.userId 
      });

      console.log(`Draw offered in game ${gameId} by ${socketData.userId}`);
    } catch (error) {
      console.error('Error offering draw:', error);
      client.emit('error', { message: 'Failed to offer draw' });
    }
  }

  @SubscribeMessage('draw_accept')
  async handleDrawAccept(
    @MessageBody() data: { gameId: string },
    @ConnectedSocket() client: Socket,
  ) {
    try {
      const { gameId } = data;
      const socketData = (client as any).data as SocketData;

      if (!socketData || socketData.gameId !== gameId) {
        client.emit('error', { message: 'Not in this game' });
        return;
      }

      // Accept draw
      await this.gameService.draw(gameId);

      // Notify all players
      this.server.to(`game-${gameId}`).emit('game_ended', {
        reason: 'draw',
        winner: 'draw',
      });

      console.log(`Draw accepted in game ${gameId}`);
    } catch (error) {
      console.error('Error accepting draw:', error);
      client.emit('error', { message: 'Failed to accept draw' });
    }
  }
}
