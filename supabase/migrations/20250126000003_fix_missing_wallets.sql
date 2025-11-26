-- =====================================================
-- Fix Missing Wallets for Existing Users
-- Creates wallets for users who don't have them
-- =====================================================

-- Function to check and create missing wallets
CREATE OR REPLACE FUNCTION fix_missing_wallets()
RETURNS TABLE(
  user_id UUID,
  wallet_created BOOLEAN,
  message TEXT
) AS $$
DECLARE
  user_record RECORD;
  new_wallet_id UUID;
  welcome_bonus DECIMAL := 100.00;
BEGIN
  -- Find users without wallets
  FOR user_record IN
    SELECT u.id, u.telegram_id, u.username
    FROM users u
    LEFT JOIN user_wallets uw ON uw.user_id = u.id
    WHERE uw.id IS NULL
  LOOP
    BEGIN
      -- Create wallet with welcome bonus
      INSERT INTO user_wallets (user_id, balance_coins, total_deposited)
      VALUES (user_record.id, welcome_bonus, welcome_bonus)
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
        user_record.id,
        new_wallet_id,
        'deposit_coins',
        welcome_bonus,
        'coins',
        0.00,
        welcome_bonus,
        'Welcome bonus (retroactive)',
        jsonb_build_object(
          'reason', 'missing_wallet_fix',
          'telegram_id', user_record.telegram_id,
          'auto', true
        )
      );

      -- Return success
      user_id := user_record.id;
      wallet_created := true;
      message := 'Wallet created with ' || welcome_bonus || ' coins welcome bonus';
      RETURN NEXT;

    EXCEPTION WHEN OTHERS THEN
      -- Return error
      user_id := user_record.id;
      wallet_created := false;
      message := 'Error: ' || SQLERRM;
      RETURN NEXT;
    END;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Run the fix for existing users
SELECT * FROM fix_missing_wallets();

-- Create function to ensure wallet exists (for backend fallback)
CREATE OR REPLACE FUNCTION ensure_user_wallet(p_user_id UUID)
RETURNS UUID AS $$
DECLARE
  wallet_id UUID;
  welcome_bonus DECIMAL := 100.00;
BEGIN
  -- Try to get existing wallet
  SELECT id INTO wallet_id
  FROM user_wallets
  WHERE user_id = p_user_id;

  IF wallet_id IS NOT NULL THEN
    -- Wallet exists, return it
    RETURN wallet_id;
  END IF;

  -- Wallet doesn't exist, create it
  INSERT INTO user_wallets (user_id, balance_coins, total_deposited)
  VALUES (p_user_id, welcome_bonus, welcome_bonus)
  RETURNING id INTO wallet_id;

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
    p_user_id,
    wallet_id,
    'deposit_coins',
    welcome_bonus,
    'coins',
    0.00,
    welcome_bonus,
    'Welcome bonus (fallback)',
    jsonb_build_object('reason', 'ensure_wallet', 'auto', true)
  );

  RETURN wallet_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add comments
COMMENT ON FUNCTION fix_missing_wallets IS
  'One-time function to create wallets for users who dont have them';

COMMENT ON FUNCTION ensure_user_wallet IS
  'Ensures user has a wallet, creates one if missing. Safe to call multiple times.';

-- =====================================================
-- Verification Query
-- =====================================================

-- Check if all users have wallets now
DO $$
DECLARE
  missing_count INT;
BEGIN
  SELECT COUNT(*) INTO missing_count
  FROM users u
  LEFT JOIN user_wallets uw ON uw.user_id = u.id
  WHERE uw.id IS NULL;

  IF missing_count > 0 THEN
    RAISE WARNING '% users still missing wallets!', missing_count;
  ELSE
    RAISE NOTICE 'All users have wallets ✓';
  END IF;
END $$;
