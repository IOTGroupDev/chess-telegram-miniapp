import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../config/supabase';
import { GameBet, BetType, CurrencyType } from '../types/supabase';

interface UseGameBetReturn {
  bet: GameBet | null;
  loading: boolean;
  error: string | null;
  createBet: (betType: BetType, amount?: number, currency?: CurrencyType) => Promise<void>;
  acceptBet: () => Promise<void>;
  depositBet: () => Promise<{ success: boolean; bothDeposited?: boolean; error?: string }>;
  refreshBet: () => Promise<void>;
}

/**
 * Hook for managing game bets
 * Provides bet creation, acceptance, deposit, and real-time updates
 */
export function useGameBet(gameId: string | null, userId: string | null): UseGameBetReturn {
  const [bet, setBet] = useState<GameBet | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Fetch bet data for the game
   */
  const refreshBet = useCallback(async () => {
    if (!gameId) {
      setBet(null);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const { data, error: betError } = await supabase
        .from('game_bets')
        .select('*')
        .eq('game_id', gameId)
        .maybeSingle();

      if (betError) throw betError;

      setBet(data);
    } catch (err) {
      console.error('Error fetching bet:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch bet');
    } finally {
      setLoading(false);
    }
  }, [gameId]);

  /**
   * Create a new bet (only white player can do this)
   */
  const createBet = useCallback(
    async (betType: BetType, amount?: number, currency?: CurrencyType) => {
      if (!gameId || !userId) {
        throw new Error('Missing game ID or user ID');
      }

      try {
        setLoading(true);
        setError(null);

        // Prepare bet data
        const betData: any = {
          game_id: gameId,
          bet_type: betType,
        };

        // For paid bets, set amount and currency
        if (betType !== 'free') {
          if (!amount || !currency) {
            throw new Error('Amount and currency required for paid bets');
          }
          betData.bet_amount = amount;
          betData.currency = currency;
        }

        const { data, error: insertError } = await supabase
          .from('game_bets')
          .insert(betData)
          .select()
          .single();

        if (insertError) throw insertError;

        setBet(data);

        // Update game status based on bet type
        if (betType === 'free') {
          // For free games, update both players' acceptance and game status
          await supabase
            .from('game_bets')
            .update({
              terms_accepted_by_white: true,
              terms_accepted_by_black: true,
              status: 'completed',
            })
            .eq('id', data.id);

          // Start the game immediately
          await supabase
            .from('games')
            .update({
              status: 'active',
              started_at: new Date().toISOString(),
            })
            .eq('id', gameId);
        } else {
          // For paid games, update game status to pending bet acceptance
          await supabase
            .from('games')
            .update({ status: 'pending_bet_acceptance' })
            .eq('id', gameId);
        }
      } catch (err) {
        console.error('Error creating bet:', err);
        setError(err instanceof Error ? err.message : 'Failed to create bet');
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [gameId, userId]
  );

  /**
   * Accept bet terms (black player accepts white's bet proposal)
   */
  const acceptBet = useCallback(async () => {
    if (!gameId || !userId || !bet) {
      throw new Error('Missing required data');
    }

    try {
      setLoading(true);
      setError(null);

      // Get game to determine player color
      const { data: game } = await supabase
        .from('games')
        .select('white_player_id, black_player_id')
        .eq('id', gameId)
        .single();

      if (!game) throw new Error('Game not found');

      const isWhitePlayer = game.white_player_id === userId;
      const fieldToUpdate = isWhitePlayer
        ? 'terms_accepted_by_white'
        : 'terms_accepted_by_black';

      // Update bet to mark terms as accepted
      const { error: updateError } = await supabase
        .from('game_bets')
        .update({ [fieldToUpdate]: true })
        .eq('game_id', gameId);

      if (updateError) throw updateError;

      // Check if both accepted
      const { data: updatedBet } = await supabase
        .from('game_bets')
        .select('*')
        .eq('game_id', gameId)
        .single();

      if (
        updatedBet &&
        updatedBet.terms_accepted_by_white &&
        updatedBet.terms_accepted_by_black
      ) {
        // Both accepted - move to pending deposits
        await supabase
          .from('games')
          .update({ status: 'pending_deposits' })
          .eq('id', gameId);
      }

      await refreshBet();
    } catch (err) {
      console.error('Error accepting bet:', err);
      setError(err instanceof Error ? err.message : 'Failed to accept bet');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [gameId, userId, bet, refreshBet]);

  /**
   * Deposit bet amount (calls database function)
   */
  const depositBet = useCallback(async (): Promise<{
    success: boolean;
    bothDeposited?: boolean;
    error?: string;
  }> => {
    if (!gameId || !userId) {
      return { success: false, error: 'Missing game ID or user ID' };
    }

    try {
      setLoading(true);
      setError(null);

      // Call the database function to handle deposit
      const { data, error: depositError } = await supabase.rpc('deposit_game_bet', {
        p_game_id: gameId,
        p_user_id: userId,
      });

      if (depositError) {
        throw depositError;
      }

      await refreshBet();

      return {
        success: data.success,
        bothDeposited: data.both_deposited,
        error: data.error,
      };
    } catch (err) {
      console.error('Error depositing bet:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to deposit bet';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  }, [gameId, userId, refreshBet]);

  /**
   * Initial load
   */
  useEffect(() => {
    if (gameId) {
      refreshBet();
    }
  }, [gameId, refreshBet]);

  /**
   * Subscribe to bet updates
   */
  useEffect(() => {
    if (!gameId) return;

    const channel = supabase
      .channel(`bet:${gameId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'game_bets',
          filter: `game_id=eq.${gameId}`,
        },
        (payload) => {
          console.log('Bet updated:', payload);

          if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
            setBet(payload.new as GameBet);
          } else if (payload.eventType === 'DELETE') {
            setBet(null);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [gameId]);

  return {
    bet,
    loading,
    error,
    createBet,
    acceptBet,
    depositBet,
    refreshBet,
  };
}
