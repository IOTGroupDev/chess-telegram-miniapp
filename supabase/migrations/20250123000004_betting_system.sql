-- =====================================================
-- Chess Telegram Mini App - Betting System
-- Supabase Migration
-- =====================================================

-- =====================================================
-- ENUMS
-- =====================================================

-- Bet type enum
CREATE TYPE bet_type AS ENUM ('free', 'coins', 'stars');

-- Bet status enum
CREATE TYPE bet_status AS ENUM ('pending', 'locked', 'completed', 'cancelled', 'refunded');

-- Transaction type enum
CREATE TYPE transaction_type AS ENUM (
  'deposit_bet',
  'refund_bet',
  'win_payout',
  'deposit_stars',
  'withdraw_coins',
  'platform_fee',
  'draw_refund'
);

-- Add new game statuses for betting flow
ALTER TYPE game_status ADD VALUE 'pending_bet_setup';
ALTER TYPE game_status ADD VALUE 'pending_bet_acceptance';
ALTER TYPE game_status ADD VALUE 'pending_deposits';

-- =====================================================
-- USER WALLETS TABLE
-- =====================================================
CREATE TABLE user_wallets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Balances
  balance_coins DECIMAL(10,2) DEFAULT 0.00 CHECK (balance_coins >= 0),
  balance_stars INT DEFAULT 0 CHECK (balance_stars >= 0),

  -- Statistics
  total_deposited DECIMAL(10,2) DEFAULT 0.00,
  total_withdrawn DECIMAL(10,2) DEFAULT 0.00,
  total_won DECIMAL(10,2) DEFAULT 0.00,
  total_lost DECIMAL(10,2) DEFAULT 0.00,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for wallets
CREATE INDEX idx_user_wallets_user_id ON user_wallets(user_id);

-- Trigger for wallet updated_at
CREATE TRIGGER update_user_wallets_updated_at
  BEFORE UPDATE ON user_wallets
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- GAME BETS TABLE
-- =====================================================
CREATE TABLE game_bets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  game_id UUID UNIQUE NOT NULL REFERENCES games(id) ON DELETE CASCADE,

  -- Bet details
  bet_type bet_type NOT NULL,
  bet_amount DECIMAL(10,2) CHECK (bet_amount IS NULL OR bet_amount > 0),
  currency TEXT, -- 'coins' or 'stars'

  -- Deposit statuses
  white_deposit_status bet_status DEFAULT 'pending',
  black_deposit_status bet_status DEFAULT 'pending',
  white_deposited_at TIMESTAMPTZ,
  black_deposited_at TIMESTAMPTZ,

  -- Calculations
  total_pot DECIMAL(10,2) DEFAULT 0.00,
  platform_fee_percentage DECIMAL(5,2) DEFAULT 10.00,
  platform_fee DECIMAL(10,2) DEFAULT 0.00,
  winner_payout DECIMAL(10,2),

  -- Terms acceptance
  terms_accepted_by_white BOOLEAN DEFAULT FALSE,
  terms_accepted_by_black BOOLEAN DEFAULT FALSE,

  -- Status
  status bet_status DEFAULT 'pending',
  payout_completed_at TIMESTAMPTZ,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Constraints
  CONSTRAINT bet_amount_required_for_paid CHECK (
    (bet_type = 'free' AND bet_amount IS NULL) OR
    (bet_type IN ('coins', 'stars') AND bet_amount IS NOT NULL)
  ),
  CONSTRAINT currency_matches_bet_type CHECK (
    (bet_type = 'free' AND currency IS NULL) OR
    (bet_type = 'coins' AND currency = 'coins') OR
    (bet_type = 'stars' AND currency = 'stars')
  )
);

-- Indexes for game_bets
CREATE INDEX idx_game_bets_game_id ON game_bets(game_id);
CREATE INDEX idx_game_bets_status ON game_bets(status);
CREATE INDEX idx_game_bets_created_at ON game_bets(created_at DESC);

-- Trigger for game_bets updated_at
CREATE TRIGGER update_game_bets_updated_at
  BEFORE UPDATE ON game_bets
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- WALLET TRANSACTIONS TABLE
-- =====================================================
CREATE TABLE wallet_transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  wallet_id UUID NOT NULL REFERENCES user_wallets(id) ON DELETE CASCADE,

  -- Transaction details
  transaction_type transaction_type NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  currency TEXT NOT NULL, -- 'coins' or 'stars'

  -- Balance tracking
  balance_before DECIMAL(10,2) NOT NULL,
  balance_after DECIMAL(10,2) NOT NULL,

  -- Game reference (if applicable)
  game_id UUID REFERENCES games(id) ON DELETE SET NULL,
  game_bet_id UUID REFERENCES game_bets(id) ON DELETE SET NULL,

  -- Metadata
  description TEXT,
  metadata JSONB,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for transactions
CREATE INDEX idx_wallet_transactions_user_id ON wallet_transactions(user_id, created_at DESC);
CREATE INDEX idx_wallet_transactions_wallet_id ON wallet_transactions(wallet_id, created_at DESC);
CREATE INDEX idx_wallet_transactions_game_id ON wallet_transactions(game_id) WHERE game_id IS NOT NULL;
CREATE INDEX idx_wallet_transactions_type ON wallet_transactions(transaction_type);

-- =====================================================
-- FUNCTIONS
-- =====================================================

-- Function to create wallet for new user
CREATE OR REPLACE FUNCTION create_user_wallet()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO user_wallets (user_id)
  VALUES (NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-create wallet when user is created
CREATE TRIGGER create_wallet_on_user_insert
  AFTER INSERT ON users
  FOR EACH ROW
  EXECUTE FUNCTION create_user_wallet();

-- Function to calculate bet payout
CREATE OR REPLACE FUNCTION calculate_bet_payout(
  bet_amount DECIMAL,
  fee_percentage DECIMAL DEFAULT 10.00
)
RETURNS DECIMAL AS $$
DECLARE
  total_pot DECIMAL;
  platform_fee DECIMAL;
  winner_payout DECIMAL;
BEGIN
  total_pot := bet_amount * 2;
  platform_fee := total_pot * (fee_percentage / 100);
  winner_payout := total_pot - platform_fee;
  RETURN winner_payout;
END;
$$ LANGUAGE plpgsql;

-- Function to process bet payout when game ends
CREATE OR REPLACE FUNCTION process_bet_payout()
RETURNS TRIGGER AS $$
DECLARE
  bet_record RECORD;
  winner_user_id UUID;
  payout_amount DECIMAL;
  fee_amount DECIMAL;
  currency_type TEXT;
BEGIN
  -- Only process if game just finished and has a winner
  IF NEW.status = 'finished' AND OLD.status != 'finished' THEN

    -- Get bet information
    SELECT * INTO bet_record
    FROM game_bets
    WHERE game_id = NEW.id
    AND bet_type IN ('coins', 'stars')
    AND status = 'locked';

    -- If no bet found or it's a free game, skip
    IF NOT FOUND THEN
      RETURN NEW;
    END IF;

    -- Determine winner user_id
    IF NEW.winner = 'white' THEN
      winner_user_id := NEW.white_player_id;
    ELSIF NEW.winner = 'black' THEN
      winner_user_id := NEW.black_player_id;
    ELSE
      -- Draw - refund both players (minus small fee)
      PERFORM handle_draw_refund(NEW.id, bet_record);
      RETURN NEW;
    END IF;

    -- Calculate payout
    payout_amount := calculate_bet_payout(bet_record.bet_amount, bet_record.platform_fee_percentage);
    fee_amount := (bet_record.bet_amount * 2) - payout_amount;
    currency_type := bet_record.currency;

    -- Update winner's wallet
    IF currency_type = 'coins' THEN
      UPDATE user_wallets
      SET
        balance_coins = balance_coins + payout_amount,
        total_won = total_won + payout_amount
      WHERE user_id = winner_user_id;

      -- Record transaction
      INSERT INTO wallet_transactions (
        user_id, wallet_id, transaction_type, amount, currency,
        balance_before, balance_after, game_id, game_bet_id, description
      )
      SELECT
        winner_user_id,
        uw.id,
        'win_payout',
        payout_amount,
        'coins',
        uw.balance_coins - payout_amount,
        uw.balance_coins,
        NEW.id,
        bet_record.id,
        'Game win payout'
      FROM user_wallets uw
      WHERE uw.user_id = winner_user_id;

    ELSIF currency_type = 'stars' THEN
      UPDATE user_wallets
      SET
        balance_stars = balance_stars + payout_amount::INT,
        total_won = total_won + payout_amount
      WHERE user_id = winner_user_id;

      -- Record transaction
      INSERT INTO wallet_transactions (
        user_id, wallet_id, transaction_type, amount, currency,
        balance_before, balance_after, game_id, game_bet_id, description
      )
      SELECT
        winner_user_id,
        uw.id,
        'win_payout',
        payout_amount,
        'stars',
        (uw.balance_stars - payout_amount::INT)::DECIMAL,
        uw.balance_stars::DECIMAL,
        NEW.id,
        bet_record.id,
        'Game win payout'
      FROM user_wallets uw
      WHERE uw.user_id = winner_user_id;
    END IF;

    -- Update loser's statistics
    UPDATE user_wallets
    SET total_lost = total_lost + bet_record.bet_amount
    WHERE user_id = CASE
      WHEN NEW.winner = 'white' THEN NEW.black_player_id
      ELSE NEW.white_player_id
    END;

    -- Update bet record
    UPDATE game_bets
    SET
      status = 'completed',
      winner_payout = payout_amount,
      platform_fee = fee_amount,
      payout_completed_at = NOW()
    WHERE id = bet_record.id;

  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to handle draw refund
CREATE OR REPLACE FUNCTION handle_draw_refund(
  p_game_id UUID,
  p_bet_record RECORD
)
RETURNS VOID AS $$
DECLARE
  refund_amount DECIMAL;
  small_fee DECIMAL;
  white_player UUID;
  black_player UUID;
BEGIN
  -- Get players
  SELECT white_player_id, black_player_id INTO white_player, black_player
  FROM games WHERE id = p_game_id;

  -- Calculate refund (each player gets their bet back minus 5% fee)
  small_fee := p_bet_record.bet_amount * 0.05;
  refund_amount := p_bet_record.bet_amount - small_fee;

  -- Refund white player
  IF p_bet_record.currency = 'coins' THEN
    UPDATE user_wallets
    SET balance_coins = balance_coins + refund_amount
    WHERE user_id = white_player;

    UPDATE user_wallets
    SET balance_coins = balance_coins + refund_amount
    WHERE user_id = black_player;
  ELSIF p_bet_record.currency = 'stars' THEN
    UPDATE user_wallets
    SET balance_stars = balance_stars + refund_amount::INT
    WHERE user_id = white_player;

    UPDATE user_wallets
    SET balance_stars = balance_stars + refund_amount::INT
    WHERE user_id = black_player;
  END IF;

  -- Record transactions for both players
  INSERT INTO wallet_transactions (
    user_id, wallet_id, transaction_type, amount, currency,
    balance_before, balance_after, game_id, game_bet_id, description
  )
  SELECT
    white_player,
    uw.id,
    'draw_refund',
    refund_amount,
    p_bet_record.currency,
    CASE WHEN p_bet_record.currency = 'coins'
      THEN uw.balance_coins - refund_amount
      ELSE (uw.balance_stars - refund_amount::INT)::DECIMAL
    END,
    CASE WHEN p_bet_record.currency = 'coins'
      THEN uw.balance_coins
      ELSE uw.balance_stars::DECIMAL
    END,
    p_game_id,
    p_bet_record.id,
    'Draw refund (5% fee)'
  FROM user_wallets uw
  WHERE uw.user_id = white_player;

  INSERT INTO wallet_transactions (
    user_id, wallet_id, transaction_type, amount, currency,
    balance_before, balance_after, game_id, game_bet_id, description
  )
  SELECT
    black_player,
    uw.id,
    'draw_refund',
    refund_amount,
    p_bet_record.currency,
    CASE WHEN p_bet_record.currency = 'coins'
      THEN uw.balance_coins - refund_amount
      ELSE (uw.balance_stars - refund_amount::INT)::DECIMAL
    END,
    CASE WHEN p_bet_record.currency = 'coins'
      THEN uw.balance_coins
      ELSE uw.balance_stars::DECIMAL
    END,
    p_game_id,
    p_bet_record.id,
    'Draw refund (5% fee)'
  FROM user_wallets uw
  WHERE uw.user_id = black_player;

  -- Update bet status
  UPDATE game_bets
  SET
    status = 'refunded',
    platform_fee = small_fee * 2,
    payout_completed_at = NOW()
  WHERE id = p_bet_record.id;

END;
$$ LANGUAGE plpgsql;

-- Trigger to process payout when game finishes
CREATE TRIGGER process_bet_payout_trigger
  AFTER UPDATE ON games
  FOR EACH ROW
  EXECUTE FUNCTION process_bet_payout();

-- =====================================================
-- ENABLE REALTIME
-- =====================================================

-- Enable realtime for betting tables
ALTER PUBLICATION supabase_realtime ADD TABLE game_bets;
ALTER PUBLICATION supabase_realtime ADD TABLE user_wallets;
ALTER PUBLICATION supabase_realtime ADD TABLE wallet_transactions;

-- =====================================================
-- COMMENTS
-- =====================================================

COMMENT ON TABLE user_wallets IS 'User cryptocurrency wallets for coins and Telegram Stars';
COMMENT ON TABLE game_bets IS 'Betting information for games with deposit tracking';
COMMENT ON TABLE wallet_transactions IS 'Transaction history for all wallet operations';
COMMENT ON FUNCTION calculate_bet_payout IS 'Calculates winner payout after platform fee';
COMMENT ON FUNCTION process_bet_payout IS 'Automatically processes bet payout when game ends';
COMMENT ON FUNCTION handle_draw_refund IS 'Handles refund for both players in case of draw';
