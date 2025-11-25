#!/bin/bash

# ===================================
# Script to check .env configuration
# ===================================

echo "🔍 Checking .env file configuration..."
echo ""

# Check if .env exists
if [ ! -f .env ]; then
    echo "❌ .env file not found!"
    echo "   Copy from template: cp .env.vps.example .env"
    exit 1
fi

echo "✅ .env file exists"
echo ""

# Function to check if variable is set
check_var() {
    local var_name=$1
    local required=$2
    local value=$(grep "^${var_name}=" .env | cut -d'=' -f2)

    if [ -z "$value" ] || [ "$value" = "your-project.supabase.co" ] || [[ "$value" == *"your-"* ]]; then
        if [ "$required" = "required" ]; then
            echo "❌ $var_name - NOT SET (required)"
            return 1
        else
            echo "⚠️  $var_name - not set (optional)"
            return 0
        fi
    else
        echo "✅ $var_name - configured"
        return 0
    fi
}

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📦 Required Variables"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
check_var "SUPABASE_URL" "required"
check_var "SUPABASE_ANON_KEY" "required"
check_var "SUPABASE_SERVICE_KEY" "required"
check_var "BACKEND_URL" "required"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "⚙️  Optional Variables"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
check_var "STOCKFISH_THREADS" "optional"
check_var "STOCKFISH_HASH_SIZE" "optional"
check_var "AI_API_KEY" "optional"
check_var "CORS_ORIGIN" "optional"
check_var "DOMAIN" "optional"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🐳 Docker Compose Status"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if command -v docker-compose &> /dev/null; then
    if docker-compose -f docker-compose.vps.yml ps 2>/dev/null | grep -q "Up"; then
        echo "✅ Containers are running"
        docker-compose -f docker-compose.vps.yml ps
    else
        echo "⚠️  Containers are not running"
        echo "   Start with: docker-compose -f docker-compose.vps.yml up -d"
    fi
else
    echo "⚠️  docker-compose not found"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📝 Next Steps"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "1. Edit .env file: nano .env"
echo "2. Set all required variables (marked with ❌)"
echo "3. Deploy: docker-compose -f docker-compose.vps.yml up -d"
echo "4. Check logs: docker-compose -f docker-compose.vps.yml logs -f"
echo ""
echo "For detailed mapping, see: ENV_MAPPING.md"
echo ""
