-- =====================================================
-- Chess Telegram Mini App - Initial Schema
-- Supabase Migration
-- =====================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- USERS TABLE
-- =====================================================
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  telegram_id BIGINT UNIQUE NOT NULL,
  username TEXT,
  first_name TEXT,
  last_name TEXT,

  -- Avatar
  avatar_url TEXT,

  -- Glicko-2 Ratings (по временному контролю)
  bullet_rating INT DEFAULT 1500,
  bullet_rd DECIMAL(10,2) DEFAULT 350.0,
  bullet_volatility DECIMAL(10,6) DEFAULT 0.06,

  blitz_rating INT DEFAULT 1500,
  blitz_rd DECIMAL(10,2) DEFAULT 350.0,
  blitz_volatility DECIMAL(10,6) DEFAULT 0.06,

  rapid_rating INT DEFAULT 1500,
  rapid_rd DECIMAL(10,2) DEFAULT 350.0,
  rapid_volatility DECIMAL(10,6) DEFAULT 0.06,

  classical_rating INT DEFAULT 1500,
  classical_rd DECIMAL(10,2) DEFAULT 350.0,
  classical_volatility DECIMAL(10,6) DEFAULT 0.06,

  -- AI ratings (отдельно)
  ai_rating INT DEFAULT 1500,
  ai_rd DECIMAL(10,2) DEFAULT 350.0,

  -- Puzzle rating
  puzzle_rating INT DEFAULT 1500,
  puzzle_rd DECIMAL(10,2) DEFAULT 350.0,

  -- Statistics
  games_played INT DEFAULT 0,
  games_won INT DEFAULT 0,
  games_drawn INT DEFAULT 0,
  games_lost INT DEFAULT 0,

  puzzles_solved INT DEFAULT 0,
  puzzles_failed INT DEFAULT 0,

  -- Preferences
  preferred_time_control TEXT DEFAULT 'blitz',
  language TEXT DEFAULT 'ru',

  last_seen_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for users
CREATE INDEX idx_users_telegram_id ON users(telegram_id);
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_blitz_rating ON users(blitz_rating DESC);
CREATE INDEX idx_users_puzzle_rating ON users(puzzle_rating DESC);

-- =====================================================
-- GAMES TABLE
-- =====================================================
CREATE TYPE game_status AS ENUM ('waiting', 'active', 'finished', 'aborted');
CREATE TYPE game_winner AS ENUM ('white', 'black', 'draw');
CREATE TYPE game_end_reason AS ENUM (
  'checkmate',
  'resignation',
  'timeout',
  'draw_agreement',
  'stalemate',
  'insufficient_material',
  'threefold_repetition',
  'fifty_move_rule',
  'aborted'
);
CREATE TYPE time_control_type AS ENUM ('bullet', 'blitz', 'rapid', 'classical', 'unlimited');

CREATE TABLE games (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Players
  white_player_id UUID REFERENCES users(id) ON DELETE CASCADE,
  black_player_id UUID REFERENCES users(id) ON DELETE CASCADE,

  -- Game state
  status game_status DEFAULT 'waiting',
  winner game_winner,
  end_reason game_end_reason,

  -- Chess position
  fen TEXT NOT NULL DEFAULT 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
  pgn TEXT,
  move_number INT DEFAULT 0,

  -- Time control
  time_control time_control_type NOT NULL DEFAULT 'blitz',
  time_limit INT NOT NULL, -- seconds
  time_increment INT NOT NULL DEFAULT 0, -- seconds per move

  white_time_remaining INT, -- milliseconds
  black_time_remaining INT, -- milliseconds

  -- Ratings (before game)
  white_rating_before INT,
  black_rating_before INT,
  white_rating_after INT,
  black_rating_after INT,

  -- Flags
  is_rated BOOLEAN DEFAULT TRUE,
  is_public BOOLEAN DEFAULT TRUE,
  is_ai_game BOOLEAN DEFAULT FALSE,

  -- Invite link
  invite_code TEXT UNIQUE,

  -- Draw offers
  white_offered_draw BOOLEAN DEFAULT FALSE,
  black_offered_draw BOOLEAN DEFAULT FALSE,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  started_at TIMESTAMPTZ,
  finished_at TIMESTAMPTZ,
  last_move_at TIMESTAMPTZ,

  -- Ensure at least one player
  CONSTRAINT at_least_one_player CHECK (
    white_player_id IS NOT NULL OR black_player_id IS NOT NULL
  )
);

-- Indexes for games
CREATE INDEX idx_games_white_player ON games(white_player_id);
CREATE INDEX idx_games_black_player ON games(black_player_id);
CREATE INDEX idx_games_status ON games(status);
CREATE INDEX idx_games_invite_code ON games(invite_code) WHERE invite_code IS NOT NULL;
CREATE INDEX idx_games_created_at ON games(created_at DESC);
CREATE INDEX idx_games_active ON games(status, created_at) WHERE status IN ('waiting', 'active');

-- =====================================================
-- MOVES TABLE
-- =====================================================
CREATE TABLE moves (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  game_id UUID NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Move details
  move_number INT NOT NULL,

  -- Notation
  uci TEXT NOT NULL, -- e2e4, e7e5q (with promotion)
  san TEXT NOT NULL, -- e4, Nf3, O-O, e8=Q

  -- Position after move
  fen TEXT NOT NULL,

  -- Timing
  time_spent INT, -- milliseconds spent thinking
  clock_time INT, -- remaining time after move (milliseconds)

  -- Evaluation (optional, from analysis)
  evaluation INT, -- centipawns

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for moves
CREATE INDEX idx_moves_game_id ON moves(game_id, move_number);
CREATE INDEX idx_moves_user_id ON moves(user_id);
CREATE INDEX idx_moves_created_at ON moves(created_at DESC);

-- =====================================================
-- GAME ANALYSIS TABLE
-- =====================================================
CREATE TYPE move_classification AS ENUM ('best', 'excellent', 'good', 'inaccuracy', 'mistake', 'blunder', 'missed_win');

CREATE TABLE game_analysis (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  game_id UUID NOT NULL REFERENCES games(id) ON DELETE CASCADE,

  -- Analysis metadata
  engine TEXT NOT NULL DEFAULT 'stockfish',
  depth INT NOT NULL,

  -- Summary statistics
  white_accuracy DECIMAL(5,2), -- percentage
  black_accuracy DECIMAL(5,2),

  white_blunders INT DEFAULT 0,
  white_mistakes INT DEFAULT 0,
  white_inaccuracies INT DEFAULT 0,

  black_blunders INT DEFAULT 0,
  black_mistakes INT DEFAULT 0,
  black_inaccuracies INT DEFAULT 0,

  -- Opening
  opening_eco TEXT,
  opening_name TEXT,

  -- Full analysis (JSONB for flexibility)
  analysis JSONB, -- Array of move analysis objects

  completed_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for analysis
CREATE INDEX idx_analysis_game_id ON game_analysis(game_id);
CREATE INDEX idx_analysis_completed ON game_analysis(completed_at DESC);

-- =====================================================
-- PUZZLES TABLE
-- =====================================================
CREATE TABLE puzzles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Puzzle position
  fen TEXT NOT NULL,

  -- Solution
  moves TEXT NOT NULL, -- UCI moves separated by spaces

  -- Difficulty
  rating INT NOT NULL,
  rating_deviation DECIMAL(10,2) DEFAULT 350.0,

  -- Themes (tags)
  themes TEXT[] DEFAULT '{}',

  -- Metadata
  game_url TEXT, -- Source game if from Lichess DB
  popularity INT DEFAULT 0,

  -- Statistics
  attempts INT DEFAULT 0,
  solved INT DEFAULT 0,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for puzzles
CREATE INDEX idx_puzzles_rating ON puzzles(rating);
CREATE INDEX idx_puzzles_themes ON puzzles USING GIN(themes);

-- =====================================================
-- USER PUZZLE ATTEMPTS TABLE
-- =====================================================
CREATE TABLE user_puzzle_attempts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  puzzle_id UUID NOT NULL REFERENCES puzzles(id) ON DELETE CASCADE,

  solved BOOLEAN NOT NULL,
  time_spent INT, -- milliseconds
  attempts INT DEFAULT 1,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for puzzle attempts
CREATE INDEX idx_puzzle_attempts_user ON user_puzzle_attempts(user_id, created_at DESC);
CREATE INDEX idx_puzzle_attempts_puzzle ON user_puzzle_attempts(puzzle_id);

-- =====================================================
-- OPENINGS TABLE
-- =====================================================
CREATE TABLE openings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  eco TEXT NOT NULL, -- E00, B01, etc.
  name TEXT NOT NULL,
  variation TEXT,

  fen TEXT UNIQUE NOT NULL,
  pgn TEXT NOT NULL,

  -- Statistics from master games
  white_wins INT DEFAULT 0,
  draws INT DEFAULT 0,
  black_wins INT DEFAULT 0,
  total_games INT DEFAULT 0,

  popularity INT DEFAULT 0,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for openings
CREATE INDEX idx_openings_eco ON openings(eco);
CREATE INDEX idx_openings_name ON openings(name);
CREATE INDEX idx_openings_fen ON openings(fen);

-- Full-text search on opening names
CREATE INDEX idx_openings_name_fts ON openings USING GIN(to_tsvector('english', name || ' ' || COALESCE(variation, '')));

-- =====================================================
-- TOURNAMENTS TABLE
-- =====================================================
CREATE TYPE tournament_type AS ENUM ('arena', 'swiss', 'knockout');
CREATE TYPE tournament_status AS ENUM ('upcoming', 'active', 'finished', 'cancelled');

CREATE TABLE tournaments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  name TEXT NOT NULL,
  description TEXT,
  type tournament_type NOT NULL,

  -- Time control
  time_control time_control_type NOT NULL,
  time_limit INT NOT NULL,
  time_increment INT NOT NULL,

  -- Scheduling
  start_time TIMESTAMPTZ NOT NULL,
  duration INT, -- minutes (for arena)

  -- Entry requirements
  min_rating INT,
  max_rating INT,
  max_players INT,

  status tournament_status DEFAULT 'upcoming',

  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for tournaments
CREATE INDEX idx_tournaments_status ON tournaments(status, start_time);
CREATE INDEX idx_tournaments_start_time ON tournaments(start_time);

-- =====================================================
-- TOURNAMENT PARTICIPANTS TABLE
-- =====================================================
CREATE TABLE tournament_participants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tournament_id UUID NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  score INT DEFAULT 0,
  games_played INT DEFAULT 0,
  wins INT DEFAULT 0,
  draws INT DEFAULT 0,
  losses INT DEFAULT 0,

  joined_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(tournament_id, user_id)
);

-- Indexes for tournament participants
CREATE INDEX idx_tournament_participants_tournament ON tournament_participants(tournament_id, score DESC);
CREATE INDEX idx_tournament_participants_user ON tournament_participants(user_id);

-- =====================================================
-- FUNCTIONS
-- =====================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for users table
CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Function to calculate time control category
CREATE OR REPLACE FUNCTION get_time_control_category(time_limit INT, time_increment INT)
RETURNS time_control_type AS $$
DECLARE
  total_time INT;
BEGIN
  total_time := time_limit + (40 * time_increment); -- Estimate 40 moves

  IF total_time < 180 THEN
    RETURN 'bullet';
  ELSIF total_time < 600 THEN
    RETURN 'blitz';
  ELSIF total_time < 1800 THEN
    RETURN 'rapid';
  ELSE
    RETURN 'classical';
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Function to update game statistics after game ends
CREATE OR REPLACE FUNCTION update_game_statistics()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'finished' AND OLD.status != 'finished' THEN
    -- Update white player statistics
    UPDATE users
    SET
      games_played = games_played + 1,
      games_won = games_won + CASE WHEN NEW.winner = 'white' THEN 1 ELSE 0 END,
      games_drawn = games_drawn + CASE WHEN NEW.winner = 'draw' THEN 1 ELSE 0 END,
      games_lost = games_lost + CASE WHEN NEW.winner = 'black' THEN 1 ELSE 0 END
    WHERE id = NEW.white_player_id;

    -- Update black player statistics
    IF NEW.black_player_id IS NOT NULL THEN
      UPDATE users
      SET
        games_played = games_played + 1,
        games_won = games_won + CASE WHEN NEW.winner = 'black' THEN 1 ELSE 0 END,
        games_drawn = games_drawn + CASE WHEN NEW.winner = 'draw' THEN 1 ELSE 0 END,
        games_lost = games_lost + CASE WHEN NEW.winner = 'white' THEN 1 ELSE 0 END
      WHERE id = NEW.black_player_id;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update statistics
CREATE TRIGGER update_game_stats_trigger
  AFTER UPDATE ON games
  FOR EACH ROW
  EXECUTE FUNCTION update_game_statistics();

-- =====================================================
-- ENABLE REALTIME
-- =====================================================

-- Enable realtime for games table (moves, status changes)
ALTER PUBLICATION supabase_realtime ADD TABLE games;
ALTER PUBLICATION supabase_realtime ADD TABLE moves;
ALTER PUBLICATION supabase_realtime ADD TABLE tournament_participants;

-- =====================================================
-- COMMENTS
-- =====================================================

COMMENT ON TABLE users IS 'User profiles with Glicko-2 ratings for different time controls';
COMMENT ON TABLE games IS 'Chess games with full state, time control, and ratings';
COMMENT ON TABLE moves IS 'Individual moves in games with timing and notation';
COMMENT ON TABLE game_analysis IS 'Computer analysis of finished games';
COMMENT ON TABLE puzzles IS 'Tactical puzzles with difficulty ratings';
COMMENT ON TABLE user_puzzle_attempts IS 'User attempts at solving puzzles';
COMMENT ON TABLE openings IS 'Chess opening database with ECO codes and statistics';
COMMENT ON TABLE tournaments IS 'Tournament definitions';
COMMENT ON TABLE tournament_participants IS 'Tournament participation and scores';
