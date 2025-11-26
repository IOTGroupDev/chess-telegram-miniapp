-- =====================================================
-- Fix Users INSERT Policy for Telegram Authentication
-- Allows backend service role to create users
-- =====================================================

-- Drop the old restrictive policy
DROP POLICY IF EXISTS "Users can insert own profile" ON users;

-- Create new policy that allows:
-- 1. Service role to create any user (for Telegram auth via backend)
-- 2. Authenticated users to create their own profile (for future direct auth)
CREATE POLICY "Allow user creation via service role or own profile"
  ON users FOR INSERT
  WITH CHECK (
    -- Allow service role to create users (auth.uid() will be NULL)
    auth.uid() IS NULL
    -- OR authenticated users can create their own profile
    OR auth.uid() = id
  );

-- Add comment explaining the policy
COMMENT ON POLICY "Allow user creation via service role or own profile" ON users IS
  'Allows backend service role to create users during Telegram authentication, or users to create their own profiles';
