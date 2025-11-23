-- =====================================================
-- Tournament System Enhancements
-- Adds: rounds, pairings, tournament games tracking
-- =====================================================

-- =====================================================
-- TOURNAMENT GAMES (link games to tournaments)
-- =====================================================
CREATE TABLE tournament_games (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tournament_id UUID NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
  game_id UUID NOT NULL REFERENCES games(id) ON DELETE CASCADE,

  -- Round information (for Swiss/Knockout)
  round_number INT,
  board_number INT, -- Position in standings

  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(tournament_id, game_id)
);

CREATE INDEX idx_tournament_games_tournament ON tournament_games(tournament_id, round_number);
CREATE INDEX idx_tournament_games_game ON tournament_games(game_id);

-- =====================================================
-- TOURNAMENT ROUNDS (for Swiss system)
-- =====================================================
CREATE TYPE round_status AS ENUM ('upcoming', 'active', 'finished');

CREATE TABLE tournament_rounds (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tournament_id UUID NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,

  round_number INT NOT NULL,
  status round_status DEFAULT 'upcoming',

  -- Timing
  started_at TIMESTAMPTZ,
  finished_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(tournament_id, round_number)
);

CREATE INDEX idx_tournament_rounds_tournament ON tournament_rounds(tournament_id, round_number);
CREATE INDEX idx_tournament_rounds_status ON tournament_rounds(status);

-- =====================================================
-- TOURNAMENT PAIRINGS
-- =====================================================
CREATE TABLE tournament_pairings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tournament_id UUID NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
  round_id UUID REFERENCES tournament_rounds(id) ON DELETE CASCADE,

  white_player_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  black_player_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  game_id UUID REFERENCES games(id) ON DELETE SET NULL,

  -- Pairing metadata
  board_number INT,

  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(tournament_id, round_id, white_player_id),
  UNIQUE(tournament_id, round_id, black_player_id)
);

CREATE INDEX idx_tournament_pairings_tournament ON tournament_pairings(tournament_id, round_id);
CREATE INDEX idx_tournament_pairings_white ON tournament_pairings(white_player_id);
CREATE INDEX idx_tournament_pairings_black ON tournament_pairings(black_player_id);

-- =====================================================
-- EXTENDED TOURNAMENT FIELDS
-- =====================================================

-- Add Swiss-specific fields
ALTER TABLE tournaments ADD COLUMN rounds INT DEFAULT 5; -- Number of Swiss rounds
ALTER TABLE tournaments ADD COLUMN current_round INT DEFAULT 0;

-- Add Arena-specific fields
ALTER TABLE tournaments ADD COLUMN points_for_win INT DEFAULT 2;
ALTER TABLE tournaments ADD COLUMN points_for_draw INT DEFAULT 1;
ALTER TABLE tournaments ADD COLUMN points_for_loss INT DEFAULT 0;
ALTER TABLE tournaments ADD COLUMN berserk_allowed BOOLEAN DEFAULT FALSE; -- Arena feature

-- Add pairing algorithm preference
CREATE TYPE pairing_algorithm AS ENUM ('dutch', 'burstein', 'random');
ALTER TABLE tournaments ADD COLUMN pairing_method pairing_algorithm DEFAULT 'dutch';

-- =====================================================
-- TOURNAMENT STATISTICS EXTENSION
-- =====================================================

-- Add performance metrics to participants
ALTER TABLE tournament_participants ADD COLUMN performance_rating INT;
ALTER TABLE tournament_participants ADD COLUMN buchholz DECIMAL(10,2) DEFAULT 0; -- Swiss tiebreak
ALTER TABLE tournament_participants ADD COLUMN median_buchholz DECIMAL(10,2) DEFAULT 0;
ALTER TABLE tournament_participants ADD COLUMN sonnborn_berger DECIMAL(10,2) DEFAULT 0;

-- Add color balance tracking
ALTER TABLE tournament_participants ADD COLUMN games_as_white INT DEFAULT 0;
ALTER TABLE tournament_participants ADD COLUMN games_as_black INT DEFAULT 0;

-- =====================================================
-- FUNCTIONS FOR TOURNAMENT MANAGEMENT
-- =====================================================

-- Function to update tournament participant stats after game
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
  -- Only process finished games
  IF NEW.status != 'finished' OR OLD.status = 'finished' THEN
    RETURN NEW;
  END IF;

  -- Check if this is a tournament game
  SELECT tournament_id INTO t_id
  FROM tournament_games
  WHERE game_id = NEW.id
  LIMIT 1;

  IF t_id IS NULL THEN
    RETURN NEW; -- Not a tournament game
  END IF;

  -- Get tournament scoring system
  SELECT points_for_win, points_for_draw, points_for_loss
  INTO t_points_win, t_points_draw, t_points_loss
  FROM tournaments
  WHERE id = t_id;

  -- Calculate scores
  IF NEW.winner = 'white' THEN
    white_score := t_points_win;
    black_score := t_points_loss;
  ELSIF NEW.winner = 'black' THEN
    white_score := t_points_loss;
    black_score := t_points_win;
  ELSE -- draw
    white_score := t_points_draw;
    black_score := t_points_draw;
  END IF;

  -- Update white player stats
  UPDATE tournament_participants
  SET
    score = score + white_score,
    games_played = games_played + 1,
    wins = wins + CASE WHEN NEW.winner = 'white' THEN 1 ELSE 0 END,
    draws = draws + CASE WHEN NEW.winner = 'draw' THEN 1 ELSE 0 END,
    losses = losses + CASE WHEN NEW.winner = 'black' THEN 1 ELSE 0 END,
    games_as_white = games_as_white + 1
  WHERE tournament_id = t_id AND user_id = NEW.white_player_id;

  -- Update black player stats
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

-- Trigger to update tournament stats
CREATE TRIGGER update_tournament_stats_trigger
  AFTER UPDATE ON games
  FOR EACH ROW
  EXECUTE FUNCTION update_tournament_participant_stats();

-- =====================================================
-- Function to calculate Buchholz (Swiss tiebreak)
-- =====================================================
CREATE OR REPLACE FUNCTION calculate_buchholz(p_tournament_id UUID, p_user_id UUID)
RETURNS DECIMAL AS $$
DECLARE
  total_score DECIMAL := 0;
  opponent_id UUID;
BEGIN
  -- Sum the scores of all opponents
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
    SELECT score INTO total_score
    FROM tournament_participants
    WHERE tournament_id = p_tournament_id AND user_id = opponent_id;

    total_score := total_score + COALESCE(total_score, 0);
  END LOOP;

  RETURN total_score;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- Function to get next round pairings (Dutch system)
-- =====================================================
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
BEGIN
  -- Get all participants sorted by score (desc), then rating (desc)
  FOR participant IN
    SELECT tp.user_id, tp.score, tp.games_as_white, tp.games_as_black,
           u.blitz_rating
    FROM tournament_participants tp
    JOIN users u ON u.id = tp.user_id
    WHERE tp.tournament_id = p_tournament_id
    ORDER BY tp.score DESC, u.blitz_rating DESC
  LOOP
    -- Skip if already paired
    IF participant.user_id = ANY(paired_users) THEN
      CONTINUE;
    END IF;

    -- Store first unpaired player
    IF player1_id IS NULL THEN
      player1_id := participant.user_id;
      CONTINUE;
    END IF;

    -- Found a pair
    player2_id := participant.user_id;

    -- Color assignment: give white to player with fewer whites
    IF participant.games_as_white > participant.games_as_black THEN
      -- player2 has more whites, swap
      white_id := player2_id;
      black_id := player1_id;
    ELSE
      white_id := player1_id;
      black_id := player2_id;
    END IF;

    board_num := current_board;
    current_board := current_board + 1;

    -- Mark as paired
    paired_users := array_append(paired_users, player1_id);
    paired_users := array_append(paired_users, player2_id);

    -- Reset for next pair
    player1_id := NULL;
    player2_id := NULL;

    RETURN NEXT;
  END LOOP;

  -- If odd number of players, player1_id will have a bye
  -- Handle bye logic here if needed

  RETURN;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- RLS POLICIES FOR NEW TABLES
-- =====================================================

-- Tournament games
ALTER TABLE tournament_games ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tournament games viewable by everyone"
  ON tournament_games FOR SELECT
  USING (true);

CREATE POLICY "System can manage tournament games"
  ON tournament_games FOR ALL
  USING (false); -- Only service role

-- Tournament rounds
ALTER TABLE tournament_rounds ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tournament rounds viewable by everyone"
  ON tournament_rounds FOR SELECT
  USING (true);

CREATE POLICY "System can manage rounds"
  ON tournament_rounds FOR ALL
  USING (false); -- Only service role

-- Tournament pairings
ALTER TABLE tournament_pairings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tournament pairings viewable by everyone"
  ON tournament_pairings FOR SELECT
  USING (true);

CREATE POLICY "System can manage pairings"
  ON tournament_pairings FOR ALL
  USING (false); -- Only service role

-- =====================================================
-- ENABLE REALTIME
-- =====================================================

ALTER PUBLICATION supabase_realtime ADD TABLE tournament_games;
ALTER PUBLICATION supabase_realtime ADD TABLE tournament_rounds;
ALTER PUBLICATION supabase_realtime ADD TABLE tournament_pairings;

-- =====================================================
-- COMMENTS
-- =====================================================

COMMENT ON TABLE tournament_games IS 'Links games to tournaments for tracking';
COMMENT ON TABLE tournament_rounds IS 'Rounds for Swiss-style tournaments';
COMMENT ON TABLE tournament_pairings IS 'Player pairings for each round';
COMMENT ON FUNCTION generate_swiss_pairings IS 'Generates pairings for Swiss tournaments using Dutch system';
COMMENT ON FUNCTION calculate_buchholz IS 'Calculates Buchholz score for tiebreaking in Swiss tournaments';
