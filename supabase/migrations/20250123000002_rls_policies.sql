-- =====================================================
-- Row Level Security (RLS) Policies
-- Chess Telegram Mini App
-- =====================================================

-- =====================================================
-- USERS TABLE POLICIES
-- =====================================================

ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Users can view all public profiles
CREATE POLICY "Public profiles are viewable by everyone"
  ON users FOR SELECT
  USING (true);

-- Users can update only their own profile
CREATE POLICY "Users can update own profile"
  ON users FOR UPDATE
  USING (auth.uid() = id);

-- Users can insert their own profile (on signup)
CREATE POLICY "Users can insert own profile"
  ON users FOR INSERT
  WITH CHECK (auth.uid() = id);

-- =====================================================
-- GAMES TABLE POLICIES
-- =====================================================

ALTER TABLE games ENABLE ROW LEVEL SECURITY;

-- Anyone can view finished or public games
CREATE POLICY "View public and finished games"
  ON games FOR SELECT
  USING (
    is_public = true
    OR status = 'finished'
    OR auth.uid() IN (white_player_id, black_player_id)
  );

-- Anyone can create a game (for matchmaking)
CREATE POLICY "Anyone can create games"
  ON games FOR INSERT
  WITH CHECK (true);

-- Only players can update their game
CREATE POLICY "Players can update their games"
  ON games FOR UPDATE
  USING (
    auth.uid() IN (white_player_id, black_player_id)
  )
  WITH CHECK (
    auth.uid() IN (white_player_id, black_player_id)
  );

-- Only players can delete their unstarted games
CREATE POLICY "Players can delete waiting games"
  ON games FOR DELETE
  USING (
    auth.uid() IN (white_player_id, black_player_id)
    AND status = 'waiting'
  );

-- =====================================================
-- MOVES TABLE POLICIES
-- =====================================================

ALTER TABLE moves ENABLE ROW LEVEL SECURITY;

-- Anyone can view moves from their games or public games
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

-- Players can insert moves ONLY when it's their turn
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

-- No one can update or delete moves (immutable)
-- (No UPDATE or DELETE policies = denied by default)

-- =====================================================
-- GAME ANALYSIS TABLE POLICIES
-- =====================================================

ALTER TABLE game_analysis ENABLE ROW LEVEL SECURITY;

-- Anyone can view analysis of their games
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

-- Only system can insert analysis (via service role)
-- No INSERT policy for authenticated users

-- =====================================================
-- PUZZLES TABLE POLICIES
-- =====================================================

ALTER TABLE puzzles ENABLE ROW LEVEL SECURITY;

-- Everyone can view puzzles
CREATE POLICY "Puzzles are viewable by everyone"
  ON puzzles FOR SELECT
  USING (true);

-- Only admins can insert/update puzzles (via service role)
-- No INSERT/UPDATE policies for authenticated users

-- =====================================================
-- USER PUZZLE ATTEMPTS TABLE POLICIES
-- =====================================================

ALTER TABLE user_puzzle_attempts ENABLE ROW LEVEL SECURITY;

-- Users can view only their own attempts
CREATE POLICY "Users can view own puzzle attempts"
  ON user_puzzle_attempts FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own attempts
CREATE POLICY "Users can insert own puzzle attempts"
  ON user_puzzle_attempts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users cannot update or delete attempts (immutable)

-- =====================================================
-- OPENINGS TABLE POLICIES
-- =====================================================

ALTER TABLE openings ENABLE ROW LEVEL SECURITY;

-- Everyone can view openings
CREATE POLICY "Openings are viewable by everyone"
  ON openings FOR SELECT
  USING (true);

-- Only admins can modify openings (via service role)

-- =====================================================
-- TOURNAMENTS TABLE POLICIES
-- =====================================================

ALTER TABLE tournaments ENABLE ROW LEVEL SECURITY;

-- Everyone can view tournaments
CREATE POLICY "Tournaments are viewable by everyone"
  ON tournaments FOR SELECT
  USING (true);

-- Authenticated users can create tournaments
CREATE POLICY "Authenticated users can create tournaments"
  ON tournaments FOR INSERT
  WITH CHECK (auth.uid() = created_by);

-- Tournament creators can update their tournaments
CREATE POLICY "Creators can update own tournaments"
  ON tournaments FOR UPDATE
  USING (auth.uid() = created_by);

-- Tournament creators can delete their upcoming tournaments
CREATE POLICY "Creators can delete upcoming tournaments"
  ON tournaments FOR DELETE
  USING (
    auth.uid() = created_by
    AND status = 'upcoming'
  );

-- =====================================================
-- TOURNAMENT PARTICIPANTS TABLE POLICIES
-- =====================================================

ALTER TABLE tournament_participants ENABLE ROW LEVEL SECURITY;

-- Everyone can view tournament participants
CREATE POLICY "Tournament participants are viewable"
  ON tournament_participants FOR SELECT
  USING (true);

-- Users can join tournaments (insert their own participation)
CREATE POLICY "Users can join tournaments"
  ON tournament_participants FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM tournaments t
      WHERE t.id = tournament_id
      AND t.status = 'upcoming'
      -- Check rating requirements
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
      -- Check max players
      AND (t.max_players IS NULL OR (
        SELECT COUNT(*) FROM tournament_participants tp
        WHERE tp.tournament_id = t.id
      ) < t.max_players)
    )
  );

-- Users can leave tournaments before they start
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

-- Tournament system can update scores (only via service role)
-- No UPDATE policy for regular users

-- =====================================================
-- HELPER FUNCTIONS FOR RLS
-- =====================================================

-- Function to check if user is a game participant
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

-- Function to check if it's user's turn
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

  -- White's turn (even move number)
  IF game_record.move_number % 2 = 0 AND game_record.white_player_id = user_uuid THEN
    RETURN TRUE;
  END IF;

  -- Black's turn (odd move number)
  IF game_record.move_number % 2 = 1 AND game_record.black_player_id = user_uuid THEN
    RETURN TRUE;
  END IF;

  RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- ADDITIONAL CONSTRAINTS
-- =====================================================

-- Ensure moves are inserted in sequence
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

-- Prevent modifications to finished games
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
-- COMMENTS
-- =====================================================

COMMENT ON POLICY "Players can insert moves on their turn" ON moves IS
  'Ensures players can only make moves when it is their turn, preventing cheating';

COMMENT ON FUNCTION is_user_turn IS
  'Helper function to check if it is a specific user''s turn in a game';

COMMENT ON TRIGGER enforce_move_sequence ON moves IS
  'Ensures moves are inserted in the correct sequence to prevent race conditions';
