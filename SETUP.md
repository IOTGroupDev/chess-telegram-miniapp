# Chess Telegram Mini App - Setup Guide

Complete setup instructions for the Chess Telegram Mini App project.

## 📋 Prerequisites

Before starting, ensure you have:

- **Node.js** v20+ ([Download](https://nodejs.org/))
- **npm** v10+ (comes with Node.js)
- **Docker** & **Docker Compose** (optional, for containerized deployment)
- **Stockfish Chess Engine** (required for AI games)
- **Supabase Account** ([Create free account](https://supabase.com))

---

## 🚀 Quick Start (Development)

### 1. Clone & Install Dependencies

```bash
# Clone repository
git clone https://github.com/IOTGroupDev/chess-telegram-miniapp.git
cd chess-telegram-miniapp

# Install all dependencies (monorepo)
npm install

# Or install separately
cd frontend && npm install
cd ../backend && npm install
```

### 2. Setup Supabase

1. Create a new project at [supabase.com](https://supabase.com)
2. Go to **Settings** → **API** and copy:
   - Project URL
   - `anon` public key
   - `service_role` secret key (for backend)

3. Apply database migrations:

```bash
# Install Supabase CLI
npm install -g supabase

# Link to your project
supabase link --project-ref <your-project-ref>

# Push database schema
supabase db push
```

### 3. Install Stockfish

#### Ubuntu/Debian:
```bash
sudo apt-get update
sudo apt-get install stockfish

# Verify installation
which stockfish
# Should output: /usr/games/stockfish
```

#### macOS (Homebrew):
```bash
brew install stockfish

# Verify installation
which stockfish
# Should output: /opt/homebrew/bin/stockfish or /usr/local/bin/stockfish
```

#### Windows:
1. Download from [stockfishchess.org](https://stockfishchess.org/download/)
2. Extract to `C:\Program Files\Stockfish\`
3. Add to PATH or note the full path

### 4. Configure Environment Variables

#### Frontend Configuration

```bash
cd frontend
cp .env.example .env
```

Edit `frontend/.env`:

```env
# Supabase Configuration (from step 2)
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-public-key-here

# Backend API URL
VITE_ENGINE_API_URL=http://localhost:3000

# Telegram Bot Name (optional for development)
VITE_TELEGRAM_BOT_NAME=your_chess_bot
```

#### Backend Configuration

```bash
cd backend
cp .env.example .env
```

Edit `backend/.env`:

```env
# Server
PORT=3000
NODE_ENV=development

# CORS - Frontend URL
FRONTEND_URL=http://localhost:5173

# Supabase (from step 2)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your-service-role-secret-key-here

# Stockfish Path (from step 3)
# Linux: /usr/games/stockfish
# macOS Homebrew: /opt/homebrew/bin/stockfish
# Windows: C:/Program Files/Stockfish/stockfish.exe
STOCKFISH_PATH=/usr/games/stockfish
STOCKFISH_THREADS=2
STOCKFISH_HASH_SIZE=256

# Redis (optional - leave empty for development)
REDIS_HOST=
REDIS_PORT=6379
REDIS_PASSWORD=
```

### 5. Run Development Servers

Open **two terminal windows**:

#### Terminal 1 - Backend:
```bash
cd backend
npm run start:dev

# Should see:
# 🚀 Chess Backend running on port 3000
# Stockfish initialized successfully
```

#### Terminal 2 - Frontend:
```bash
cd frontend
npm run dev

# Should see:
# VITE ready in XXX ms
# ➜ Local: http://localhost:5173
```

### 6. Open in Browser

Visit **http://localhost:5173**

The app will work in "mock mode" (without Telegram). To test in Telegram:

1. Create a Telegram Bot via [@BotFather](https://t.me/BotFather)
2. Set up Mini App URL in BotFather
3. Configure webhook (see production setup)

---

## 🐳 Docker Setup (Recommended for Production)

### Prerequisites

- Docker & Docker Compose installed
- Supabase project created (see step 2 above)

### 1. Create Environment File

```bash
# Copy example
cp .env.vps.example .env

# Edit with your credentials
nano .env
```

Required variables:
```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_KEY=your-service-key
BACKEND_URL=https://api.your-domain.com
```

### 2. Build & Run

```bash
# Build and start all services
docker-compose -f docker-compose.vps.yml up -d

# Check logs
docker-compose -f docker-compose.vps.yml logs -f

# Check service health
docker-compose -f docker-compose.vps.yml ps
```

Services included:
- **Frontend** - Nginx serving React build
- **Backend** - NestJS API with Stockfish
- **Redis** - Caching for engine positions
- **Nginx** - Reverse proxy with SSL
- **Certbot** - Auto SSL certificate renewal

### 3. Setup SSL (Let's Encrypt)

```bash
# Run init script
./scripts/init-letsencrypt.sh your-domain.com

# Or manually with certbot
docker-compose -f docker-compose.vps.yml run --rm certbot certonly \
  --webroot -w /var/www/certbot \
  -d your-domain.com
```

---

## 🧪 Testing

### Test Backend API

```bash
# Health check
curl http://localhost:3000/health

# Test Stockfish
curl -X POST http://localhost:3000/api/engine/best-move \
  -H "Content-Type: application/json" \
  -d '{"fen": "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1", "depth": 10}'

# Should return:
# {"success":true,"data":{"bestMove":"e2e4",...}}
```

### Test Frontend

1. Open http://localhost:5173
2. Click "Play vs AI"
3. Make a move by dragging a piece
4. AI should respond within 1-2 seconds

### Test Telegram Integration

1. Open your bot in Telegram
2. Send `/start` command
3. Mini App should open with full functionality

---

## 📝 Common Issues & Solutions

### Issue: "Stockfish binary not found"

**Solution:**
```bash
# Verify Stockfish is installed
which stockfish

# If not found, install it (see step 3)
# Then update STOCKFISH_PATH in backend/.env
```

### Issue: "CORS error" or "Failed to fetch"

**Solution:**
```bash
# Check FRONTEND_URL in backend/.env matches your frontend URL
# For development: http://localhost:5173
# For production: https://your-frontend.vercel.app

# Restart backend after changing .env
cd backend
npm run start:dev
```

### Issue: "Supabase: Invalid API key"

**Solution:**
- Verify you copied the correct keys from Supabase dashboard
- Frontend uses `anon` public key
- Backend uses `service_role` secret key
- Make sure there are no extra spaces in .env files

### Issue: Chess pieces not draggable

**Solution:**
- Clear browser cache (Ctrl+Shift+Delete)
- Check browser console for errors (F12)
- Verify `arePiecesDraggable` is not disabled
- Make sure game is not in "game over" state

### Issue: AI not responding

**Solution:**
1. Check backend logs: `docker-compose logs backend` or terminal output
2. Verify Stockfish initialized: should see "Stockfish initialized successfully"
3. Test API directly (see Testing section above)
4. Check `VITE_ENGINE_API_URL` in frontend/.env

---

## 🔧 Development Tips

### Hot Reload

Both frontend and backend support hot reload:

```bash
# Frontend - changes auto-reload
cd frontend && npm run dev

# Backend - changes auto-restart
cd backend && npm run start:dev
```

### View Logs

```bash
# Docker logs
docker-compose -f docker-compose.vps.yml logs -f backend
docker-compose -f docker-compose.vps.yml logs -f frontend

# PM2 logs (if using PM2)
pm2 logs backend
pm2 logs frontend
```

### Database Migrations

```bash
# Create new migration
supabase migration new migration_name

# Apply migrations
supabase db push

# Reset database (⚠️ destroys data)
supabase db reset
```

### Build for Production

```bash
# Frontend
cd frontend
npm run build
# Output: frontend/dist/

# Backend
cd backend
npm run build
# Output: backend/dist/
```

---

## 🌐 Production Deployment

### Option 1: VPS with Docker (Recommended)

See **Docker Setup** section above.

**Pros:**
- Full control
- All services in one place
- Predictable costs

**Requirements:**
- 2GB RAM minimum
- 1 vCPU minimum
- Docker installed

### Option 2: Vercel (Frontend) + Railway (Backend)

#### Deploy Frontend to Vercel:

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
cd frontend
vercel --prod
```

Set environment variables in Vercel dashboard.

#### Deploy Backend to Railway:

1. Connect GitHub repo to Railway
2. Select `backend` directory as root
3. Set environment variables
4. Add Dockerfile detection
5. Deploy

### Option 3: Manual VPS Setup

```bash
# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install Stockfish
sudo apt-get install stockfish

# Clone and setup
git clone <repo>
cd chess-telegram-miniapp
npm install

# Build both
cd frontend && npm run build
cd ../backend && npm run build

# Use PM2 for process management
npm install -g pm2
pm2 start backend/dist/main.js --name chess-backend
pm2 startup
pm2 save
```

---

## 📚 Additional Resources

- [NestJS Documentation](https://docs.nestjs.com/)
- [React Documentation](https://react.dev/)
- [Supabase Documentation](https://supabase.com/docs)
- [Telegram Bot API](https://core.telegram.org/bots/api)
- [Telegram Mini Apps](https://core.telegram.org/bots/webapps)
- [Stockfish Documentation](https://github.com/official-stockfish/Stockfish)
- [chess.js Documentation](https://github.com/jhlywa/chess.js)

---

## 🆘 Getting Help

- **Issues**: [GitHub Issues](https://github.com/IOTGroupDev/chess-telegram-miniapp/issues)
- **Discussions**: [GitHub Discussions](https://github.com/IOTGroupDev/chess-telegram-miniapp/discussions)
- **Telegram**: Join our developer chat (link in README)

---

## ✅ Checklist

Before going to production, verify:

- [ ] All environment variables set correctly
- [ ] Stockfish installed and working
- [ ] Supabase configured and migrations applied
- [ ] SSL certificate installed (HTTPS)
- [ ] CORS configured for production domain
- [ ] Redis connected (optional but recommended)
- [ ] Backend health check returns 200
- [ ] Frontend loads without console errors
- [ ] AI games work (can play vs AI)
- [ ] Online games work (can play vs player)
- [ ] Telegram Mini App opens correctly
- [ ] All buttons respond with haptic feedback

---

**Last Updated**: November 25, 2025
**Version**: 1.0.0
