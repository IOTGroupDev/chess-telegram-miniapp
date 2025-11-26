-- =====================================================
-- Chess Telegram Mini App - Betting System RLS Policies
-- Supabase Migration
-- =====================================================

-- Enable RLS on betting tables
ALTER TABLE user_wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_bets ENABLE ROW LEVEL SECURITY;
ALTER TABLE wallet_transactions ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- USER WALLETS POLICIES
-- =====================================================

-- Users can view their own wallet
CREATE POLICY "Users can view own wallet"
ON user_wallets FOR SELECT
USING (auth.uid() = user_id);

-- Users can update their own wallet (for deposits)
CREATE POLICY "Users can update own wallet"
ON user_wallets FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- System can insert wallets (via trigger)
CREATE POLICY "System can insert wallets"
ON user_wallets FOR INSERT
WITH CHECK (true);

-- =====================================================
-- GAME BETS POLICIES
-- =====================================================

-- Players can view bets for their games
CREATE POLICY "Players can view bets for their games"
ON game_bets FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM games g
    WHERE g.id = game_id
    AND (g.white_player_id = auth.uid() OR g.black_player_id = auth.uid())
  )
);

-- White player can create bet for their game
CREATE POLICY "White player can create bet"
ON game_bets FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM games g
    WHERE g.id = game_id
    AND g.white_player_id = auth.uid()
    AND g.status = 'pending_bet_setup'
  )
);

-- Players can update bets for their games (for accepting, depositing)
CREATE POLICY "Players can update bets for their games"
ON game_bets FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM games g
    WHERE g.id = game_id
    AND (g.white_player_id = auth.uid() OR g.black_player_id = auth.uid())
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM games g
    WHERE g.id = game_id
    AND (g.white_player_id = auth.uid() OR g.black_player_id = auth.uid())
  )
);

-- =====================================================
-- WALLET TRANSACTIONS POLICIES
-- =====================================================

-- Users can view their own transactions
CREATE POLICY "Users can view own transactions"
ON wallet_transactions FOR SELECT
USING (auth.uid() = user_id);

-- Users can insert their own transactions (for deposits)
CREATE POLICY "Users can insert own transactions"
ON wallet_transactions FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- System can insert transactions (via triggers)
CREATE POLICY "System can insert transactions"
ON wallet_transactions FOR INSERT
WITH CHECK (true);

-- =====================================================
-- ADDITIONAL SECURITY FUNCTIONS
-- =====================================================

-- Function to check if user has sufficient balance
CREATE OR REPLACE FUNCTION has_sufficient_balance(
  p_user_id UUID,
  p_amount DECIMAL,
  p_currency TEXT
)
RETURNS BOOLEAN AS $$
DECLARE
  current_balance DECIMAL;
BEGIN
  IF p_currency = 'coins' THEN
    SELECT balance_coins INTO current_balance
    FROM user_wallets
    WHERE user_id = p_user_id;
  ELSIF p_currency = 'stars' THEN
    SELECT balance_stars::DECIMAL INTO current_balance
    FROM user_wallets
    WHERE user_id = p_user_id;
  ELSE
    RETURN FALSE;
  END IF;

  RETURN current_balance >= p_amount;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to deposit bet (called by user)
CREATE OR REPLACE FUNCTION deposit_game_bet(
  p_game_id UUID,
  p_user_id UUID
)
RETURNS JSONB AS $$
DECLARE
  bet_record RECORD;
  wallet_record RECORD;
  is_white_player BOOLEAN;
  new_balance DECIMAL;
  result JSONB;
BEGIN
  -- Get bet information
  SELECT * INTO bet_record
  FROM game_bets
  WHERE game_id = p_game_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Bet not found');
  END IF;

  -- Free games don't require deposits
  IF bet_record.bet_type = 'free' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Free games do not require deposits');
  END IF;

  -- Check if user is a player in this game
  SELECT
    white_player_id = p_user_id as is_white,
    white_player_id,
    black_player_id
  INTO is_white_player, wallet_record
  FROM games
  WHERE id = p_game_id
  AND (white_player_id = p_user_id OR black_player_id = p_user_id);

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'User is not a player in this game');
  END IF;

  -- Check if already deposited
  IF is_white_player AND bet_record.white_deposit_status = 'locked' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Already deposited');
  END IF;

  IF NOT is_white_player AND bet_record.black_deposit_status = 'locked' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Already deposited');
  END IF;

  -- Check sufficient balance
  IF NOT has_sufficient_balance(p_user_id, bet_record.bet_amount, bet_record.currency) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Insufficient balance');
  END IF;

  -- Get current wallet
  SELECT * INTO wallet_record
  FROM user_wallets
  WHERE user_id = p_user_id;

  -- Deduct from wallet
  IF bet_record.currency = 'coins' THEN
    new_balance := wallet_record.balance_coins - bet_record.bet_amount;
    UPDATE user_wallets
    SET balance_coins = new_balance
    WHERE user_id = p_user_id;

    -- Record transaction
    INSERT INTO wallet_transactions (
      user_id, wallet_id, transaction_type, amount, currency,
      balance_before, balance_after, game_id, game_bet_id, description
    ) VALUES (
      p_user_id,
      wallet_record.id,
      'deposit_bet',
      bet_record.bet_amount,
      'coins',
      wallet_record.balance_coins,
      new_balance,
      p_game_id,
      bet_record.id,
      'Bet deposit for game'
    );

  ELSIF bet_record.currency = 'stars' THEN
    new_balance := wallet_record.balance_stars - bet_record.bet_amount::INT;
    UPDATE user_wallets
    SET balance_stars = new_balance::INT
    WHERE user_id = p_user_id;

    -- Record transaction
    INSERT INTO wallet_transactions (
      user_id, wallet_id, transaction_type, amount, currency,
      balance_before, balance_after, game_id, game_bet_id, description
    ) VALUES (
      p_user_id,
      wallet_record.id,
      'deposit_bet',
      bet_record.bet_amount,
      'stars',
      wallet_record.balance_stars::DECIMAL,
      new_balance,
      p_game_id,
      bet_record.id,
      'Bet deposit for game'
    );
  END IF;

  -- Update bet deposit status
  IF is_white_player THEN
    UPDATE game_bets
    SET
      white_deposit_status = 'locked',
      white_deposited_at = NOW(),
      updated_at = NOW()
    WHERE game_id = p_game_id;
  ELSE
    UPDATE game_bets
    SET
      black_deposit_status = 'locked',
      black_deposited_at = NOW(),
      updated_at = NOW()
    WHERE game_id = p_game_id;
  END IF;

  -- Check if both players have deposited
  SELECT * INTO bet_record
  FROM game_bets
  WHERE game_id = p_game_id;

  IF bet_record.white_deposit_status = 'locked' AND bet_record.black_deposit_status = 'locked' THEN
    -- Both deposited - calculate total pot and update game status
    UPDATE game_bets
    SET
      total_pot = bet_record.bet_amount * 2,
      platform_fee = (bet_record.bet_amount * 2) * (bet_record.platform_fee_percentage / 100),
      status = 'locked',
      updated_at = NOW()
    WHERE game_id = p_game_id;

    -- Update game status to active
    UPDATE games
    SET
      status = 'active',
      started_at = NOW()
    WHERE id = p_game_id;

    result := jsonb_build_object(
      'success', true,
      'both_deposited', true,
      'game_started', true
    );
  ELSE
    result := jsonb_build_object(
      'success', true,
      'both_deposited', false,
      'waiting_for_opponent', true
    );
  END IF;

  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to refund bet if player leaves before game starts
CREATE OR REPLACE FUNCTION refund_game_bet(
  p_game_id UUID,
  p_reason TEXT DEFAULT 'Player left before game started'
)
RETURNS VOID AS $$
DECLARE
  bet_record RECORD;
  game_record RECORD;
BEGIN
  -- Get bet and game info
  SELECT * INTO bet_record FROM game_bets WHERE game_id = p_game_id;
  SELECT * INTO game_record FROM games WHERE id = p_game_id;

  IF NOT FOUND THEN
    RETURN;
  END IF;

  -- Only refund if game hasn't started
  IF game_record.status = 'active' OR game_record.status = 'finished' THEN
    RETURN;
  END IF;

  -- Refund white player if they deposited
  IF bet_record.white_deposit_status = 'locked' THEN
    IF bet_record.currency = 'coins' THEN
      UPDATE user_wallets
      SET balance_coins = balance_coins + bet_record.bet_amount
      WHERE user_id = game_record.white_player_id;
    ELSIF bet_record.currency = 'stars' THEN
      UPDATE user_wallets
      SET balance_stars = balance_stars + bet_record.bet_amount::INT
      WHERE user_id = game_record.white_player_id;
    END IF;

    -- Record refund transaction
    INSERT INTO wallet_transactions (
      user_id, wallet_id, transaction_type, amount, currency,
      balance_before, balance_after, game_id, game_bet_id, description
    )
    SELECT
      game_record.white_player_id,
      uw.id,
      'refund_bet',
      bet_record.bet_amount,
      bet_record.currency,
      CASE WHEN bet_record.currency = 'coins'
        THEN uw.balance_coins - bet_record.bet_amount
        ELSE (uw.balance_stars - bet_record.bet_amount::INT)::DECIMAL
      END,
      CASE WHEN bet_record.currency = 'coins'
        THEN uw.balance_coins
        ELSE uw.balance_stars::DECIMAL
      END,
      p_game_id,
      bet_record.id,
      p_reason
    FROM user_wallets uw
    WHERE uw.user_id = game_record.white_player_id;
  END IF;

  -- Refund black player if they deposited
  IF bet_record.black_deposit_status = 'locked' AND game_record.black_player_id IS NOT NULL THEN
    IF bet_record.currency = 'coins' THEN
      UPDATE user_wallets
      SET balance_coins = balance_coins + bet_record.bet_amount
      WHERE user_id = game_record.black_player_id;
    ELSIF bet_record.currency = 'stars' THEN
      UPDATE user_wallets
      SET balance_stars = balance_stars + bet_record.bet_amount::INT
      WHERE user_id = game_record.black_player_id;
    END IF;

    -- Record refund transaction
    INSERT INTO wallet_transactions (
      user_id, wallet_id, transaction_type, amount, currency,
      balance_before, balance_after, game_id, game_bet_id, description
    )
    SELECT
      game_record.black_player_id,
      uw.id,
      'refund_bet',
      bet_record.bet_amount,
      bet_record.currency,
      CASE WHEN bet_record.currency = 'coins'
        THEN uw.balance_coins - bet_record.bet_amount
        ELSE (uw.balance_stars - bet_record.bet_amount::INT)::DECIMAL
      END,
      CASE WHEN bet_record.currency = 'coins'
        THEN uw.balance_coins
        ELSE uw.balance_stars::DECIMAL
      END,
      p_game_id,
      bet_record.id,
      p_reason
    FROM user_wallets uw
    WHERE uw.user_id = game_record.black_player_id;
  END IF;

  -- Update bet status
  UPDATE game_bets
  SET
    status = 'refunded',
    updated_at = NOW()
  WHERE game_id = p_game_id;

  -- Update game status
  UPDATE games
  SET status = 'aborted'
  WHERE id = p_game_id;

END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- COMMENTS
-- =====================================================

COMMENT ON FUNCTION has_sufficient_balance IS 'Checks if user has enough balance for a transaction';
COMMENT ON FUNCTION deposit_game_bet IS 'Handles bet deposit from a player, starts game when both deposited';
COMMENT ON FUNCTION refund_game_bet IS 'Refunds bet to players if game is cancelled before starting';
