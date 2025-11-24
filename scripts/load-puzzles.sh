#!/bin/bash
# =====================================================
# Load Puzzles to Supabase Database
# =====================================================

set -e

# Check if .env exists
if [ ! -f .env ]; then
  echo "❌ Error: .env file not found"
  exit 1
fi

# Load environment variables
source .env

# Check required variables
if [ -z "$SUPABASE_URL" ] || [ -z "$SUPABASE_SERVICE_KEY" ]; then
  echo "❌ Error: SUPABASE_URL and SUPABASE_SERVICE_KEY must be set in .env"
  exit 1
fi

echo "🎯 Loading puzzles to Supabase..."
echo "Database: $SUPABASE_URL"
echo ""

# Extract database connection details from Supabase URL
# Supabase URL format: https://xxxxx.supabase.co
PROJECT_REF=$(echo $SUPABASE_URL | sed 's|https://||' | sed 's|.supabase.co||')

# Use psql to load the SQL file
# You need to get the database password from Supabase Dashboard > Project Settings > Database
echo "📝 Please run this SQL file manually in Supabase SQL Editor:"
echo ""
echo "   https://supabase.com/dashboard/project/$PROJECT_REF/sql"
echo ""
echo "   Copy and paste the contents of: scripts/seed-puzzles.sql"
echo ""
echo "Or use psql with your database connection string:"
echo ""
echo "   psql 'postgresql://postgres:[YOUR-PASSWORD]@db.$PROJECT_REF.supabase.co:5432/postgres' < scripts/seed-puzzles.sql"
echo ""
echo "🔑 Get your database password from:"
echo "   Supabase Dashboard > Project Settings > Database > Database Password"
