#!/bin/bash

# =====================================
# Critical Issues Fix Script
# Based on Audit Report findings
# =====================================

set -e

echo "🔧 Fixing Critical Issues from Audit Report"
echo "=============================================="
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Track fixes
FIXES_APPLIED=0

# ===========================================
# CRITICAL ISSUE #1: Fix broken imports
# ===========================================
echo -e "${BLUE}[1/5] Fixing broken Supabase imports...${NC}"

if [ -f "frontend/src/lib/supabase.ts" ]; then
    echo "  → Renaming supabase.ts to supabaseClient.ts"
    mv frontend/src/lib/supabase.ts frontend/src/lib/supabaseClient.ts
    echo -e "${GREEN}  ✓ Fixed supabase import${NC}"
    ((FIXES_APPLIED++))
else
    echo -e "${YELLOW}  ⚠ File already renamed or missing${NC}"
fi

# ===========================================
# CRITICAL ISSUE #2: Remove legacy code
# ===========================================
echo -e "${BLUE}[2/5] Removing legacy code...${NC}"

LEGACY_DIRS=(
    "backend/src/controllers"
    "backend/src/models"
    "backend/src/routes"
    "backend/src/services"
    "backend/src/config"
)

for dir in "${LEGACY_DIRS[@]}"; do
    if [ -d "$dir" ]; then
        echo "  → Removing $dir"
        rm -rf "$dir"
        echo -e "${GREEN}  ✓ Removed $dir${NC}"
        ((FIXES_APPLIED++))
    fi
done

# ===========================================
# HIGH PRIORITY: Remove unused dependencies
# ===========================================
echo -e "${BLUE}[3/5] Removing unused dependencies...${NC}"

cd frontend

UNUSED_DEPS=(
    "@tma.js/sdk"
    "@tensorflow/tfjs"
    "@tensorflow/tfjs-node"
)

for dep in "${UNUSED_DEPS[@]}"; do
    if grep -q "\"$dep\"" package.json 2>/dev/null; then
        echo "  → Removing $dep"
        npm uninstall "$dep" --silent 2>/dev/null || true
        echo -e "${GREEN}  ✓ Removed $dep${NC}"
        ((FIXES_APPLIED++))
    fi
done

cd ..

# ===========================================
# VERIFICATION: Check imports
# ===========================================
echo -e "${BLUE}[4/5] Verifying fixes...${NC}"

# Check if supabaseClient.ts exists now
if [ -f "frontend/src/lib/supabaseClient.ts" ]; then
    echo -e "${GREEN}  ✓ supabaseClient.ts exists${NC}"
else
    echo -e "${RED}  ✗ supabaseClient.ts missing!${NC}"
fi

# Check if legacy dirs are gone
ALL_REMOVED=true
for dir in "${LEGACY_DIRS[@]}"; do
    if [ -d "$dir" ]; then
        echo -e "${RED}  ✗ $dir still exists${NC}"
        ALL_REMOVED=false
    fi
done

if [ "$ALL_REMOVED" = true ]; then
    echo -e "${GREEN}  ✓ All legacy code removed${NC}"
fi

# ===========================================
# SUMMARY
# ===========================================
echo ""
echo -e "${BLUE}[5/5] Summary${NC}"
echo "=============================================="
echo -e "${GREEN}✓ Fixes applied: $FIXES_APPLIED${NC}"
echo ""
echo "Next steps:"
echo "  1. Run 'npm install' in frontend/"
echo "  2. Test the application"
echo "  3. Address remaining issues from AUDIT_REPORT.md"
echo ""
echo -e "${YELLOW}⚠️  Remember to:${NC}"
echo "  - Add rate limiting (@nestjs/throttler)"
echo "  - Add proper TypeScript types"
echo "  - Implement error boundaries"
echo "  - Set up logging/monitoring"
echo ""
echo -e "${GREEN}Done! Check AUDIT_REPORT.md for complete details.${NC}"
