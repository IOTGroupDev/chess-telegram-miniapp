import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { Chess } from 'chess.js';
import { webSocketService } from '../services/websocket';
import ApiService from '../services/api';
import type { GameState, Move } from '../types';

interface OnlineGameState {
  gameId: string | null;
  chess: Chess | null;
  gameState: GameState | null;
  isConnected: boolean;
  isWaiting: boolean;
  isMyTurn: boolean;
  currentPlayer: 'white' | 'black' | null;
  opponent: string | null;
  gameStatus: 'waiting' | 'active' | 'finished';
  winner: 'white' | 'black' | 'draw' | null;
  error: string | null;
  moves: Move[];
  chatMessages: Array<{ from: string; message: string; timestamp: string }>;
}

export function useOnlineGame() {
  const { gameId } = useParams<{ gameId: string }>();
  // const navigate = useNavigate();
  const apiService = ApiService.getInstance();

  const [state, setState] = useState<OnlineGameState>({
    gameId: gameId || null,
    chess: null,
    gameState: null,
    isConnected: false,
    isWaiting: false,
    isMyTurn: false,
    currentPlayer: null,
    opponent: null,
    gameStatus: 'waiting',
    winner: null,
    error: null,
    moves: [],
    chatMessages: [],
  });

  // Initialize game
  useEffect(() => {
    if (!gameId) {
      setState(prev => ({ ...prev, error: 'Game ID not found' }));
      return;
    }

    const initializeGame = async () => {
      try {
        // Connect to WebSocket
        webSocketService.connect();
        
        // Get current user ID (mock for now)
        const userId = 'user-' + Math.random().toString(36).substr(2, 9);
        
        // Join the game
        webSocketService.joinGame(userId, gameId);
        
        setState(prev => ({
          ...prev,
          gameId,
          isConnected: true,
          chess: new Chess(),
        }));

        // Set up WebSocket event handlers
        setupWebSocketHandlers(userId);
      } catch (error) {
        console.error('Failed to initialize game:', error);
        setState(prev => ({ 
          ...prev, 
          error: 'Failed to initialize game' 
        }));
      }
    };

    initializeGame();

    return () => {
      webSocketService.disconnect();
    };
  }, [gameId]);

  const setupWebSocketHandlers = useCallback((_userId: string) => {
    // Game state received
    webSocketService.on('game_state', (data: GameState) => {
      setState(prev => ({
        ...prev,
        gameState: data,
        chess: new Chess(data.fen),
        gameStatus: data.status,
        isWaiting: data.status === 'waiting',
        moves: data.moves || [],
      }));
    });

    // Game update received
    webSocketService.on('game_update', (data) => {
      setState(prev => {
        if (!prev.chess) return prev;

        const newChess = new Chess(data.fen);
        const isMyTurn = data.nextTurn === prev.currentPlayer;
        
        return {
          ...prev,
          chess: newChess,
          gameState: {
            ...prev.gameState!,
            fen: data.fen,
            moves: [...prev.moves, data.move],
          },
          moves: [...prev.moves, data.move],
          isMyTurn,
          gameStatus: data.isGameOver ? 'finished' : 'active',
          winner: data.winner || null,
        };
      });
    });

    // Player joined
    webSocketService.on('player_joined', (data) => {
      setState(prev => ({
        ...prev,
        opponent: data.userId,
        isWaiting: false,
        gameStatus: 'active',
      }));
    });

    // Game ended
    webSocketService.on('game_ended', (data) => {
      setState(prev => ({
        ...prev,
        gameStatus: 'finished',
        winner: data.winner,
      }));
    });

    // Draw offered
    webSocketService.on('draw_offered', (data) => {
      // Show notification or modal
      console.log('Draw offered by:', data.from);
    });

    // Error received
    webSocketService.on('error', (data) => {
      setState(prev => ({
        ...prev,
        error: data.message,
      }));
    });

    // Chat message received
    webSocketService.on('chat_message_received', (data) => {
      setState(prev => ({
        ...prev,
        chatMessages: [...prev.chatMessages, data],
      }));
    });
  }, []);

  // Make a move
  const makeMove = useCallback((from: string, to: string, promotion?: string) => {
    if (!state.chess || !state.gameId || !state.isMyTurn) {
      return false;
    }

    // Validate move locally first
    const move = state.chess.move({ from, to, promotion: promotion as any });
    if (!move) {
      setState(prev => ({ ...prev, error: 'Invalid move' }));
      return false;
    }

    // Send move to server
    webSocketService.makeMove(state.gameId, from, to, promotion);
    
    setState(prev => ({
      ...prev,
      isMyTurn: false,
      error: null,
    }));

    return true;
  }, [state.chess, state.gameId, state.isMyTurn]);

  // Resign game
  const resign = useCallback(() => {
    if (state.gameId) {
      webSocketService.resign(state.gameId);
    }
  }, [state.gameId]);

  // Offer draw
  const offerDraw = useCallback(() => {
    if (state.gameId) {
      webSocketService.offerDraw(state.gameId);
    }
  }, [state.gameId]);

  // Accept draw
  const acceptDraw = useCallback(() => {
    if (state.gameId) {
      webSocketService.acceptDraw(state.gameId);
    }
  }, [state.gameId]);

  // Send chat message
  const sendChatMessage = useCallback((message: string) => {
    if (state.gameId && message.trim()) {
      webSocketService.sendChatMessage(state.gameId, message.trim());
    }
  }, [state.gameId]);

  // Get available moves for a square
  const getAvailableMoves = useCallback((square: string) => {
    if (!state.chess) return [];
    
    return state.chess.moves({ square: square as any, verbose: true });
  }, [state.chess]);

  // Check if move is valid
  const isMoveValid = useCallback((from: string, to: string, promotion?: string) => {
    if (!state.chess) return false;
    
    const move = state.chess.move({ from, to, promotion: promotion as any });
    return !!move;
  }, [state.chess]);

  // Get game history
  const getGameHistory = useCallback(async (userId: string) => {
    try {
      return await apiService.getUserHistory(userId);
    } catch (error) {
      console.error('Failed to get game history:', error);
      return [];
    }
  }, [apiService]);

  return {
    ...state,
    makeMove,
    resign,
    offerDraw,
    acceptDraw,
    sendChatMessage,
    getAvailableMoves,
    isMoveValid,
    getGameHistory,
  };
}
