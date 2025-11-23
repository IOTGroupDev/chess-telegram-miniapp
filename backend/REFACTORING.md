# Backend Refactoring - Supabase Hybrid Architecture

## What Changed

The backend has been refactored from a full-stack NestJS application to a **hybrid architecture** where Supabase handles most operations and NestJS only handles CPU-intensive chess-specific tasks.

---

## ❌ Removed Modules (Deprecated)

### 1. **PrismaModule** ❌
- **Why removed**: Database operations now handled by Supabase client on frontend
- **Replaced by**: Supabase client (@supabase/supabase-js) on frontend
- **Migration**: All CRUD operations moved to frontend using Supabase hooks

### 2. **GameModule** ❌
- **Why removed**: Game state managed by Supabase with Row Level Security
- **Replaced by**: Frontend hooks (useSupabaseGame, useGameClock)
- **Migration**: Game creation, moves, and state updates now done via Supabase client

### 3. **UserModule** ❌
- **Why removed**: User management handled by Supabase Auth + direct table access
- **Replaced by**: Supabase Auth for authentication, direct table queries for user data
- **Migration**: User CRUD operations done on frontend

### 4. **WebSocketModule** ❌
- **Why removed**: Real-time synchronization now handled by Supabase Realtime
- **Replaced by**: Supabase Realtime channels (WebSocket under the hood)
- **Migration**: Socket.io events replaced by Supabase channel subscriptions

---

## ✅ New Modules (Active)

### 1. **EngineModule** ✅
**Purpose**: Chess engine operations (Stockfish via UCI protocol)

**Endpoints**:
- `POST /api/engine/analyze` - Full position analysis with multiple lines
- `POST /api/engine/best-move` - Get best move for position
- `POST /api/engine/quick-eval` - Fast evaluation (lower depth)
- `GET /api/engine/stats` - Engine queue and cache statistics
- `POST /api/engine/clear-cache` - Clear Redis cache

**Features**:
- Real Stockfish integration (replaces mock)
- Request queue for fairness
- Redis caching (24h TTL)
- Configurable depth and multi-PV

### 2. **RatingModule** ✅
**Purpose**: Glicko-2 rating calculations

**Endpoints**:
- `POST /api/rating/calculate` - Calculate new rating after multiple games
- `POST /api/rating/calculate-game` - Calculate rating after single game
- `POST /api/rating/win-probability` - Estimate win probability
- `POST /api/rating/preview` - Preview rating changes for all outcomes
- `GET /api/rating/default` - Get default rating for new player
- `GET /api/rating/provisional` - Check if rating is provisional

**Features**:
- Complete Glicko-2 algorithm
- Illinois algorithm for volatility
- Win probability estimation
- Separate ratings per time control

### 3. **AnalysisModule** ✅
**Purpose**: AI-powered game analysis

**Endpoints**:
- `POST /api/analysis/game` - Analyze completed game from PGN

**Features**:
- Move-by-move analysis with Stockfish
- Move classification (best/excellent/good/inaccuracy/mistake/blunder)
- Accuracy calculation for both players
- Key moments detection (eval drops > 100cp)
- AI summary via Deepseek/Claude/GPT
- Detailed statistics

---

## Architecture Diagram

### Before (Full NestJS)
```
Frontend ──────┐
               ├──► NestJS Backend ──► PostgreSQL
               │    ├─ WebSocket
               │    ├─ Prisma ORM
               │    ├─ Game Logic
               │    ├─ User Logic
               │    └─ Stockfish (mock)
               │
               └──► Redis Cache
```

### After (Hybrid with Supabase)
```
Frontend ──────┬──► Supabase (Database + Realtime + Auth)
               │    ├─ PostgreSQL (direct access)
               │    ├─ Realtime (WebSocket)
               │    ├─ Row Level Security
               │    └─ Auto-generated API
               │
               └──► NestJS Backend (CPU-intensive only)
                    ├─ Stockfish (real UCI)
                    ├─ Glicko-2 Rating
                    ├─ AI Analysis
                    └─ Redis Cache
```

---

## Benefits

### 1. **Simplicity**
- ✅ 80% less backend code
- ✅ No need to write CRUD endpoints
- ✅ No need to maintain WebSocket synchronization
- ✅ Row Level Security built-in

### 2. **Cost**
- ✅ Supabase Free tier: 500MB, 50K MAU
- ✅ No need for separate database server
- ✅ No need for Redis for sessions (Supabase handles auth)
- ✅ Total cost: $0-0.30/month (only AI API)

### 3. **Performance**
- ✅ Direct database access from frontend (no API roundtrip)
- ✅ Supabase Realtime optimized for WebSocket
- ✅ Backend only does CPU-intensive work
- ✅ Redis caching for Stockfish positions

### 4. **Security**
- ✅ Row Level Security prevents cheating
- ✅ Players can only insert moves on their turn
- ✅ No way to bypass validation
- ✅ Supabase handles JWT auth

---

## Migration Guide

### For Game Operations

**Before (Prisma)**:
```typescript
// Backend
const game = await this.prisma.game.create({
  data: { whitePlayerId, timeControl: 'blitz' }
});
```

**After (Supabase)**:
```typescript
// Frontend
const { data: game } = await supabase
  .from('games')
  .insert({ white_player_id: userId, time_control: 'blitz' })
  .select()
  .single();
```

### For Real-time Updates

**Before (Socket.io)**:
```typescript
// Backend
this.server.to(gameId).emit('move', moveData);

// Frontend
socket.on('move', (data) => {
  updateGameState(data);
});
```

**After (Supabase Realtime)**:
```typescript
// Frontend only!
const channel = supabase.channel(`game:${gameId}`)
  .on('postgres_changes', {
    event: 'INSERT',
    schema: 'public',
    table: 'moves',
    filter: `game_id=eq.${gameId}`
  }, (payload) => {
    updateGameState(payload.new);
  })
  .subscribe();
```

### For Chess Engine Operations

**Before (Mock)**:
```typescript
// Backend returned random moves
const bestMove = this.getRandomMove(position);
```

**After (Real Stockfish)**:
```typescript
// Frontend calls backend API
const response = await fetch(`${API_URL}/api/engine/best-move`, {
  method: 'POST',
  body: JSON.stringify({ fen, depth: 20 })
});
const { bestMove } = await response.json();
```

---

## Files to Keep (Reference Only)

The following directories are kept for reference but are **no longer used**:

- `src/game/` - Old game service (replaced by Supabase hooks)
- `src/user/` - Old user service (replaced by Supabase auth)
- `src/websocket/` - Old WebSocket gateway (replaced by Supabase Realtime)
- `src/prisma/` - Prisma client (replaced by Supabase client)
- `prisma/schema.prisma` - Old schema (see `supabase/migrations/` instead)

**Do not modify these files**. They will be removed in a future cleanup.

---

## Environment Variables

### Before
```bash
DATABASE_URL=postgresql://...
REDIS_URL=redis://...
JWT_SECRET=...
```

### After
```bash
# Supabase (for reading game data on backend if needed)
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_KEY=eyJhbGc...

# Redis (for engine caching only)
REDIS_HOST=redis
REDIS_PORT=6379

# Stockfish
STOCKFISH_PATH=/usr/games/stockfish
STOCKFISH_THREADS=2
STOCKFISH_HASH_SIZE=512

# AI API
AI_PROVIDER=deepseek
AI_API_KEY=sk-...
```

---

## Next Steps

1. ✅ **Backend refactoring** - DONE
2. ⏭️ **Update frontend components** to use Supabase hooks
3. ⏭️ Remove old files after frontend migration is complete
4. ⏭️ Update deployment scripts to remove old dependencies

---

## Questions?

See:
- `HYBRID_SETUP.md` - Complete hybrid architecture guide
- `VPS_MVP_SETUP.md` - VPS deployment guide
- `supabase/migrations/` - Database schema
- `frontend/src/hooks/` - Supabase React hooks
