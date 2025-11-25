#!/bin/bash

echo "========================================="
echo "🔍 Chess Backend API Diagnostic Script"
echo "========================================="
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test 1: Check containers
echo "1️⃣  Checking Docker containers..."
echo "-----------------------------------"
sudo docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" | grep -E "chess-|NAMES"
echo ""

# Test 2: Check nginx config inside container
echo "2️⃣  Checking nginx config inside container..."
echo "-----------------------------------"
echo "Location /api/ block:"
sudo docker exec chess-nginx cat /etc/nginx/conf.d/default.conf 2>/dev/null | grep -A 2 "location /api/"
echo ""

# Test 3: Test nginx config syntax
echo "3️⃣  Testing nginx config syntax..."
echo "-----------------------------------"
sudo docker exec chess-nginx nginx -t 2>&1
echo ""

# Test 4: Check backend directly (from inside Docker network)
echo "4️⃣  Testing backend API directly (inside Docker network)..."
echo "-----------------------------------"
echo "Test: http://backend:3000/api/engine/health"
sudo docker exec chess-nginx wget -qO- http://backend:3000/api/engine/health 2>&1 || echo "${RED}❌ Failed${NC}"
echo ""

# Test 5: Check from localhost
echo "5️⃣  Testing from localhost..."
echo "-----------------------------------"
echo "Test: http://localhost:3000/api/engine/health"
curl -s http://localhost:3000/api/engine/health || echo -e "${RED}❌ Failed${NC}"
echo ""

# Test 6: Check through nginx (internal)
echo "6️⃣  Testing through nginx (from inside container)..."
echo "-----------------------------------"
echo "Test: http://localhost/api/engine/health"
sudo docker exec chess-nginx wget -qO- http://localhost/api/engine/health 2>&1 || echo "${RED}❌ Failed${NC}"
echo ""

# Test 7: Check from outside (public URL)
echo "7️⃣  Testing from outside (public URL)..."
echo "-----------------------------------"
echo "Test: https://asrtalink.vip/api/engine/health"
curl -s https://asrtalink.vip/api/engine/health
echo ""

# Test 8: Check /health endpoint (works)
echo "8️⃣  Testing /health endpoint (should work)..."
echo "-----------------------------------"
echo "Test: https://asrtalink.vip/health"
curl -s https://asrtalink.vip/health
echo ""

# Test 9: Check backend logs
echo "9️⃣  Checking recent backend logs..."
echo "-----------------------------------"
sudo docker logs chess-backend --tail 10 2>&1
echo ""

# Test 10: Check nginx logs
echo "🔟 Checking recent nginx error logs..."
echo "-----------------------------------"
sudo docker logs chess-nginx --tail 10 2>&1 | grep -i error || echo "No errors found"
echo ""

echo "========================================="
echo "🔧 RECOMMENDED ACTIONS:"
echo "========================================="
echo ""
echo "If test 4 WORKS but test 7 FAILS:"
echo "  → Nginx config issue. Run:"
echo "  sudo docker-compose -f docker-compose.vps.yml restart nginx"
echo ""
echo "If test 4 FAILS:"
echo "  → Backend issue. Run:"
echo "  sudo docker-compose -f docker-compose.vps.yml restart backend"
echo ""
echo "If nginx config shows 'proxy_pass http://backend:3000/;' (with trailing /):"
echo "  → Config not updated. Run:"
echo "  git pull origin claude/fix-telegram-service-import-015zTw5FAomJkH5A4vPssX23"
echo "  sudo docker-compose -f docker-compose.vps.yml restart nginx"
echo ""
echo "========================================="
