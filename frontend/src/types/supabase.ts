/**
 * TypeScript types generated from Supabase schema
 * Auto-generated types for type-safe database access
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

// Enums
export type GameStatus = 'waiting' | 'active' | 'finished' | 'aborted';
export type GameWinner = 'white' | 'black' | 'draw';
export type GameEndReason =
  | 'checkmate'
  | 'resignation'
  | 'timeout'
  | 'draw_agreement'
  | 'stalemate'
  | 'insufficient_material'
  | 'threefold_repetition'
  | 'fifty_move_rule'
  | 'aborted';
export type TimeControlType = 'bullet' | 'blitz' | 'rapid' | 'classical' | 'unlimited';
export type MoveClassification =
  | 'best'
  | 'excellent'
  | 'good'
  | 'inaccuracy'
  | 'mistake'
  | 'blunder'
  | 'missed_win';
export type TournamentType = 'arena' | 'swiss' | 'knockout';
export type TournamentStatus = 'upcoming' | 'active' | 'finished' | 'cancelled';

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          telegram_id: number;
          username: string | null;
          first_name: string | null;
          last_name: string | null;
          avatar_url: string | null;

          // Ratings
          bullet_rating: number;
          bullet_rd: number;
          bullet_volatility: number;

          blitz_rating: number;
          blitz_rd: number;
          blitz_volatility: number;

          rapid_rating: number;
          rapid_rd: number;
          rapid_volatility: number;

          classical_rating: number;
          classical_rd: number;
          classical_volatility: number;

          ai_rating: number;
          ai_rd: number;

          puzzle_rating: number;
          puzzle_rd: number;

          // Statistics
          games_played: number;
          games_won: number;
          games_drawn: number;
          games_lost: number;

          puzzles_solved: number;
          puzzles_failed: number;

          // Preferences
          preferred_time_control: string;
          language: string;

          last_seen_at: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          telegram_id: number;
          username?: string | null;
          first_name?: string | null;
          last_name?: string | null;
          avatar_url?: string | null;

          bullet_rating?: number;
          bullet_rd?: number;
          bullet_volatility?: number;

          blitz_rating?: number;
          blitz_rd?: number;
          blitz_volatility?: number;

          rapid_rating?: number;
          rapid_rd?: number;
          rapid_volatility?: number;

          classical_rating?: number;
          classical_rd?: number;
          classical_volatility?: number;

          ai_rating?: number;
          ai_rd?: number;

          puzzle_rating?: number;
          puzzle_rd?: number;

          games_played?: number;
          games_won?: number;
          games_drawn?: number;
          games_lost?: number;

          puzzles_solved?: number;
          puzzles_failed?: number;

          preferred_time_control?: string;
          language?: string;

          last_seen_at?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          telegram_id?: number;
          username?: string | null;
          first_name?: string | null;
          last_name?: string | null;
          avatar_url?: string | null;

          bullet_rating?: number;
          bullet_rd?: number;
          bullet_volatility?: number;

          blitz_rating?: number;
          blitz_rd?: number;
          blitz_volatility?: number;

          rapid_rating?: number;
          rapid_rd?: number;
          rapid_volatility?: number;

          classical_rating?: number;
          classical_rd?: number;
          classical_volatility?: number;

          ai_rating?: number;
          ai_rd?: number;

          puzzle_rating?: number;
          puzzle_rd?: number;

          games_played?: number;
          games_won?: number;
          games_drawn?: number;
          games_lost?: number;

          puzzles_solved?: number;
          puzzles_failed?: number;

          preferred_time_control?: string;
          language?: string;

          last_seen_at?: string;
          updated_at?: string;
        };
      };

      games: {
        Row: {
          id: string;
          white_player_id: string | null;
          black_player_id: string | null;

          status: GameStatus;
          winner: GameWinner | null;
          end_reason: GameEndReason | null;

          fen: string;
          pgn: string | null;
          move_number: number;

          time_control: TimeControlType;
          time_limit: number;
          time_increment: number;

          white_time_remaining: number | null;
          black_time_remaining: number | null;

          white_rating_before: number | null;
          black_rating_before: number | null;
          white_rating_after: number | null;
          black_rating_after: number | null;

          is_rated: boolean;
          is_public: boolean;
          is_ai_game: boolean;

          invite_code: string | null;

          white_offered_draw: boolean;
          black_offered_draw: boolean;

          created_at: string;
          started_at: string | null;
          finished_at: string | null;
          last_move_at: string | null;
        };
        Insert: {
          id?: string;
          white_player_id?: string | null;
          black_player_id?: string | null;

          status?: GameStatus;
          winner?: GameWinner | null;
          end_reason?: GameEndReason | null;

          fen?: string;
          pgn?: string | null;
          move_number?: number;

          time_control: TimeControlType;
          time_limit: number;
          time_increment?: number;

          white_time_remaining?: number | null;
          black_time_remaining?: number | null;

          white_rating_before?: number | null;
          black_rating_before?: number | null;
          white_rating_after?: number | null;
          black_rating_after?: number | null;

          is_rated?: boolean;
          is_public?: boolean;
          is_ai_game?: boolean;

          invite_code?: string | null;

          white_offered_draw?: boolean;
          black_offered_draw?: boolean;

          created_at?: string;
          started_at?: string | null;
          finished_at?: string | null;
          last_move_at?: string | null;
        };
        Update: {
          id?: string;
          white_player_id?: string | null;
          black_player_id?: string | null;

          status?: GameStatus;
          winner?: GameWinner | null;
          end_reason?: GameEndReason | null;

          fen?: string;
          pgn?: string | null;
          move_number?: number;

          time_control?: TimeControlType;
          time_limit?: number;
          time_increment?: number;

          white_time_remaining?: number | null;
          black_time_remaining?: number | null;

          white_rating_before?: number | null;
          black_rating_before?: number | null;
          white_rating_after?: number | null;
          black_rating_after?: number | null;

          is_rated?: boolean;
          is_public?: boolean;
          is_ai_game?: boolean;

          invite_code?: string | null;

          white_offered_draw?: boolean;
          black_offered_draw?: boolean;

          started_at?: string | null;
          finished_at?: string | null;
          last_move_at?: string | null;
        };
      };

      moves: {
        Row: {
          id: string;
          game_id: string;
          user_id: string;

          move_number: number;

          uci: string;
          san: string;

          fen: string;

          time_spent: number | null;
          clock_time: number | null;

          evaluation: number | null;

          created_at: string;
        };
        Insert: {
          id?: string;
          game_id: string;
          user_id: string;

          move_number: number;

          uci: string;
          san: string;

          fen: string;

          time_spent?: number | null;
          clock_time?: number | null;

          evaluation?: number | null;

          created_at?: string;
        };
        Update: {
          // Moves are immutable - no updates allowed
        };
      };

      game_analysis: {
        Row: {
          id: string;
          game_id: string;

          engine: string;
          depth: number;

          white_accuracy: number | null;
          black_accuracy: number | null;

          white_blunders: number;
          white_mistakes: number;
          white_inaccuracies: number;

          black_blunders: number;
          black_mistakes: number;
          black_inaccuracies: number;

          opening_eco: string | null;
          opening_name: string | null;

          analysis: Json | null;

          completed_at: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          game_id: string;

          engine?: string;
          depth: number;

          white_accuracy?: number | null;
          black_accuracy?: number | null;

          white_blunders?: number;
          white_mistakes?: number;
          white_inaccuracies?: number;

          black_blunders?: number;
          black_mistakes?: number;
          black_inaccuracies?: number;

          opening_eco?: string | null;
          opening_name?: string | null;

          analysis?: Json | null;

          completed_at?: string;
          created_at?: string;
        };
        Update: {
          analysis?: Json | null;
          completed_at?: string;
        };
      };

      puzzles: {
        Row: {
          id: string;
          fen: string;
          moves: string;
          rating: number;
          rating_deviation: number;
          themes: string[];
          game_url: string | null;
          popularity: number;
          attempts: number;
          solved: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          fen: string;
          moves: string;
          rating: number;
          rating_deviation?: number;
          themes?: string[];
          game_url?: string | null;
          popularity?: number;
          attempts?: number;
          solved?: number;
          created_at?: string;
        };
        Update: {
          rating?: number;
          rating_deviation?: number;
          themes?: string[];
          popularity?: number;
          attempts?: number;
          solved?: number;
        };
      };

      user_puzzle_attempts: {
        Row: {
          id: string;
          user_id: string;
          puzzle_id: string;
          solved: boolean;
          time_spent: number | null;
          attempts: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          puzzle_id: string;
          solved: boolean;
          time_spent?: number | null;
          attempts?: number;
          created_at?: string;
        };
        Update: {};
      };

      openings: {
        Row: {
          id: string;
          eco: string;
          name: string;
          variation: string | null;
          fen: string;
          pgn: string;
          white_wins: number;
          draws: number;
          black_wins: number;
          total_games: number;
          popularity: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          eco: string;
          name: string;
          variation?: string | null;
          fen: string;
          pgn: string;
          white_wins?: number;
          draws?: number;
          black_wins?: number;
          total_games?: number;
          popularity?: number;
          created_at?: string;
        };
        Update: {
          white_wins?: number;
          draws?: number;
          black_wins?: number;
          total_games?: number;
          popularity?: number;
        };
      };

      tournaments: {
        Row: {
          id: string;
          name: string;
          description: string | null;
          type: TournamentType;
          time_control: TimeControlType;
          time_limit: number;
          time_increment: number;
          start_time: string;
          duration: number | null;
          min_rating: number | null;
          max_rating: number | null;
          max_players: number | null;
          status: TournamentStatus;
          created_by: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          description?: string | null;
          type: TournamentType;
          time_control: TimeControlType;
          time_limit: number;
          time_increment: number;
          start_time: string;
          duration?: number | null;
          min_rating?: number | null;
          max_rating?: number | null;
          max_players?: number | null;
          status?: TournamentStatus;
          created_by?: string | null;
          created_at?: string;
        };
        Update: {
          name?: string;
          description?: string | null;
          start_time?: string;
          duration?: number | null;
          max_players?: number | null;
          status?: TournamentStatus;
        };
      };

      tournament_participants: {
        Row: {
          id: string;
          tournament_id: string;
          user_id: string;
          score: number;
          games_played: number;
          wins: number;
          draws: number;
          losses: number;
          joined_at: string;
        };
        Insert: {
          id?: string;
          tournament_id: string;
          user_id: string;
          score?: number;
          games_played?: number;
          wins?: number;
          draws?: number;
          losses?: number;
          joined_at?: string;
        };
        Update: {
          score?: number;
          games_played?: number;
          wins?: number;
          draws?: number;
          losses?: number;
        };
      };
    };
    Views: {};
    Functions: {};
    Enums: {
      game_status: GameStatus;
      game_winner: GameWinner;
      game_end_reason: GameEndReason;
      time_control_type: TimeControlType;
      move_classification: MoveClassification;
      tournament_type: TournamentType;
      tournament_status: TournamentStatus;
    };
  };
}

// Helper types for common queries
export type User = Database['public']['Tables']['users']['Row'];
export type Game = Database['public']['Tables']['games']['Row'];
export type Move = Database['public']['Tables']['moves']['Row'];
export type GameAnalysis = Database['public']['Tables']['game_analysis']['Row'];
export type Puzzle = Database['public']['Tables']['puzzles']['Row'];
export type Opening = Database['public']['Tables']['openings']['Row'];
export type Tournament = Database['public']['Tables']['tournaments']['Row'];

// Game with relations
export type GameWithPlayers = Game & {
  white_player: User | null;
  black_player: User | null;
};

export type GameWithMoves = Game & {
  moves: Move[];
};

export type GameFull = Game & {
  white_player: User | null;
  black_player: User | null;
  moves: Move[];
};

// Realtime payload types
export type RealtimeGameUpdate = {
  eventType: 'UPDATE';
  new: Game;
  old: Game;
};

export type RealtimeMoveInsert = {
  eventType: 'INSERT';
  new: Move;
};

// Broadcast payloads
export type ClockTickPayload = {
  whiteTime: number;
  blackTime: number;
  activePlayer: 'white' | 'black';
};

export type DrawOfferPayload = {
  offeredBy: 'white' | 'black';
};
