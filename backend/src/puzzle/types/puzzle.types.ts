/**
 * Puzzle Type Definitions
 */

export interface Puzzle {
  id: string;
  fen: string;
  moves: string; // UCI moves separated by spaces (solution)
  rating: number;
  rating_deviation: number;
  themes: string[];
  game_url?: string;
  popularity: number;
  attempts: number;
  solved: number;
  created_at: Date;
}

export interface PuzzleAttempt {
  id: string;
  user_id: string;
  puzzle_id: string;
  solved: boolean;
  time_spent: number; // milliseconds
  attempts: number;
  created_at: Date;
}

export interface PuzzleSession {
  puzzle: Puzzle;
  user_rating: number;
  user_rd: number;
  start_time: Date;
}

export interface PuzzleResult {
  puzzle_id: string;
  solved: boolean;
  time_spent: number;
  attempts: number;
  new_user_rating?: number;
  new_puzzle_rating?: number;
  rating_change?: number;
}

export interface PuzzleStatistics {
  total_solved: number;
  total_failed: number;
  total_attempts: number;
  accuracy: number; // percentage
  current_streak: number;
  best_streak: number;
  average_rating: number;
  themes_mastered: { [theme: string]: number };
}

export enum PuzzleTheme {
  MATE_IN_1 = 'mateIn1',
  MATE_IN_2 = 'mateIn2',
  MATE_IN_3 = 'mateIn3',
  FORK = 'fork',
  PIN = 'pin',
  SKEWER = 'skewer',
  DISCOVERED_ATTACK = 'discoveredAttack',
  DOUBLE_CHECK = 'doubleCheck',
  SACRIFICE = 'sacrifice',
  DEFLECTION = 'deflection',
  DECOY = 'decoy',
  INTERFERENCE = 'interference',
  ZUGZWANG = 'zugzwang',
  ENDGAME = 'endgame',
  MIDDLEGAME = 'middlegame',
  OPENING = 'opening',
  ADVANCED = 'advanced',
  MASTER = 'master',
}
