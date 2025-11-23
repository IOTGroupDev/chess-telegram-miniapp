# 🗄️ DATABASE SETUP GUIDE
**Chess Telegram Mini App - Supabase Configuration**

---

## 📋 PREREQUISITES

1. **Supabase Account** (Free tier is enough)
   - Go to https://supabase.com
   - Create new project
   - Wait 2-3 minutes for provisioning

2. **Project Credentials**
   - Copy `Project URL` (e.g., `https://xxxxx.supabase.co`)
   - Copy `anon public` key from Settings → API
   - Copy `service_role` key (secret!) from Settings → API

---

## 🚀 STEP 1: Configure Environment Variables

### Frontend (.env)

Create `frontend/.env`:
```env
VITE_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-public-key-here
```

### Backend (.env)

Create `backend/.env`:
```env
# Supabase
SUPABASE_URL=https://YOUR_PROJECT.supabase.co
SUPABASE_SERVICE_KEY=your-service-role-secret-key-here

# Redis (optional, for caching)
REDIS_HOST=localhost
REDIS_PORT=6379

# Stockfish paths (adjust for your system)
STOCKFISH_PATH=/usr/games/stockfish
LEELA_PATH=/usr/games/lc0
KOMODO_PATH=/usr/games/komodo

# API Keys (optional, for AI analysis)
DEEPSEEK_API_KEY=your-deepseek-key
OPENAI_API_KEY=your-openai-key
CLAUDE_API_KEY=your-claude-key
```

---

## 🗂️ STEP 2: Apply Database Migrations

### Option A: Using Supabase Dashboard (Recommended)

1. Open https://app.supabase.com/project/YOUR_PROJECT/sql/new

2. **Run Migration 1** - Initial Schema:
   ```bash
   # Copy contents of this file:
   cat supabase/migrations/20250123000001_initial_schema.sql
   ```
   - Paste into SQL Editor
   - Click "Run"
   - Should create ~10 tables

3. **Run Migration 2** - RLS Policies:
   ```bash
   # Copy contents:
   cat supabase/migrations/20250123000002_rls_policies.sql
   ```
   - Paste into SQL Editor
   - Click "Run"
   - Should create ~15 policies

4. **Run Migration 3** - Tournament Enhancements:
   ```bash
   # Copy contents:
   cat supabase/migrations/20250123000003_tournament_enhancements.sql
   ```
   - Paste into SQL Editor
   - Click "Run"
   - Should create tournament tables

### Option B: Using Supabase CLI

```bash
# Install Supabase CLI
npm install -g supabase

# Login
supabase login

# Link to your project
supabase link --project-ref YOUR_PROJECT_REF

# Apply all migrations
supabase db push

# Or apply one by one:
supabase db execute -f supabase/migrations/20250123000001_initial_schema.sql
supabase db execute -f supabase/migrations/20250123000002_rls_policies.sql
supabase db execute -f supabase/migrations/20250123000003_tournament_enhancements.sql
```

---

## 🧩 STEP 3: Load Puzzle Data

1. Open SQL Editor in Supabase Dashboard

2. **Run Puzzle Seeding Script:**
   ```bash
   # Copy contents:
   cat scripts/seed-puzzles.sql
   ```
   - Paste into SQL Editor
   - Click "Run"
   - Should insert 20+ sample puzzles

3. **Verify Puzzles Loaded:**
   ```sql
   SELECT COUNT(*) as puzzle_count FROM puzzles;
   -- Should return: 20+

   SELECT
     CASE
       WHEN rating < 1400 THEN 'Easy'
       WHEN rating < 1800 THEN 'Medium'
       WHEN rating < 2200 THEN 'Hard'
       ELSE 'Master'
     END as difficulty,
     COUNT(*) as count
   FROM puzzles
   GROUP BY difficulty
   ORDER BY MIN(rating);
   ```

---

## 🔐 STEP 4: Configure Authentication

### Telegram Bot Integration

1. **Create Telegram Bot:**
   ```
   - Message @BotFather on Telegram
   - Send /newbot
   - Follow instructions
   - Copy Bot Token
   ```

2. **Configure Bot in Supabase:**
   - Go to Authentication → Providers
   - Enable "Phone" provider
   - Or use custom JWT authentication

3. **Update Frontend:**
   ```typescript
   // In telegramService.ts
   const tgUser = window.Telegram.WebApp.initDataUnsafe?.user;

   // Create user in Supabase
   const { data, error } = await supabase
     .from('users')
     .upsert({
       telegram_id: tgUser.id,
       username: tgUser.username,
       first_name: tgUser.first_name,
       last_name: tgUser.last_name,
     });
   ```

---

## ✅ STEP 5: Verify Setup

### Check Tables Created

```sql
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_name;

-- Expected tables:
-- ✓ games
-- ✓ game_analysis
-- ✓ moves
-- ✓ openings
-- ✓ puzzles
-- ✓ tournament_games
-- ✓ tournament_pairings
-- ✓ tournament_participants
-- ✓ tournament_rounds
-- ✓ tournaments
-- ✓ user_puzzle_attempts
-- ✓ users
```

### Check RLS Enabled

```sql
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public';

-- All tables should have rowsecurity = true
```

### Check Realtime Enabled

```sql
SELECT * FROM pg_publication_tables
WHERE pubname = 'supabase_realtime';

-- Should include:
-- ✓ games
-- ✓ moves
-- ✓ tournament_participants
-- ✓ tournament_games
-- ✓ tournament_rounds
-- ✓ tournament_pairings
```

---

## 🧪 STEP 6: Test Database Access

### Test from Frontend

```typescript
// In browser console
import { supabase } from './lib/supabaseClient';

// Test connection
const { data, error } = await supabase
  .from('puzzles')
  .select('count');

console.log('Puzzles:', data);
// Should return: [{ count: 20 }]
```

### Test from Backend

```typescript
// In NestJS service
const { data, error } = await this.supabase
  .from('users')
  .select('*')
  .limit(1);

console.log('Users:', data);
```

---

## 📊 STEP 7: Load Production Puzzles (Optional)

For production, load full Lichess puzzle database:

```bash
# Download Lichess puzzles (Warning: ~2GB file!)
wget https://database.lichess.org/lichess_db_puzzle.csv.bz2
bunzip2 lichess_db_puzzle.csv.bz2

# Parse and import (create script)
node scripts/import-lichess-puzzles.js

# Or manually:
# - Open CSV
# - Parse each line
# - INSERT into puzzles table
```

**Sample import script:**
```javascript
const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

const lines = fs.readFileSync('lichess_db_puzzle.csv', 'utf-8')
  .split('\n')
  .slice(1); // Skip header

for (const line of lines.slice(0, 1000)) { // First 1000
  const [puzzleId, fen, moves, rating, ratingDeviation, popularity, nbPlays, themes, gameUrl] = line.split(',');

  await supabase.from('puzzles').insert({
    fen,
    moves,
    rating: parseInt(rating),
    rating_deviation: parseFloat(ratingDeviation),
    themes: themes.split(' '),
    game_url: gameUrl,
    popularity: parseInt(popularity),
  });
}
```

---

## 🔧 TROUBLESHOOTING

### Migration Fails

**Error:** "relation already exists"
```sql
-- Drop existing tables (careful!)
DROP TABLE IF EXISTS tournament_pairings CASCADE;
DROP TABLE IF EXISTS tournament_rounds CASCADE;
DROP TABLE IF EXISTS tournament_games CASCADE;
-- Then re-run migration
```

### RLS Blocks All Access

**Error:** "new row violates row-level security policy"
```sql
-- Temporarily disable RLS for testing
ALTER TABLE users DISABLE ROW LEVEL SECURITY;

-- Re-enable after fixing
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
```

### No Puzzles Showing

```sql
-- Check if puzzles exist
SELECT COUNT(*) FROM puzzles;

-- Check if RLS allows access
SELECT * FROM puzzles LIMIT 1;

-- If empty, re-run seed script
```

---

## 📈 MONITORING

### Check Database Size

```sql
SELECT
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
```

### Check Active Connections

```sql
SELECT count(*) as connections
FROM pg_stat_activity
WHERE datname = current_database();
```

### Check Realtime Subscriptions

```sql
SELECT * FROM pg_stat_subscription;
```

---

## 🎯 NEXT STEPS

After database is set up:

1. ✅ Test frontend locally: `cd frontend && npm run dev`
2. ✅ Test backend locally: `cd backend && npm run dev`
3. ✅ Create test user via Telegram
4. ✅ Try playing a game
5. ✅ Try solving a puzzle
6. ✅ Try joining a tournament

---

## 📞 SUPPORT

**Issues?**
- Check Supabase Dashboard → Logs
- Check Browser Console for errors
- Check Backend logs: `docker logs backend`
- Review AUDIT_REPORT.md for known issues

**Supabase Docs:**
- https://supabase.com/docs/guides/database
- https://supabase.com/docs/guides/realtime
- https://supabase.com/docs/guides/auth

---

**Generated:** 2025-11-23
**Status:** Ready for setup
