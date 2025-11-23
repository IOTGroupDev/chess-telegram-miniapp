/**
 * useSupabaseGame Hook
 * Real-time game synchronization with Supabase
 */

import { useEffect, useState, useCallback } from 'react';
import { Chess } from 'chess.js';
import supabase from '../lib/supabaseClient';
import type {
  Game,
  Move,
  GameWithPlayers,
  ClockTickPayload,
} from '../types/supabase';

interface GameState {
  game: GameWithPlayers | null;
  moves: Move[];
  chess: Chess | null;
  isLoading: boolean;
  error: string | null;
}

interface GameActions {
  makeMove: (from: string, to: string, promotion?: string) => Promise<boolean>;
  resign: () => Promise<void>;
  offerDraw: () => Promise<void>;
  acceptDraw: () => Promise<void>;
  refreshGame: () => Promise<void>;
}

export function useSupabaseGame(
  gameId: string,
  userId: string
): GameState & GameActions {
  const [game, setGame] = useState<GameWithPlayers | null>(null);
  const [moves, setMoves] = useState<Move[]>([]);
  const [chess, setChess] = useState<Chess | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch game data
  const fetchGame = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Fetch game with players and moves
      const { data: gameData, error: gameError } = await supabase
        .from('games')
        .select(
          `
          *,
          white_player:users!white_player_id(*),
          black_player:users!black_player_id(*)
        `
        )
        .eq('id', gameId)
        .single();

      if (gameError) throw gameError;

      // Fetch moves
      const { data: movesData, error: movesError } = await supabase
        .from('moves')
        .select('*')
        .eq('game_id', gameId)
        .order('move_number', { ascending: true });

      if (movesError) throw movesError;

      setGame(gameData as GameWithPlayers);
      setMoves(movesData || []);

      // Initialize chess.js with current FEN
      const chessInstance = new Chess((gameData as any).fen);
      setChess(chessInstance);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load game');
      console.error('Error fetching game:', err);
    } finally {
      setIsLoading(false);
    }
  }, [gameId]);

  // Setup real-time subscriptions
  useEffect(() => {
    fetchGame();

    // Create channel for this game
    const gameChannel = supabase.channel(`game:${gameId}`);

    // Subscribe to game updates
    gameChannel
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'games',
          filter: `id=eq.${gameId}`,
        },
        (payload) => {
          console.log('[Supabase] Game updated:', payload);
          setGame((prev) => {
            if (!prev) return null;
            return {
              ...prev,
              ...(payload.new as Game),
            };
          });

          // Update chess instance
          if (payload.new.fen) {
            setChess(new Chess(payload.new.fen));
          }
        }
      )
      // Subscribe to new moves
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'moves',
          filter: `game_id=eq.${gameId}`,
        },
        (payload) => {
          console.log('[Supabase] New move:', payload);
          const newMove = payload.new as Move;
          setMoves((prev) => [...prev, newMove]);

          // Update chess instance
          if (newMove.fen) {
            setChess(new Chess(newMove.fen));
          }
        }
      )
      // Subscribe to clock ticks (broadcast)
      .on('broadcast', { event: 'clock-tick' }, ({ payload }) => {
        const clockData = payload as ClockTickPayload;
        setGame((prev) => {
          if (!prev) return null;
          return {
            ...prev,
            white_time_remaining: clockData.whiteTime,
            black_time_remaining: clockData.blackTime,
          };
        });
      })
      .subscribe();

    // Cleanup
    return () => {
      gameChannel.unsubscribe();
    };
  }, [gameId, fetchGame]);

  // Make a move
  const makeMove = useCallback(
    async (from: string, to: string, promotion?: string): Promise<boolean> => {
      if (!chess || !game) {
        setError('Game not initialized');
        return false;
      }

      try {
        // Validate move on client
        const move = chess.move({
          from,
          to,
          promotion: promotion as 'q' | 'r' | 'b' | 'n' | undefined,
        });

        if (!move) {
          setError('Invalid move');
          return false;
        }

        // Insert move into database
        const { error: moveError } = await supabase
          .from('moves')
          .insert({
            game_id: gameId,
            user_id: userId,
            move_number: game.move_number + 1,
            uci: `${from}${to}${promotion || ''}`,
            san: move.san,
            fen: chess.fen(),
            time_spent: 0, // TODO: Calculate actual time
            clock_time: game.white_player_id === userId
              ? game.white_time_remaining
              : game.black_time_remaining,
          } as any)
          .select()
          .single();

        if (moveError) {
          // Rollback chess state
          chess.undo();
          throw moveError;
        }

        // Check if game is over
        const isGameOver = chess.isGameOver();
        let winner: 'white' | 'black' | 'draw' | null = null;
        let endReason: string | null = null;

        if (isGameOver) {
          if (chess.isCheckmate()) {
            winner = chess.turn() === 'w' ? 'black' : 'white';
            endReason = 'checkmate';
          } else if (chess.isDraw()) {
            winner = 'draw';
            if (chess.isStalemate()) endReason = 'stalemate';
            else if (chess.isInsufficientMaterial())
              endReason = 'insufficient_material';
            else if (chess.isThreefoldRepetition())
              endReason = 'threefold_repetition';
            else endReason = 'fifty_move_rule';
          }
        }

        // Update game state
        const { error: updateError } = await supabase
          .from('games')
          .update({
            fen: chess.fen(),
            pgn: chess.pgn(),
            move_number: game.move_number + 1,
            last_move_at: new Date().toISOString(),
            status: isGameOver ? 'finished' : 'active',
            winner: winner as any,
            end_reason: endReason as any,
            finished_at: isGameOver ? new Date().toISOString() : null,
          } as any)
          .eq('id', gameId);

        if (updateError) throw updateError;

        return true;
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to make move');
        console.error('Error making move:', err);
        return false;
      }
    },
    [chess, game, gameId, userId]
  );

  // Resign
  const resign = useCallback(async () => {
    if (!game) return;

    try {
      const winner = game.white_player_id === userId ? 'black' : 'white';

      await supabase
        .from('games')
        .update({
          status: 'finished',
          winner: winner as any,
          end_reason: 'resignation',
          finished_at: new Date().toISOString(),
        } as any)
        .eq('id', gameId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to resign');
      console.error('Error resigning:', err);
    }
  }, [game, gameId, userId]);

  // Offer draw
  const offerDraw = useCallback(async () => {
    if (!game) return;

    try {
      const isWhite = game.white_player_id === userId;

      await supabase
        .from('games')
        .update({
          white_offered_draw: isWhite ? true : game.white_offered_draw,
          black_offered_draw: !isWhite ? true : game.black_offered_draw,
        } as any)
        .eq('id', gameId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to offer draw');
      console.error('Error offering draw:', err);
    }
  }, [game, gameId, userId]);

  // Accept draw
  const acceptDraw = useCallback(async () => {
    if (!game) return;

    try {
      await supabase
        .from('games')
        .update({
          status: 'finished',
          winner: 'draw',
          end_reason: 'draw_agreement',
          finished_at: new Date().toISOString(),
        } as any)
        .eq('id', gameId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to accept draw');
      console.error('Error accepting draw:', err);
    }
  }, [gameId]);

  const refreshGame = useCallback(async () => {
    await fetchGame();
  }, [fetchGame]);

  return {
    game,
    moves,
    chess,
    isLoading,
    error,
    makeMove,
    resign,
    offerDraw,
    acceptDraw,
    refreshGame,
  };
}
