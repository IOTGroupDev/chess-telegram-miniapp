/**
 * Tournament Type Definitions
 */

export enum TournamentType {
  ARENA = 'arena',
  SWISS = 'swiss',
  KNOCKOUT = 'knockout',
}

export enum TournamentStatus {
  UPCOMING = 'upcoming',
  ACTIVE = 'active',
  FINISHED = 'finished',
  CANCELLED = 'cancelled',
}

export enum RoundStatus {
  UPCOMING = 'upcoming',
  ACTIVE = 'active',
  FINISHED = 'finished',
}

export enum PairingAlgorithm {
  DUTCH = 'dutch',         // Dutch system (most common)
  BURSTEIN = 'burstein',   // Burstein system
  RANDOM = 'random',       // Random pairing
}

export enum TimeControlType {
  BULLET = 'bullet',
  BLITZ = 'blitz',
  RAPID = 'rapid',
  CLASSICAL = 'classical',
  UNLIMITED = 'unlimited',
}

export interface Tournament {
  id: string;
  name: string;
  description?: string;
  type: TournamentType;

  // Time control
  time_control: TimeControlType;
  time_limit: number;
  time_increment: number;

  // Scheduling
  start_time: Date;
  duration?: number; // For arena tournaments (minutes)

  // Swiss specific
  rounds?: number;
  current_round?: number;
  pairing_method?: PairingAlgorithm;

  // Arena specific
  points_for_win?: number;
  points_for_draw?: number;
  points_for_loss?: number;
  berserk_allowed?: boolean;

  // Entry requirements
  min_rating?: number;
  max_rating?: number;
  max_players?: number;

  status: TournamentStatus;

  created_by: string;
  created_at: Date;
}

export interface TournamentParticipant {
  id: string;
  tournament_id: string;
  user_id: string;

  // Scores
  score: number;
  games_played: number;
  wins: number;
  draws: number;
  losses: number;

  // Swiss tiebreaks
  performance_rating?: number;
  buchholz?: number;
  median_buchholz?: number;
  sonnborn_berger?: number;

  // Color balance
  games_as_white: number;
  games_as_black: number;

  joined_at: Date;
}

export interface TournamentRound {
  id: string;
  tournament_id: string;
  round_number: number;
  status: RoundStatus;

  started_at?: Date;
  finished_at?: Date;
  created_at: Date;
}

export interface TournamentPairing {
  id: string;
  tournament_id: string;
  round_id: string;

  white_player_id: string;
  black_player_id: string;
  game_id?: string;

  board_number?: number;
  created_at: Date;
}

export interface TournamentStanding {
  user_id: string;
  username: string;
  rating: number;

  score: number;
  games_played: number;
  wins: number;
  draws: number;
  losses: number;

  // Tiebreaks
  buchholz?: number;
  performance_rating?: number;

  // Position
  rank: number;
}

export interface SwissPairingResult {
  white_id: string;
  black_id: string;
  board_num: number;
}
