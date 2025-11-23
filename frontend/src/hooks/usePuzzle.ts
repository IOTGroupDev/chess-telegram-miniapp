import { useState, useCallback } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useAppStore } from '../store/useAppStore';

export interface Puzzle {
  id: string;
  fen: string;
  moves: string; // Space-separated UCI moves
  rating: number;
  rating_deviation: number;
  themes: string[];
  game_url?: string;
  popularity: number;
  attempts: number;
  solved: number;
}

export interface PuzzleStatistics {
  total_solved: number;
  total_failed: number;
  total_attempts: number;
  accuracy: number;
  current_streak: number;
  best_streak: number;
  average_rating: number;
  themes_mastered: { [theme: string]: number };
}

export interface PuzzleResult {
  puzzle_id: string;
  solved: boolean;
  time_spent: number;
  attempts: number;
  new_user_rating?: number;
  rating_change?: number;
}

export const usePuzzle = () => {
  const { user } = useAppStore();
  const [currentPuzzle, setCurrentPuzzle] = useState<Puzzle | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [statistics, setStatistics] = useState<PuzzleStatistics | null>(null);

  /**
   * Fetch next puzzle
   */
  const fetchNextPuzzle = useCallback(
    async (filters?: { themes?: string[]; min_rating?: number; max_rating?: number }) => {
      if (!user) {
        setError('User not authenticated');
        return;
      }

      setLoading(true);
      setError(null);

      try {
        // Get user's puzzle rating for adaptive selection
        const { data: userData } = await supabase
          .from('users')
          .select('puzzle_rating, puzzle_rd')
          .eq('id', user.id)
          .single();

        const userRating = (userData as any)?.puzzle_rating || 1500;
        const userRd = (userData as any)?.puzzle_rd || 350;

        // Calculate adaptive rating range
        const ratingWindow = Math.max(100, Math.min(400, userRd));
        const minRating = filters?.min_rating || userRating - ratingWindow;
        const maxRating = filters?.max_rating || userRating + ratingWindow;

        // Get recent attempts to exclude
        const { data: recentAttempts } = await supabase
          .from('user_puzzle_attempts')
          .select('puzzle_id')
          .eq('user_id', user.id)
          .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
          .limit(100);

        const excludedIds = (recentAttempts || []).map((a: any) => a.puzzle_id);

        // Build query
        let query = supabase
          .from('puzzles')
          .select('*')
          .gte('rating', minRating)
          .lte('rating', maxRating);

        // Exclude recently attempted
        if (excludedIds.length > 0) {
          query = query.not('id', 'in', `(${excludedIds.join(',')})`);
        }

        // Apply theme filter
        if (filters?.themes && filters.themes.length > 0) {
          query = query.contains('themes', filters.themes);
        }

        // Order by popularity
        query = query.order('popularity', { ascending: false }).limit(10);

        const { data: puzzles, error: fetchError } = await query;

        if (fetchError) throw fetchError;

        if (!puzzles || puzzles.length === 0) {
          // Fallback to any puzzle
          const { data: fallbackPuzzles } = await supabase
            .from('puzzles')
            .select('*')
            .gte('rating', minRating)
            .lte('rating', maxRating)
            .limit(10);

          if (!fallbackPuzzles || fallbackPuzzles.length === 0) {
            throw new Error('No puzzles available');
          }

          setCurrentPuzzle(
            fallbackPuzzles[Math.floor(Math.random() * fallbackPuzzles.length)]
          );
        } else {
          // Random selection from top candidates
          setCurrentPuzzle(puzzles[Math.floor(Math.random() * puzzles.length)]);
        }
      } catch (err: any) {
        setError(err.message);
        console.error('Failed to fetch puzzle:', err);
      } finally {
        setLoading(false);
      }
    },
    [user]
  );

  /**
   * Submit puzzle attempt
   */
  const submitAttempt = async (
    puzzleId: string,
    solved: boolean,
    timeSpent: number,
    attempts: number
  ): Promise<PuzzleResult | null> => {
    if (!user) {
      setError('User not authenticated');
      return null;
    }

    try {
      // @ts-ignore - Supabase type limitation
      const { error: submitError } = await supabase
        .from('user_puzzle_attempts')
        .insert({
          user_id: user.id,
          puzzle_id: puzzleId,
          solved,
          time_spent: timeSpent,
          attempts,
        })
        .select()
        .single();

      if (submitError) throw submitError;

      // Update puzzle stats
      if (currentPuzzle) {
        await supabase
          .from('puzzles')
      // @ts-expect-error - Supabase generated types limitation
          .update({
            attempts: currentPuzzle.attempts + 1,
            solved: currentPuzzle.solved + (solved ? 1 : 0),
          })
          .eq('id', puzzleId);
      }

      // Update user stats
      const { data: userData } = await supabase
        .from('users')
        .select('puzzles_solved, puzzles_failed, puzzle_rating, puzzle_rd')
        .eq('id', user.id)
        .single();

      const userDataTyped = userData as any;

      // @ts-ignore - Supabase type limitation
      await supabase
        .from('users')
        .update({
          puzzles_solved: solved
            ? (userDataTyped?.puzzles_solved || 0) + 1
            : userDataTyped?.puzzles_solved || 0,
          puzzles_failed: !solved
            ? (userDataTyped?.puzzles_failed || 0) + 1
            : userDataTyped?.puzzles_failed || 0,
        })
        .eq('id', user.id);

      // Calculate rating change (simplified)
      const oldRating = userDataTyped?.puzzle_rating || 1500;
      const puzzleRating = currentPuzzle?.rating || 1500;
      const expected = 1 / (1 + Math.pow(10, (puzzleRating - oldRating) / 400));
      const kFactor = 32;
      const ratingChange = Math.round(kFactor * ((solved ? 1 : 0) - expected));
      const newRating = oldRating + ratingChange;

      // Update user rating
      // @ts-ignore - Supabase type limitation
      await supabase
        .from('users')
        .update({
          puzzle_rating: newRating,
        })
        .eq('id', user.id);

      return {
        puzzle_id: puzzleId,
        solved,
        time_spent: timeSpent,
        attempts,
        new_user_rating: newRating,
        rating_change: ratingChange,
      };
    } catch (err: any) {
      setError(err.message);
      console.error('Failed to submit attempt:', err);
      return null;
    }
  };

  /**
   * Fetch user statistics
   */
  const fetchStatistics = useCallback(async () => {
    if (!user) return;

    try {
      const { data: attempts } = await supabase
        .from('user_puzzle_attempts')
        .select('solved, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      const attemptsTyped = attempts as any[];
      const totalAttempts = attemptsTyped?.length || 0;
      const totalSolved = attemptsTyped?.filter((a) => a.solved).length || 0;
      const totalFailed = totalAttempts - totalSolved;
      const accuracy = totalAttempts > 0 ? (totalSolved / totalAttempts) * 100 : 0;

      // Calculate streaks
      let currentStreak = 0;
      for (const attempt of attemptsTyped || []) {
        if (attempt.solved) {
          currentStreak++;
        } else {
          break;
        }
      }

      let bestStreak = 0;
      let tempStreak = 0;
      for (const attempt of attemptsTyped || []) {
        if (attempt.solved) {
          tempStreak++;
          bestStreak = Math.max(bestStreak, tempStreak);
        } else {
          tempStreak = 0;
        }
      }

      const { data: userData } = await supabase
        .from('users')
        .select('puzzle_rating')
        .eq('id', user.id)
        .single();

      const userDataTyped = userData as any;

      setStatistics({
        total_solved: totalSolved,
        total_failed: totalFailed,
        total_attempts: totalAttempts,
        accuracy: Math.round(accuracy * 10) / 10,
        current_streak: currentStreak,
        best_streak: bestStreak,
        average_rating: userDataTyped?.puzzle_rating || 1500,
        themes_mastered: {},
      });
    } catch (err: any) {
      console.error('Failed to fetch statistics:', err);
    }
  }, [user]);

  return {
    currentPuzzle,
    loading,
    error,
    statistics,
    fetchNextPuzzle,
    submitAttempt,
    fetchStatistics,
  };
};
