-- =====================================================
-- Add Welcome Bonus for New Users
-- Gives 100 free coins to new players
-- =====================================================

-- Update the create_user_wallet function to include welcome bonus
CREATE OR REPLACE FUNCTION create_user_wallet()
RETURNS TRIGGER AS $$
DECLARE
  new_wallet_id UUID;
  welcome_bonus DECIMAL := 100.00;
BEGIN
  -- Create wallet with welcome bonus
  INSERT INTO user_wallets (user_id, balance_coins, total_deposited)
  VALUES (NEW.id, welcome_bonus, welcome_bonus)
  RETURNING id INTO new_wallet_id;

  -- Record welcome bonus transaction
  INSERT INTO wallet_transactions (
    user_id,
    wallet_id,
    transaction_type,
    amount,
    currency,
    balance_before,
    balance_after,
    description,
    metadata
  ) VALUES (
    NEW.id,
    new_wallet_id,
    'deposit_coins',
    welcome_bonus,
    'coins',
    0.00,
    welcome_bonus,
    'Welcome bonus for new player',
    jsonb_build_object('reason', 'registration_bonus', 'auto', true)
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add comment
COMMENT ON FUNCTION create_user_wallet IS
  'Creates wallet for new user with 100 coins welcome bonus';

-- =====================================================
-- Optional: Add welcome bonus to existing users without it
-- =====================================================

-- Find users who don't have welcome bonus transaction and give it
DO $$
DECLARE
  user_record RECORD;
  welcome_bonus DECIMAL := 100.00;
BEGIN
  FOR user_record IN
    SELECT u.id, uw.id as wallet_id, uw.balance_coins
    FROM users u
    JOIN user_wallets uw ON uw.user_id = u.id
    WHERE NOT EXISTS (
      SELECT 1 FROM wallet_transactions wt
      WHERE wt.user_id = u.id
      AND wt.description LIKE '%Welcome bonus%'
    )
    AND uw.balance_coins = 0  -- Only if they haven't received any coins yet
  LOOP
    -- Add welcome bonus to existing wallet
    UPDATE user_wallets
    SET
      balance_coins = balance_coins + welcome_bonus,
      total_deposited = total_deposited + welcome_bonus
    WHERE id = user_record.wallet_id;

    -- Record transaction
    INSERT INTO wallet_transactions (
      user_id,
      wallet_id,
      transaction_type,
      amount,
      currency,
      balance_before,
      balance_after,
      description,
      metadata
    ) VALUES (
      user_record.id,
      user_record.wallet_id,
      'deposit_coins',
      welcome_bonus,
      'coins',
      user_record.balance_coins,
      user_record.balance_coins + welcome_bonus,
      'Welcome bonus for existing player',
      jsonb_build_object('reason', 'retroactive_bonus', 'auto', true)
    );
  END LOOP;
END $$;

-- =====================================================
-- Add index for faster welcome bonus checks
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_wallet_transactions_description
ON wallet_transactions(user_id, description)
WHERE description LIKE '%Welcome bonus%';

COMMENT ON INDEX idx_wallet_transactions_description IS
  'Index for checking if user received welcome bonus';
