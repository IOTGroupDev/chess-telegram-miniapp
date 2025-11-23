import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Chess } from 'chess.js';
import {
  GetPuzzleDto,
  SubmitPuzzleAttemptDto,
  CreatePuzzleDto,
} from './dto/puzzle.dto';
import {
  Puzzle,
  PuzzleAttempt,
  PuzzleResult,
  PuzzleStatistics,
} from './types/puzzle.types';

@Injectable()
export class PuzzleService {
  private readonly logger = new Logger(PuzzleService.name);
  private supabase: SupabaseClient;

  // Glicko-2 constants for puzzle ratings
  private readonly TAU = 0.5; // System constant
  private readonly EPSILON = 0.000001;

  constructor(private configService: ConfigService) {
    const supabaseUrl = this.configService.get<string>('SUPABASE_URL');
    const supabaseKey = this.configService.get<string>('SUPABASE_SERVICE_KEY');

    if (!supabaseUrl || !supabaseKey) {
      throw new Error('SUPABASE_URL and SUPABASE_SERVICE_KEY must be configured');
    }

    this.supabase = createClient(supabaseUrl, supabaseKey);
  }

  /**
   * Get next puzzle for user (adaptive difficulty)
   */
  async getNextPuzzle(userId: string, filters?: GetPuzzleDto): Promise<Puzzle> {
    this.logger.log(`Getting next puzzle for user ${userId}`);

    // Get user's puzzle rating
    const { data: userData } = await this.supabase
      .from('users')
      .select('puzzle_rating, puzzle_rd')
      .eq('id', userId)
      .single();

    const userRating = userData?.puzzle_rating || 1500;
    const userRd = userData?.puzzle_rd || 350;

    // Calculate rating range (adaptive)
    // Wider range for beginners (high RD), narrower for experienced
    const ratingWindow = Math.max(100, Math.min(400, userRd));
    const minRating = filters?.min_rating || userRating - ratingWindow;
    const maxRating = filters?.max_rating || userRating + ratingWindow;

    this.logger.log(`User rating: ${userRating} (RD: ${userRd}), range: ${minRating}-${maxRating}`);

    // Get puzzles not recently attempted
    const { data: recentAttempts } = await this.supabase
      .from('user_puzzle_attempts')
      .select('puzzle_id')
      .eq('user_id', userId)
      .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()) // Last 7 days
      .limit(100);

    const excludedPuzzleIds = (recentAttempts || []).map((a) => a.puzzle_id);

    // Build query
    let query = this.supabase
      .from('puzzles')
      .select('*')
      .gte('rating', minRating)
      .lte('rating', maxRating);

    // Exclude recently attempted
    if (excludedPuzzleIds.length > 0) {
      query = query.not('id', 'in', `(${excludedPuzzleIds.join(',')})`);
    }

    // Apply theme filters
    if (filters?.themes && filters.themes.length > 0) {
      query = query.contains('themes', filters.themes);
    }

    // Order by popularity and rating deviation (prefer popular, well-calibrated puzzles)
    query = query
      .order('popularity', { ascending: false })
      .order('rating_deviation', { ascending: true })
      .limit(10);

    const { data: puzzles, error } = await query;

    if (error || !puzzles || puzzles.length === 0) {
      this.logger.warn(`No puzzles found for user ${userId}`);
      // Fallback: get any puzzle in range
      const { data: fallbackPuzzles } = await this.supabase
        .from('puzzles')
        .select('*')
        .gte('rating', minRating)
        .lte('rating', maxRating)
        .limit(10);

      if (!fallbackPuzzles || fallbackPuzzles.length === 0) {
        throw new NotFoundException('No puzzles available');
      }

      return fallbackPuzzles[Math.floor(Math.random() * fallbackPuzzles.length)];
    }

    // Select random puzzle from top candidates
    const selectedPuzzle = puzzles[Math.floor(Math.random() * puzzles.length)];

    return selectedPuzzle;
  }

  /**
   * Submit puzzle attempt and update ratings
   */
  async submitAttempt(
    userId: string,
    dto: SubmitPuzzleAttemptDto,
  ): Promise<PuzzleResult> {
    this.logger.log(`User ${userId} submitting puzzle attempt: ${dto.puzzle_id}`);

    // Get puzzle
    const { data: puzzle } = await this.supabase
      .from('puzzles')
      .select('*')
      .eq('id', dto.puzzle_id)
      .single();

    if (!puzzle) {
      throw new NotFoundException('Puzzle not found');
    }

    // Get user ratings
    const { data: userData } = await this.supabase
      .from('users')
      .select('puzzle_rating, puzzle_rd')
      .eq('id', userId)
      .single();

    const userRating = userData?.puzzle_rating || 1500;
    const userRd = userData?.puzzle_rd || 350;

    // Record attempt
    const { error: attemptError } = await this.supabase
      .from('user_puzzle_attempts')
      .insert({
        user_id: userId,
        puzzle_id: dto.puzzle_id,
        solved: dto.solved,
        time_spent: dto.time_spent,
        attempts: dto.attempts,
      });

    if (attemptError) {
      this.logger.error(`Failed to record attempt: ${attemptError.message}`);
      throw new BadRequestException('Failed to record attempt');
    }

    // Update puzzle statistics
    await this.supabase
      .from('puzzles')
      .update({
        attempts: puzzle.attempts + 1,
        solved: puzzle.solved + (dto.solved ? 1 : 0),
      })
      .eq('id', dto.puzzle_id);

    // Update user statistics
    await this.supabase
      .from('users')
      .update({
        puzzles_solved: dto.solved
          ? (userData?.puzzles_solved || 0) + 1
          : userData?.puzzles_solved || 0,
        puzzles_failed: !dto.solved
          ? (userData?.puzzles_failed || 0) + 1
          : userData?.puzzles_failed || 0,
      })
      .eq('id', userId);

    // Calculate new ratings using simplified Glicko-2
    const { newUserRating, newUserRd } = this.calculateNewRatings(
      userRating,
      userRd,
      puzzle.rating,
      puzzle.rating_deviation || 350,
      dto.solved,
    );

    // Update user puzzle rating
    await this.supabase
      .from('users')
      .update({
        puzzle_rating: Math.round(newUserRating),
        puzzle_rd: newUserRd,
      })
      .eq('id', userId);

    const ratingChange = Math.round(newUserRating - userRating);

    return {
      puzzle_id: dto.puzzle_id,
      solved: dto.solved,
      time_spent: dto.time_spent,
      attempts: dto.attempts,
      new_user_rating: Math.round(newUserRating),
      rating_change: ratingChange,
    };
  }

  /**
   * Get puzzle by ID
   */
  async getPuzzleById(puzzleId: string): Promise<Puzzle> {
    const { data, error } = await this.supabase
      .from('puzzles')
      .select('*')
      .eq('id', puzzleId)
      .single();

    if (error || !data) {
      throw new NotFoundException('Puzzle not found');
    }

    return data;
  }

  /**
   * Verify puzzle solution
   */
  async verifySolution(puzzleId: string, userMoves: string[]): Promise<boolean> {
    const puzzle = await this.getPuzzleById(puzzleId);
    const correctMoves = puzzle.moves.split(' ');

    // User only needs to play their moves (not opponent's)
    const userMovesOnly = correctMoves.filter((_, index) => index % 2 === 0);

    if (userMoves.length !== userMovesOnly.length) {
      return false;
    }

    // Check if all user moves match
    for (let i = 0; i < userMoves.length; i++) {
      if (userMoves[i] !== userMovesOnly[i]) {
        return false;
      }
    }

    return true;
  }

  /**
   * Get user puzzle statistics
   */
  async getUserStatistics(userId: string): Promise<PuzzleStatistics> {
    // Get total attempts
    const { data: attempts } = await this.supabase
      .from('user_puzzle_attempts')
      .select('solved, puzzle_id')
      .eq('user_id', userId);

    const totalAttempts = attempts?.length || 0;
    const totalSolved = attempts?.filter((a) => a.solved).length || 0;
    const totalFailed = totalAttempts - totalSolved;
    const accuracy = totalAttempts > 0 ? (totalSolved / totalAttempts) * 100 : 0;

    // Calculate current streak
    const sortedAttempts = (attempts || [])
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    let currentStreak = 0;
    for (const attempt of sortedAttempts) {
      if (attempt.solved) {
        currentStreak++;
      } else {
        break;
      }
    }

    // Calculate best streak
    let bestStreak = 0;
    let tempStreak = 0;
    for (const attempt of attempts || []) {
      if (attempt.solved) {
        tempStreak++;
        bestStreak = Math.max(bestStreak, tempStreak);
      } else {
        tempStreak = 0;
      }
    }

    // Get user rating
    const { data: userData } = await this.supabase
      .from('users')
      .select('puzzle_rating')
      .eq('id', userId)
      .single();

    // Get themes mastered (puzzles solved by theme)
    const { data: solvedPuzzles } = await this.supabase
      .from('user_puzzle_attempts')
      .select('puzzle_id, puzzles(themes)')
      .eq('user_id', userId)
      .eq('solved', true);

    const themesMastered: { [theme: string]: number } = {};
    for (const solved of solvedPuzzles || []) {
      const themes = solved.puzzles?.themes || [];
      for (const theme of themes) {
        themesMastered[theme] = (themesMastered[theme] || 0) + 1;
      }
    }

    return {
      total_solved: totalSolved,
      total_failed: totalFailed,
      total_attempts: totalAttempts,
      accuracy: Math.round(accuracy * 10) / 10,
      current_streak: currentStreak,
      best_streak: bestStreak,
      average_rating: userData?.puzzle_rating || 1500,
      themes_mastered: themesMastered,
    };
  }

  /**
   * Create puzzle (admin only)
   */
  async createPuzzle(dto: CreatePuzzleDto): Promise<Puzzle> {
    // Validate FEN
    try {
      const chess = new Chess(dto.fen);
      if (!chess.isGameOver()) {
        // Valid position
      }
    } catch (error) {
      throw new BadRequestException('Invalid FEN');
    }

    const { data, error } = await this.supabase
      .from('puzzles')
      .insert({
        fen: dto.fen,
        moves: dto.moves,
        rating: dto.rating,
        rating_deviation: 350,
        themes: dto.themes || [],
        game_url: dto.game_url,
      })
      .select()
      .single();

    if (error) {
      throw new BadRequestException('Failed to create puzzle');
    }

    return data;
  }

  /**
   * Calculate new ratings using simplified Glicko-2
   */
  private calculateNewRatings(
    userRating: number,
    userRd: number,
    puzzleRating: number,
    puzzleRd: number,
    solved: boolean,
  ): { newUserRating: number; newUserRd: number } {
    // Convert to Glicko-2 scale
    const mu = (userRating - 1500) / 173.7178;
    const phi = userRd / 173.7178;

    const muOpp = (puzzleRating - 1500) / 173.7178;
    const phiOpp = puzzleRd / 173.7178;

    // Calculate v (variance)
    const g = 1 / Math.sqrt(1 + (3 * phiOpp * phiOpp) / (Math.PI * Math.PI));
    const E = 1 / (1 + Math.exp(-g * (mu - muOpp)));
    const v = 1 / (g * g * E * (1 - E));

    // Calculate delta
    const score = solved ? 1 : 0;
    const delta = v * g * (score - E);

    // Calculate new phi
    const phiStar = Math.sqrt(phi * phi + this.TAU * this.TAU);
    const newPhi = 1 / Math.sqrt(1 / (phiStar * phiStar) + 1 / v);

    // Calculate new mu
    const newMu = mu + newPhi * newPhi * g * (score - E);

    // Convert back to original scale
    const newRating = newMu * 173.7178 + 1500;
    const newRd = newPhi * 173.7178;

    return {
      newUserRating: newRating,
      newUserRd: Math.min(350, newRd), // Cap RD at 350
    };
  }
}
