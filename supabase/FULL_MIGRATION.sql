-- =====================================================
-- COMPLETE DATABASE SETUP
-- Chess Telegram Mini App - All Migrations Combined
-- Apply this in Supabase SQL Editor
-- =====================================================

-- =====================================================
-- MIGRATION 1: Initial Schema
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
-- MIGRATION 2: RLS Policies (Row Level Security)
-- =====================================================

-- USERS TABLE POLICIES
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public profiles are viewable by everyone"
  ON users FOR SELECT
  USING (true);

CREATE POLICY "Users can update own profile"
  ON users FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON users FOR INSERT
  WITH CHECK (auth.uid() = id);

-- GAMES TABLE POLICIES
ALTER TABLE games ENABLE ROW LEVEL SECURITY;

CREATE POLICY "View public and finished games"
  ON games FOR SELECT
  USING (
    is_public = true
    OR status = 'finished'
    OR auth.uid() IN (white_player_id, black_player_id)
  );

CREATE POLICY "Anyone can create games"
  ON games FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Players can update their games"
  ON games FOR UPDATE
  USING (
    auth.uid() IN (white_player_id, black_player_id)
  )
  WITH CHECK (
    auth.uid() IN (white_player_id, black_player_id)
  );

CREATE POLICY "Players can delete waiting games"
  ON games FOR DELETE
  USING (
    auth.uid() IN (white_player_id, black_player_id)
    AND status = 'waiting'
  );

-- MOVES TABLE POLICIES
ALTER TABLE moves ENABLE ROW LEVEL SECURITY;

CREATE POLICY "View moves from accessible games"
  ON moves FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM games g
      WHERE g.id = moves.game_id
      AND (
        g.is_public = true
        OR g.status = 'finished'
        OR auth.uid() IN (g.white_player_id, g.black_player_id)
      )
    )
  );

CREATE POLICY "Players can insert moves on their turn"
  ON moves FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM games g
      WHERE g.id = game_id
      AND g.status = 'active'
      AND (
        -- White's turn (even move number)
        (auth.uid() = g.white_player_id AND g.move_number % 2 = 0)
        OR
        -- Black's turn (odd move number)
        (auth.uid() = g.black_player_id AND g.move_number % 2 = 1)
      )
    )
  );

-- GAME ANALYSIS TABLE POLICIES
ALTER TABLE game_analysis ENABLE ROW LEVEL SECURITY;

CREATE POLICY "View analysis of own games"
  ON game_analysis FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM games g
      WHERE g.id = game_analysis.game_id
      AND (
        auth.uid() IN (g.white_player_id, g.black_player_id)
        OR g.is_public = true
      )
    )
  );

-- PUZZLES TABLE POLICIES
ALTER TABLE puzzles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Puzzles are viewable by everyone"
  ON puzzles FOR SELECT
  USING (true);

-- USER PUZZLE ATTEMPTS TABLE POLICIES
ALTER TABLE user_puzzle_attempts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own puzzle attempts"
  ON user_puzzle_attempts FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own puzzle attempts"
  ON user_puzzle_attempts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- OPENINGS TABLE POLICIES
ALTER TABLE openings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Openings are viewable by everyone"
  ON openings FOR SELECT
  USING (true);

-- TOURNAMENTS TABLE POLICIES
ALTER TABLE tournaments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tournaments are viewable by everyone"
  ON tournaments FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can create tournaments"
  ON tournaments FOR INSERT
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Creators can update own tournaments"
  ON tournaments FOR UPDATE
  USING (auth.uid() = created_by);

CREATE POLICY "Creators can delete upcoming tournaments"
  ON tournaments FOR DELETE
  USING (
    auth.uid() = created_by
    AND status = 'upcoming'
  );

-- TOURNAMENT PARTICIPANTS TABLE POLICIES
ALTER TABLE tournament_participants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tournament participants are viewable"
  ON tournament_participants FOR SELECT
  USING (true);

CREATE POLICY "Users can join tournaments"
  ON tournament_participants FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM tournaments t
      WHERE t.id = tournament_id
      AND t.status = 'upcoming'
      AND (t.min_rating IS NULL OR (
        SELECT CASE
          WHEN t.time_control = 'bullet' THEN bullet_rating
          WHEN t.time_control = 'blitz' THEN blitz_rating
          WHEN t.time_control = 'rapid' THEN rapid_rating
          WHEN t.time_control = 'classical' THEN classical_rating
          ELSE 1500
        END FROM users WHERE id = auth.uid()
      ) >= t.min_rating)
      AND (t.max_rating IS NULL OR (
        SELECT CASE
          WHEN t.time_control = 'bullet' THEN bullet_rating
          WHEN t.time_control = 'blitz' THEN blitz_rating
          WHEN t.time_control = 'rapid' THEN rapid_rating
          WHEN t.time_control = 'classical' THEN classical_rating
          ELSE 1500
        END FROM users WHERE id = auth.uid()
      ) <= t.max_rating)
      AND (t.max_players IS NULL OR (
        SELECT COUNT(*) FROM tournament_participants tp
        WHERE tp.tournament_id = t.id
      ) < t.max_players)
    )
  );

CREATE POLICY "Users can leave upcoming tournaments"
  ON tournament_participants FOR DELETE
  USING (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM tournaments t
      WHERE t.id = tournament_id
      AND t.status = 'upcoming'
    )
  );

-- Helper Functions
CREATE OR REPLACE FUNCTION is_game_participant(game_uuid UUID, user_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM games
    WHERE id = game_uuid
    AND (white_player_id = user_uuid OR black_player_id = user_uuid)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION is_user_turn(game_uuid UUID, user_uuid UUID)
RETURNS BOOLEAN AS $$
DECLARE
  game_record RECORD;
BEGIN
  SELECT * INTO game_record FROM games WHERE id = game_uuid;

  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;

  IF game_record.status != 'active' THEN
    RETURN FALSE;
  END IF;

  IF game_record.move_number % 2 = 0 AND game_record.white_player_id = user_uuid THEN
    RETURN TRUE;
  END IF;

  IF game_record.move_number % 2 = 1 AND game_record.black_player_id = user_uuid THEN
    RETURN TRUE;
  END IF;

  RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Constraints and triggers
CREATE OR REPLACE FUNCTION check_move_sequence()
RETURNS TRIGGER AS $$
DECLARE
  expected_move_number INT;
BEGIN
  SELECT move_number INTO expected_move_number
  FROM games
  WHERE id = NEW.game_id;

  IF NEW.move_number != expected_move_number + 1 THEN
    RAISE EXCEPTION 'Invalid move number. Expected %, got %', expected_move_number + 1, NEW.move_number;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER enforce_move_sequence
  BEFORE INSERT ON moves
  FOR EACH ROW
  EXECUTE FUNCTION check_move_sequence();

CREATE OR REPLACE FUNCTION prevent_finished_game_modification()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.status = 'finished' AND NEW.status != 'finished' THEN
    RAISE EXCEPTION 'Cannot modify finished game';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER prevent_finished_game_changes
  BEFORE UPDATE ON games
  FOR EACH ROW
  EXECUTE FUNCTION prevent_finished_game_modification();

-- =====================================================
-- MIGRATION 3: Tournament Enhancements
-- =====================================================

-- Tournament games link table
CREATE TABLE tournament_games (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tournament_id UUID NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
  game_id UUID NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  round_number INT,
  board_number INT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tournament_id, game_id)
);

CREATE INDEX idx_tournament_games_tournament ON tournament_games(tournament_id, round_number);
CREATE INDEX idx_tournament_games_game ON tournament_games(game_id);

-- Tournament rounds
CREATE TYPE round_status AS ENUM ('upcoming', 'active', 'finished');

CREATE TABLE tournament_rounds (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tournament_id UUID NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
  round_number INT NOT NULL,
  status round_status DEFAULT 'upcoming',
  started_at TIMESTAMPTZ,
  finished_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tournament_id, round_number)
);

CREATE INDEX idx_tournament_rounds_tournament ON tournament_rounds(tournament_id, round_number);
CREATE INDEX idx_tournament_rounds_status ON tournament_rounds(status);

-- Tournament pairings
CREATE TABLE tournament_pairings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tournament_id UUID NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
  round_id UUID REFERENCES tournament_rounds(id) ON DELETE CASCADE,
  white_player_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  black_player_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  game_id UUID REFERENCES games(id) ON DELETE SET NULL,
  board_number INT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tournament_id, round_id, white_player_id),
  UNIQUE(tournament_id, round_id, black_player_id)
);

CREATE INDEX idx_tournament_pairings_tournament ON tournament_pairings(tournament_id, round_id);
CREATE INDEX idx_tournament_pairings_white ON tournament_pairings(white_player_id);
CREATE INDEX idx_tournament_pairings_black ON tournament_pairings(black_player_id);

-- Extended tournament fields
ALTER TABLE tournaments ADD COLUMN rounds INT DEFAULT 5;
ALTER TABLE tournaments ADD COLUMN current_round INT DEFAULT 0;
ALTER TABLE tournaments ADD COLUMN points_for_win INT DEFAULT 2;
ALTER TABLE tournaments ADD COLUMN points_for_draw INT DEFAULT 1;
ALTER TABLE tournaments ADD COLUMN points_for_loss INT DEFAULT 0;
ALTER TABLE tournaments ADD COLUMN berserk_allowed BOOLEAN DEFAULT FALSE;

CREATE TYPE pairing_algorithm AS ENUM ('dutch', 'burstein', 'random');
ALTER TABLE tournaments ADD COLUMN pairing_method pairing_algorithm DEFAULT 'dutch';

-- Extended participant fields
ALTER TABLE tournament_participants ADD COLUMN performance_rating INT;
ALTER TABLE tournament_participants ADD COLUMN buchholz DECIMAL(10,2) DEFAULT 0;
ALTER TABLE tournament_participants ADD COLUMN median_buchholz DECIMAL(10,2) DEFAULT 0;
ALTER TABLE tournament_participants ADD COLUMN sonnborn_berger DECIMAL(10,2) DEFAULT 0;
ALTER TABLE tournament_participants ADD COLUMN games_as_white INT DEFAULT 0;
ALTER TABLE tournament_participants ADD COLUMN games_as_black INT DEFAULT 0;

-- Tournament statistics function
CREATE OR REPLACE FUNCTION update_tournament_participant_stats()
RETURNS TRIGGER AS $$
DECLARE
  t_id UUID;
  white_score INT;
  black_score INT;
  t_points_win INT;
  t_points_draw INT;
  t_points_loss INT;
BEGIN
  IF NEW.status != 'finished' OR OLD.status = 'finished' THEN
    RETURN NEW;
  END IF;

  SELECT tournament_id INTO t_id
  FROM tournament_games
  WHERE game_id = NEW.id
  LIMIT 1;

  IF t_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT points_for_win, points_for_draw, points_for_loss
  INTO t_points_win, t_points_draw, t_points_loss
  FROM tournaments
  WHERE id = t_id;

  IF NEW.winner = 'white' THEN
    white_score := t_points_win;
    black_score := t_points_loss;
  ELSIF NEW.winner = 'black' THEN
    white_score := t_points_loss;
    black_score := t_points_win;
  ELSE
    white_score := t_points_draw;
    black_score := t_points_draw;
  END IF;

  UPDATE tournament_participants
  SET
    score = score + white_score,
    games_played = games_played + 1,
    wins = wins + CASE WHEN NEW.winner = 'white' THEN 1 ELSE 0 END,
    draws = draws + CASE WHEN NEW.winner = 'draw' THEN 1 ELSE 0 END,
    losses = losses + CASE WHEN NEW.winner = 'black' THEN 1 ELSE 0 END,
    games_as_white = games_as_white + 1
  WHERE tournament_id = t_id AND user_id = NEW.white_player_id;

  IF NEW.black_player_id IS NOT NULL THEN
    UPDATE tournament_participants
    SET
      score = score + black_score,
      games_played = games_played + 1,
      wins = wins + CASE WHEN NEW.winner = 'black' THEN 1 ELSE 0 END,
      draws = draws + CASE WHEN NEW.winner = 'draw' THEN 1 ELSE 0 END,
      losses = losses + CASE WHEN NEW.winner = 'white' THEN 1 ELSE 0 END,
      games_as_black = games_as_black + 1
    WHERE tournament_id = t_id AND user_id = NEW.black_player_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_tournament_stats_trigger
  AFTER UPDATE ON games
  FOR EACH ROW
  EXECUTE FUNCTION update_tournament_participant_stats();

-- Calculate Buchholz
CREATE OR REPLACE FUNCTION calculate_buchholz(p_tournament_id UUID, p_user_id UUID)
RETURNS DECIMAL AS $$
DECLARE
  total_score DECIMAL := 0;
  opponent_id UUID;
  opponent_score DECIMAL;
BEGIN
  FOR opponent_id IN
    SELECT DISTINCT
      CASE
        WHEN g.white_player_id = p_user_id THEN g.black_player_id
        ELSE g.white_player_id
      END as opponent
    FROM games g
    INNER JOIN tournament_games tg ON tg.game_id = g.id
    WHERE tg.tournament_id = p_tournament_id
      AND (g.white_player_id = p_user_id OR g.black_player_id = p_user_id)
      AND g.status = 'finished'
  LOOP
    SELECT score INTO opponent_score
    FROM tournament_participants
    WHERE tournament_id = p_tournament_id AND user_id = opponent_id;

    total_score := total_score + COALESCE(opponent_score, 0);
  END LOOP;

  RETURN total_score;
END;
$$ LANGUAGE plpgsql;

-- Swiss pairing generation
CREATE OR REPLACE FUNCTION generate_swiss_pairings(p_tournament_id UUID, p_round_number INT)
RETURNS TABLE(
  white_id UUID,
  black_id UUID,
  board_num INT
) AS $$
DECLARE
  participant RECORD;
  paired_users UUID[] := '{}';
  current_board INT := 1;
  player1_id UUID;
  player2_id UUID;
  player1_whites INT;
  player1_blacks INT;
BEGIN
  FOR participant IN
    SELECT tp.user_id, tp.score, tp.games_as_white, tp.games_as_black,
           u.blitz_rating
    FROM tournament_participants tp
    JOIN users u ON u.id = tp.user_id
    WHERE tp.tournament_id = p_tournament_id
    ORDER BY tp.score DESC, u.blitz_rating DESC
  LOOP
    IF participant.user_id = ANY(paired_users) THEN
      CONTINUE;
    END IF;

    IF player1_id IS NULL THEN
      player1_id := participant.user_id;
      player1_whites := participant.games_as_white;
      player1_blacks := participant.games_as_black;
      CONTINUE;
    END IF;

    player2_id := participant.user_id;

    IF player1_whites > player1_blacks THEN
      white_id := player2_id;
      black_id := player1_id;
    ELSE
      white_id := player1_id;
      black_id := player2_id;
    END IF;

    board_num := current_board;
    current_board := current_board + 1;

    paired_users := array_append(paired_users, player1_id);
    paired_users := array_append(paired_users, player2_id);

    player1_id := NULL;
    player2_id := NULL;

    RETURN NEXT;
  END LOOP;

  RETURN;
END;
$$ LANGUAGE plpgsql;

-- RLS for new tables
ALTER TABLE tournament_games ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Tournament games viewable by everyone" ON tournament_games FOR SELECT USING (true);
CREATE POLICY "System can manage tournament games" ON tournament_games FOR ALL USING (false);

ALTER TABLE tournament_rounds ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Tournament rounds viewable by everyone" ON tournament_rounds FOR SELECT USING (true);
CREATE POLICY "System can manage rounds" ON tournament_rounds FOR ALL USING (false);

ALTER TABLE tournament_pairings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Tournament pairings viewable by everyone" ON tournament_pairings FOR SELECT USING (true);
CREATE POLICY "System can manage pairings" ON tournament_pairings FOR ALL USING (false);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE tournament_games;
ALTER PUBLICATION supabase_realtime ADD TABLE tournament_rounds;
ALTER PUBLICATION supabase_realtime ADD TABLE tournament_pairings;

-- =====================================================
-- DONE! Database setup complete.
-- =====================================================

SELECT 'Database setup complete! ✓' as message;
