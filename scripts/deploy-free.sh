#!/bin/bash

# =====================================
# FREE Architecture Deployment Script
# Total cost: $0/month + AI API
# =====================================

set -e  # Exit on error

echo "🚀 Chess App - FREE Deployment"
echo "================================"
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if required tools are installed
check_requirements() {
    echo "📋 Checking requirements..."

    local missing=()

    if ! command -v fly &> /dev/null; then
        missing+=("fly (https://fly.io/docs/hands-on/install-flyctl/)")
    fi

    if ! command -v supabase &> /dev/null; then
        missing+=("supabase (npm install -g supabase)")
    fi

    if ! command -v node &> /dev/null; then
        missing+=("node (https://nodejs.org)")
    fi

    if [ ${#missing[@]} -ne 0 ]; then
        echo -e "${RED}❌ Missing requirements:${NC}"
        for req in "${missing[@]}"; do
            echo "   - $req"
        done
        exit 1
    fi

    echo -e "${GREEN}✅ All requirements installed${NC}"
    echo ""
}

# Step 1: Setup Supabase
setup_supabase() {
    echo "1️⃣  Setting up Supabase..."
    echo "   → Go to https://supabase.com and create project (FREE)"
    echo ""
    read -p "   Press Enter when project is created..."

    read -p "   Enter your Supabase Project URL: " SUPABASE_URL
    read -p "   Enter your Supabase Anon Key: " SUPABASE_ANON_KEY
    read -s -p "   Enter your Supabase Service Key: " SUPABASE_SERVICE_KEY
    echo ""

    echo "   📤 Pushing migrations to Supabase..."
    cd supabase
    supabase link --project-ref ${SUPABASE_URL##*/}
    supabase db push
    cd ..

    echo -e "${GREEN}   ✅ Supabase configured${NC}"
    echo ""
}

# Step 2: Setup Upstash Redis
setup_redis() {
    echo "2️⃣  Setting up Upstash Redis..."
    echo "   → Go to https://upstash.com and create Redis database (FREE)"
    echo ""
    read -p "   Press Enter when Redis is created..."

    read -p "   Enter your Upstash Redis URL: " REDIS_URL

    echo -e "${GREEN}   ✅ Redis configured${NC}"
    echo ""
}

# Step 3: Setup AI API
setup_ai() {
    echo "3️⃣  Setting up AI API..."
    echo "   Choose AI provider:"
    echo "   1) Deepseek (CHEAPEST - $0.14 per 1M tokens) ✅"
    echo "   2) Claude API ($3 per 1M tokens)"
    echo "   3) OpenAI GPT-4 ($10 per 1M tokens)"
    echo ""
    read -p "   Choice [1]: " AI_CHOICE
    AI_CHOICE=${AI_CHOICE:-1}

    case $AI_CHOICE in
        1)
            echo "   → Go to https://platform.deepseek.com"
            AI_PROVIDER="deepseek"
            ;;
        2)
            echo "   → Go to https://console.anthropic.com"
            AI_PROVIDER="claude"
            ;;
        3)
            echo "   → Go to https://platform.openai.com"
            AI_PROVIDER="openai"
            ;;
    esac

    echo ""
    read -p "   Press Enter when API key is created..."
    read -s -p "   Enter your API Key: " AI_API_KEY
    echo ""

    echo -e "${GREEN}   ✅ AI API configured${NC}"
    echo ""
}

# Step 4: Deploy Backend to Fly.io
deploy_backend() {
    echo "4️⃣  Deploying Backend to Fly.io..."

    cd backend

    # Login to Fly.io
    echo "   🔐 Logging in to Fly.io..."
    fly auth login

    # Create app
    echo "   📦 Creating Fly.io app..."
    fly launch --name chess-backend --no-deploy --region fra

    # Set secrets
    echo "   🔒 Setting secrets..."
    fly secrets set \
        SUPABASE_URL="$SUPABASE_URL" \
        SUPABASE_SERVICE_KEY="$SUPABASE_SERVICE_KEY" \
        REDIS_URL="$REDIS_URL" \
        AI_API_KEY="$AI_API_KEY" \
        AI_PROVIDER="$AI_PROVIDER"

    # Deploy
    echo "   🚀 Deploying..."
    fly deploy

    BACKEND_URL=$(fly status --json | jq -r '.Hostname')

    cd ..

    echo -e "${GREEN}   ✅ Backend deployed to https://$BACKEND_URL${NC}"
    echo ""
}

# Step 5: Deploy Frontend to Cloudflare Pages
deploy_frontend() {
    echo "5️⃣  Deploying Frontend to Cloudflare Pages..."

    cd frontend

    # Create .env.production
    cat > .env.production << EOF
VITE_SUPABASE_URL=$SUPABASE_URL
VITE_SUPABASE_ANON_KEY=$SUPABASE_ANON_KEY
VITE_ENGINE_API_URL=https://$BACKEND_URL
EOF

    # Build
    echo "   🔨 Building frontend..."
    npm install
    npm run build

    echo ""
    echo "   Manual step required:"
    echo "   1. Go to https://pages.cloudflare.com"
    echo "   2. Connect your GitHub repository"
    echo "   3. Set build command: npm run build"
    echo "   4. Set build output: dist"
    echo "   5. Add environment variables from .env.production"
    echo ""
    read -p "   Press Enter when frontend is deployed..."

    read -p "   Enter your Cloudflare Pages URL: " FRONTEND_URL

    cd ..

    echo -e "${GREEN}   ✅ Frontend deployed to $FRONTEND_URL${NC}"
    echo ""
}

# Summary
show_summary() {
    echo "================================"
    echo "🎉 Deployment Complete!"
    echo "================================"
    echo ""
    echo "📊 Your FREE infrastructure:"
    echo "   • Frontend:  $FRONTEND_URL"
    echo "   • Backend:   https://$BACKEND_URL"
    echo "   • Database:  Supabase (500MB free)"
    echo "   • Redis:     Upstash (10K commands/day free)"
    echo "   • AI:        $AI_PROVIDER"
    echo ""
    echo "💰 Monthly cost: $0 + AI API usage"
    echo ""
    echo "📈 Scaling limits (free tier):"
    echo "   • Users:     ~10-50K MAU"
    echo "   • Games:     ~100K per month"
    echo "   • Storage:   500MB database"
    echo "   • Bandwidth: 2GB (Supabase) + 160GB (Fly.io)"
    echo ""
    echo "🔗 Useful commands:"
    echo "   • Backend logs:  fly logs -a chess-backend"
    echo "   • Backend SSH:   fly ssh console -a chess-backend"
    echo "   • Supabase:      https://app.supabase.com"
    echo "   • Upstash:       https://console.upstash.com"
    echo ""
    echo "🚀 Next steps:"
    echo "   1. Test your app: $FRONTEND_URL"
    echo "   2. Monitor usage on free tier dashboards"
    echo "   3. Upgrade if needed (when you hit limits)"
    echo ""
}

# Main execution
main() {
    check_requirements
    setup_supabase
    setup_redis
    setup_ai
    deploy_backend
    deploy_frontend
    show_summary
}

# Run
main
