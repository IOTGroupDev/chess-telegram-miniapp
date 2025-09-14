import { io, Socket } from 'socket.io-client';
import type { GameState, Move } from '../types';

export interface WebSocketEvents {
  // Outgoing events
  join_game: (data: { userId: string; gameId: string }) => void;
  player_move: (data: { gameId: string; from: string; to: string; promotion?: string }) => void;
  resign: (data: { gameId: string }) => void;
  draw_offer: (data: { gameId: string }) => void;
  draw_accept: (data: { gameId: string }) => void;
  chat_message: (data: { gameId: string; message: string }) => void;

  // Incoming events
  game_state: (data: GameState) => void;
  game_update: (data: {
    fen: string;
    move: Move;
    moveNumber: number;
    nextTurn: 'white' | 'black';
    isGameOver: boolean;
    winner?: 'white' | 'black' | 'draw' | null;
  }) => void;
  player_joined: (data: { userId: string }) => void;
  game_ended: (data: {
    reason: 'resignation' | 'draw' | 'checkmate' | 'stalemate';
    winner: 'white' | 'black' | 'draw';
  }) => void;
  draw_offered: (data: { from: string }) => void;
  error: (data: { message: string }) => void;
  chat_message_received: (data: { from: string; message: string; timestamp: string }) => void;
}

export class WebSocketService {
  private socket: Socket | null = null;
  private eventHandlers: Partial<WebSocketEvents> = {};

  connect(url: string = 'http://localhost:3000'): void {
    if (this.socket?.connected) {
      return;
    }

    this.socket = io(url, {
      transports: ['websocket', 'polling'],
      timeout: 20000,
    });

    this.socket.on('connect', () => {
      console.log('WebSocket connected:', this.socket?.id);
    });

    this.socket.on('disconnect', (reason: any) => {
      console.log('WebSocket disconnected:', reason);
    });

    this.socket.on('connect_error', (error: any) => {
      console.error('WebSocket connection error:', error);
    });

    // Set up event listeners
    this.setupEventListeners();
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  private setupEventListeners(): void {
    if (!this.socket) return;

    // Game state events
    this.socket.on('game_state', (data: any) => {
      this.eventHandlers.game_state?.(data);
    });

    this.socket.on('game_update', (data: any) => {
      this.eventHandlers.game_update?.(data);
    });

    this.socket.on('player_joined', (data: any) => {
      this.eventHandlers.player_joined?.(data);
    });

    this.socket.on('game_ended', (data: any) => {
      this.eventHandlers.game_ended?.(data);
    });

    this.socket.on('draw_offered', (data: any) => {
      this.eventHandlers.draw_offered?.(data);
    });

    this.socket.on('error', (data: any) => {
      this.eventHandlers.error?.(data);
    });

    // Chat events
    this.socket.on('chat_message_received', (data: any) => {
      this.eventHandlers.chat_message_received?.(data);
    });
  }

  // Event emission methods
  joinGame(userId: string, gameId: string): void {
    this.socket?.emit('join_game', { userId, gameId });
  }

  makeMove(gameId: string, from: string, to: string, promotion?: string): void {
    this.socket?.emit('player_move', { gameId, from, to, promotion });
  }

  resign(gameId: string): void {
    this.socket?.emit('resign', { gameId });
  }

  offerDraw(gameId: string): void {
    this.socket?.emit('draw_offer', { gameId });
  }

  acceptDraw(gameId: string): void {
    this.socket?.emit('draw_accept', { gameId });
  }

  sendChatMessage(gameId: string, message: string): void {
    this.socket?.emit('chat_message', { gameId, message });
  }

  // Event subscription methods
  on<K extends keyof WebSocketEvents>(event: K, handler: WebSocketEvents[K]): void {
    this.eventHandlers[event] = handler;
  }

  off<K extends keyof WebSocketEvents>(event: K): void {
    delete this.eventHandlers[event];
  }

  // Connection status
  get isConnected(): boolean {
    return this.socket?.connected || false;
  }

  get socketId(): string | undefined {
    return this.socket?.id;
  }
}

// Singleton instance
export const webSocketService = new WebSocketService();
