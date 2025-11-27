#!/bin/bash

# Chess Telegram Mini App - Quick Setup Script
# This script helps set up environment variables for authentication

set -e

echo "🚀 Chess Telegram Mini App - Quick Setup"
echo "========================================="
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if .env already exists
if [ -f ".env" ]; then
    echo -e "${YELLOW}⚠️  .env file already exists!${NC}"
    read -p "Do you want to overwrite it? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Aborted."
        exit 1
    fi
fi

echo ""
echo "📋 Please provide the following information:"
echo ""

# Supabase URL
read -p "Supabase URL (https://xxx.supabase.co): " SUPABASE_URL
if [ -z "$SUPABASE_URL" ]; then
    echo -e "${RED}❌ Supabase URL is required!${NC}"
    exit 1
fi

# Supabase Anon Key
read -p "Supabase Anon Key: " SUPABASE_ANON_KEY
if [ -z "$SUPABASE_ANON_KEY" ]; then
    echo -e "${RED}❌ Supabase Anon Key is required!${NC}"
    exit 1
fi

# Supabase Service Key
read -p "Supabase Service Role Key: " SUPABASE_SERVICE_KEY
if [ -z "$SUPABASE_SERVICE_KEY" ]; then
    echo -e "${RED}❌ Supabase Service Key is required!${NC}"
    exit 1
fi

# Supabase JWT Secret
read -p "Supabase JWT Secret: " SUPABASE_JWT_SECRET
if [ -z "$SUPABASE_JWT_SECRET" ]; then
    echo -e "${RED}❌ Supabase JWT Secret is required!${NC}"
    exit 1
fi

# Telegram Bot Token
read -p "Telegram Bot Token (from @BotFather): " TELEGRAM_BOT_TOKEN
if [ -z "$TELEGRAM_BOT_TOKEN" ]; then
    echo -e "${RED}❌ Telegram Bot Token is required!${NC}"
    exit 1
fi

# Backend URL
read -p "Backend URL [http://localhost:3000]: " BACKEND_URL
BACKEND_URL=${BACKEND_URL:-http://localhost:3000}

# Frontend URL for CORS
read -p "Frontend URL for CORS [*]: " FRONTEND_URL
FRONTEND_URL=${FRONTEND_URL:-*}

echo ""
echo "📝 Creating .env file..."

# Create .env file
cat > .env << EOF
# =====================================
# Chess Telegram Mini App - Environment
# Auto-generated on $(date)
# =====================================

# ===================================
# Supabase Configuration
# ===================================
SUPABASE_URL=$SUPABASE_URL
SUPABASE_ANON_KEY=$SUPABASE_ANON_KEY
SUPABASE_SERVICE_KEY=$SUPABASE_SERVICE_KEY
SUPABASE_JWT_SECRET=$SUPABASE_JWT_SECRET

# ===================================
# Telegram Bot
# ===================================
TELEGRAM_BOT_TOKEN=$TELEGRAM_BOT_TOKEN

# ===================================
# URLs
# ===================================
BACKEND_URL=$BACKEND_URL
FRONTEND_URL=$FRONTEND_URL

# ===================================
# Stockfish (optional)
# ===================================
STOCKFISH_THREADS=2
STOCKFISH_HASH_SIZE=512

# ===================================
# AI Provider (optional)
# ===================================
AI_PROVIDER=deepseek
AI_API_KEY=

# ===================================
# CORS
# ===================================
CORS_ORIGIN=$FRONTEND_URL
EOF

echo -e "${GREEN}✅ .env file created!${NC}"

# Create frontend/.env
echo ""
echo "📝 Creating frontend/.env file..."

mkdir -p frontend

cat > frontend/.env << EOF
# Frontend Environment Variables
# Auto-generated on $(date)

# Supabase
VITE_SUPABASE_URL=$SUPABASE_URL
VITE_SUPABASE_ANON_KEY=$SUPABASE_ANON_KEY

# Backend API
VITE_BACKEND_URL=$BACKEND_URL
VITE_ENGINE_API_URL=$BACKEND_URL
EOF

echo -e "${GREEN}✅ frontend/.env file created!${NC}"

# Create backend/.env (optional)
echo ""
read -p "Do you want to create backend/.env as well? (y/N): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    mkdir -p backend

    cat > backend/.env << EOF
# Backend Environment Variables
# Auto-generated on $(date)

PORT=3000
NODE_ENV=development

# Supabase
SUPABASE_URL=$SUPABASE_URL
SUPABASE_SERVICE_KEY=$SUPABASE_SERVICE_KEY
SUPABASE_JWT_SECRET=$SUPABASE_JWT_SECRET

# Telegram
TELEGRAM_BOT_TOKEN=$TELEGRAM_BOT_TOKEN

# CORS
FRONTEND_URL=$FRONTEND_URL

# Redis (optional)
REDIS_HOST=localhost
REDIS_PORT=6379
EOF

    echo -e "${GREEN}✅ backend/.env file created!${NC}"
fi

echo ""
echo "========================================="
echo -e "${GREEN}🎉 Setup Complete!${NC}"
echo "========================================="
echo ""
echo "Next steps:"
echo "  1. Apply Supabase migrations:"
echo "     supabase db push"
echo ""
echo "  2. Start the application:"
echo "     docker-compose -f docker-compose.vps.yml up -d"
echo ""
echo "  3. Test authentication:"
echo "     export TELEGRAM_BOT_TOKEN=$TELEGRAM_BOT_TOKEN"
echo "     node test-auth.js"
echo ""
echo "  4. Check if user was created:"
echo "     Open Supabase Dashboard → Table Editor → users"
echo ""
echo "For troubleshooting, see DEBUG_AUTH.md"
echo ""
