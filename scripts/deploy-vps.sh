#!/bin/bash

# =====================================
# VPS MVP Deployment Script
# NestJS + Redis + Supabase Free
# Cost: $0/month (VPS already paid)
# =====================================

set -e  # Exit on error

echo "🚀 Chess App - VPS MVP Deployment"
echo "===================================="
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0;m' # No Color

# Check if running as root
if [[ $EUID -eq 0 ]]; then
   echo -e "${YELLOW}⚠️  This script should not be run as root${NC}"
   echo "Run as normal user with sudo privileges"
   exit 1
fi

# Check requirements
check_requirements() {
    echo "📋 Checking requirements..."

    local missing=()

    # Docker
    if ! command -v docker &> /dev/null; then
        missing+=("docker")
    fi

    # Docker Compose
    if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
        missing+=("docker-compose")
    fi

    # Git
    if ! command -v git &> /dev/null; then
        missing+=("git")
    fi

    if [ ${#missing[@]} -ne 0 ]; then
        echo -e "${RED}❌ Missing requirements:${NC}"
        for req in "${missing[@]}"; do
            echo "   - $req"
        done
        echo ""
        echo "Install with:"
        echo "  curl -fsSL https://get.docker.com | sh"
        echo "  sudo usermod -aG docker \$USER"
        exit 1
    fi

    echo -e "${GREEN}✅ All requirements installed${NC}"
    echo ""
}

# Install dependencies on VPS
install_dependencies() {
    echo "📦 Installing system dependencies..."

    # Update package list
    sudo apt-get update -qq

    # Install required packages
    sudo apt-get install -y -qq \
        curl \
        wget \
        git \
        stockfish \
        certbot \
        python3-certbot-nginx

    echo -e "${GREEN}✅ Dependencies installed${NC}"
    echo ""
}

# Setup Supabase
setup_supabase() {
    echo "1️⃣  Setting up Supabase (FREE)..."
    echo ""
    echo "   Open: ${BLUE}https://supabase.com${NC}"
    echo "   1. Create new project (FREE tier)"
    echo "   2. Wait for database to initialize (~2 min)"
    echo "   3. Go to Settings > API"
    echo ""
    read -p "   Press Enter when project is ready..."

    read -p "   Enter Supabase URL: " SUPABASE_URL
    read -p "   Enter Supabase Anon Key: " SUPABASE_ANON_KEY
    read -s -p "   Enter Supabase Service Key: " SUPABASE_SERVICE_KEY
    echo ""

    # Install Supabase CLI
    if ! command -v supabase &> /dev/null; then
        echo "   📥 Installing Supabase CLI..."
        npm install -g supabase
    fi

    # Apply migrations
    echo "   📤 Applying database migrations..."
    cd supabase
    supabase login
    supabase link --project-ref ${SUPABASE_URL##*/projects/}
    supabase db push
    cd ..

    echo -e "${GREEN}   ✅ Supabase configured (500MB DB, 50K MAU)${NC}"
    echo ""
}

# Setup AI API
setup_ai() {
    echo "2️⃣  Setting up AI API (for game analysis)..."
    echo ""
    echo "   Recommended: Deepseek V3 (70B, ultra cheap)"
    echo "   Cost: $0.14 per 1M tokens (~$0.30 for 1000 analyses)"
    echo ""
    echo "   Open: ${BLUE}https://platform.deepseek.com${NC}"
    echo "   1. Sign up (get $5 free credit)"
    echo "   2. Create API key"
    echo ""
    read -p "   Press Enter when API key is ready..."

    read -s -p "   Enter Deepseek API Key: " AI_API_KEY
    echo ""

    AI_PROVIDER="deepseek"

    echo -e "${GREEN}   ✅ AI API configured${NC}"
    echo ""
}

# Setup domain (optional)
setup_domain() {
    echo "3️⃣  Domain configuration..."
    echo ""
    read -p "   Do you have a domain? (y/N): " HAS_DOMAIN

    if [[ $HAS_DOMAIN =~ ^[Yy]$ ]]; then
        read -p "   Enter your domain (e.g., chess.example.com): " DOMAIN
        read -p "   Enter your email (for SSL): " EMAIL

        # Get VPS IP
        VPS_IP=$(curl -s ifconfig.me)
        echo ""
        echo "   📝 DNS Configuration:"
        echo "   ─────────────────────"
        echo "   Add these DNS records:"
        echo "   A Record:  $DOMAIN  →  $VPS_IP"
        echo "   A Record:  api.$DOMAIN  →  $VPS_IP"
        echo ""
        read -p "   Press Enter when DNS is configured..."

        BACKEND_URL="https://api.$DOMAIN"
        USE_SSL=true
    else
        VPS_IP=$(curl -s ifconfig.me)
        DOMAIN=$VPS_IP
        EMAIL="admin@localhost"
        BACKEND_URL="http://$VPS_IP:3000"
        USE_SSL=false

        echo "   Using IP address: $VPS_IP"
        echo "   Note: SSL will not be configured"
    fi

    echo -e "${GREEN}   ✅ Domain configured${NC}"
    echo ""
}

# Create .env file
create_env() {
    echo "4️⃣  Creating environment file..."

    cat > .env << EOF
# Supabase Configuration
SUPABASE_URL=$SUPABASE_URL
SUPABASE_ANON_KEY=$SUPABASE_ANON_KEY
SUPABASE_SERVICE_KEY=$SUPABASE_SERVICE_KEY

# Backend URL
BACKEND_URL=$BACKEND_URL

# AI API
AI_PROVIDER=$AI_PROVIDER
AI_API_KEY=$AI_API_KEY

# Stockfish
STOCKFISH_THREADS=2
STOCKFISH_HASH_SIZE=512

# Domain
DOMAIN=$DOMAIN
EMAIL=$EMAIL

# CORS
CORS_ORIGIN=*
EOF

    echo -e "${GREEN}   ✅ Environment file created${NC}"
    echo ""
}

# Deploy with Docker
deploy_docker() {
    echo "5️⃣  Deploying with Docker..."

    # Stop existing containers
    if docker ps -a | grep -q chess; then
        echo "   🛑 Stopping existing containers..."
        docker-compose -f docker-compose.vps.yml down
    fi

    # Build and start
    echo "   🔨 Building and starting containers..."
    docker-compose -f docker-compose.vps.yml up -d --build

    # Wait for health checks
    echo "   ⏳ Waiting for services to be healthy..."
    sleep 10

    # Check status
    docker-compose -f docker-compose.vps.yml ps

    echo -e "${GREEN}   ✅ Docker containers running${NC}"
    echo ""
}

# Setup SSL with Let's Encrypt
setup_ssl() {
    if [ "$USE_SSL" = true ]; then
        echo "6️⃣  Setting up SSL certificates..."

        # Create certbot directories
        mkdir -p certbot/conf certbot/www

        # Get certificate
        docker-compose -f docker-compose.vps.yml run --rm certbot \
            certonly --webroot -w /var/www/certbot \
            --email $EMAIL \
            --agree-tos \
            --no-eff-email \
            -d $DOMAIN \
            -d api.$DOMAIN

        # Reload nginx
        docker-compose -f docker-compose.vps.yml exec nginx nginx -s reload

        echo -e "${GREEN}   ✅ SSL configured${NC}"
    else
        echo "6️⃣  Skipping SSL (no domain configured)"
    fi
    echo ""
}

# Show summary
show_summary() {
    echo "================================"
    echo "🎉 Deployment Complete!"
    echo "================================"
    echo ""
    echo "📊 Your MVP Infrastructure:"
    echo ""
    echo "   🖥️  VPS Services (Docker):"
    echo "      • NestJS Backend"
    echo "      • Redis Cache"
    echo "      • Nginx Proxy"
    echo ""
    echo "   ☁️  Supabase Services (FREE):"
    echo "      • PostgreSQL (500MB)"
    echo "      • Real-time WebSocket"
    echo "      • Auto-generated APIs"
    echo ""
    echo "   🔗 URLs:"
    if [ "$USE_SSL" = true ]; then
        echo "      • Frontend:  https://$DOMAIN"
        echo "      • Backend:   https://api.$DOMAIN"
        echo "      • API Docs:  https://api.$DOMAIN/api"
    else
        echo "      • Frontend:  http://$VPS_IP"
        echo "      • Backend:   http://$VPS_IP:3000"
        echo "      • API Docs:  http://$VPS_IP:3000/api"
    fi
    echo ""
    echo "   💰 Monthly Cost:"
    echo "      • VPS:       $0 (already paid)"
    echo "      • Supabase:  $0 (free tier)"
    echo "      • AI API:    ~$0.30 (for 1K analyses)"
    echo "      ─────────────────────────────"
    echo "      • TOTAL:     $0.30/month 🔥"
    echo ""
    echo "   📈 Capacity (FREE tier):"
    echo "      • Users:     10K-50K MAU"
    echo "      • Games:     100K per month"
    echo "      • Storage:   500MB database"
    echo "      • Bandwidth: 2GB + unlimited"
    echo ""
    echo "   🔧 Useful Commands:"
    echo ""
    echo "      # View logs"
    echo "      docker-compose -f docker-compose.vps.yml logs -f"
    echo ""
    echo "      # Restart services"
    echo "      docker-compose -f docker-compose.vps.yml restart"
    echo ""
    echo "      # Stop services"
    echo "      docker-compose -f docker-compose.vps.yml down"
    echo ""
    echo "      # Update code"
    echo "      git pull && docker-compose -f docker-compose.vps.yml up -d --build"
    echo ""
    echo "      # Monitor resources"
    echo "      docker stats"
    echo ""
    echo "      # Supabase dashboard"
    echo "      https://app.supabase.com/project/${SUPABASE_URL##*/projects/}"
    echo ""
    echo "   🚀 Next Steps:"
    echo "      1. Test your app"
    echo "      2. Monitor logs for errors"
    echo "      3. Setup monitoring (optional)"
    echo "      4. Configure backups (Supabase auto-backups enabled)"
    echo ""
}

# Main execution
main() {
    check_requirements

    echo -e "${YELLOW}This will deploy Chess App on your VPS${NC}"
    echo "Using: Docker + Supabase Free"
    echo ""
    read -p "Continue? (y/N): " CONFIRM

    if [[ ! $CONFIRM =~ ^[Yy]$ ]]; then
        echo "Deployment cancelled"
        exit 0
    fi

    install_dependencies
    setup_supabase
    setup_ai
    setup_domain
    create_env
    deploy_docker
    setup_ssl
    show_summary
}

# Run
main
