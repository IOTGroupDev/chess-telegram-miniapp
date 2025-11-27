#!/usr/bin/env node

/**
 * Test Script for Telegram Authentication
 *
 * This script simulates the authentication flow to help debug
 * why users are not being created in the database.
 *
 * Usage:
 *   1. Make sure backend is running
 *   2. node test-auth.js
 */

const crypto = require('crypto');

// Configuration - update these from your .env file
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || 'YOUR_BOT_TOKEN_HERE';
const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3000';

console.log('🧪 Testing Telegram Authentication Flow\n');
console.log('Configuration:');
console.log(`  Backend URL: ${BACKEND_URL}`);
console.log(`  Bot Token: ${TELEGRAM_BOT_TOKEN.substring(0, 10)}...`);
console.log('');

// Step 1: Generate fake Telegram initData
function generateFakeTelegramData() {
  const authDate = Math.floor(Date.now() / 1000);
  const user = {
    id: 123456789,
    first_name: 'Test',
    last_name: 'User',
    username: 'testuser',
    language_code: 'en',
  };

  const params = new URLSearchParams();
  params.set('auth_date', authDate.toString());
  params.set('user', JSON.stringify(user));

  // Create data check string
  const dataCheckString = Array.from(params.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}=${value}`)
    .join('\n');

  // Create secret key
  const secretKey = crypto
    .createHmac('sha256', 'WebAppData')
    .update(TELEGRAM_BOT_TOKEN)
    .digest();

  // Calculate hash
  const hash = crypto
    .createHmac('sha256', secretKey)
    .update(dataCheckString)
    .digest('hex');

  params.set('hash', hash);

  return params.toString();
}

// Step 2: Send authentication request
async function testAuthentication() {
  try {
    const initData = generateFakeTelegramData();

    console.log('📤 Step 1: Sending authentication request...');
    console.log(`  Endpoint: ${BACKEND_URL}/api/auth/telegram`);

    const response = await fetch(`${BACKEND_URL}/api/auth/telegram`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ initData }),
    });

    console.log(`  Status: ${response.status} ${response.statusText}`);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Authentication failed!');
      console.error('  Error response:', errorText);
      return;
    }

    const result = await response.json();
    console.log('✅ Authentication successful!');
    console.log('  Response:', JSON.stringify(result, null, 2));

    if (result.success && result.data) {
      console.log('');
      console.log('📋 User created:');
      console.log(`  User ID: ${result.data.user.id}`);
      console.log(`  Telegram ID: ${result.data.user.telegram_id}`);
      console.log(`  Username: ${result.data.user.username}`);
      console.log(`  Token: ${result.data.accessToken.substring(0, 20)}...`);

      console.log('');
      console.log('✅ SUCCESS: User should now be in the database!');
      console.log('   Check Supabase Dashboard → Table Editor → users');
      console.log('   Also check user_wallets table (should be auto-created by trigger)');
    }

  } catch (error) {
    console.error('❌ Error during test:');
    console.error('  ', error.message);

    if (error.code === 'ECONNREFUSED') {
      console.error('');
      console.error('🔴 Backend is not running!');
      console.error('   Start it with: cd backend && npm run dev');
      console.error('   Or with Docker: docker-compose -f docker-compose.vps.yml up backend');
    }
  }
}

// Step 3: Check if backend is accessible
async function checkBackendHealth() {
  try {
    console.log('🏥 Checking backend health...');
    const response = await fetch(`${BACKEND_URL}/health`, {
      method: 'GET',
    });

    if (response.ok) {
      console.log('✅ Backend is running');
      return true;
    } else {
      console.log('⚠️  Backend responded with:', response.status);
      return false;
    }
  } catch (error) {
    console.log('❌ Backend is not accessible');
    console.log('   Error:', error.message);
    return false;
  }
}

// Main execution
async function main() {
  // Check if bot token is configured
  if (TELEGRAM_BOT_TOKEN === 'YOUR_BOT_TOKEN_HERE') {
    console.error('❌ TELEGRAM_BOT_TOKEN is not configured!');
    console.error('');
    console.error('Please set it in one of these ways:');
    console.error('  1. Environment variable: export TELEGRAM_BOT_TOKEN=your_token');
    console.error('  2. Edit this script and replace YOUR_BOT_TOKEN_HERE');
    console.error('');
    console.error('Get your bot token from @BotFather in Telegram');
    process.exit(1);
  }

  // Check backend
  const isHealthy = await checkBackendHealth();
  console.log('');

  if (!isHealthy) {
    console.error('🔴 Cannot proceed - backend is not running');
    console.error('');
    console.error('Start backend first:');
    console.error('  cd backend && npm run dev');
    console.error('  OR');
    console.error('  docker-compose -f docker-compose.vps.yml up backend');
    process.exit(1);
  }

  // Run authentication test
  await testAuthentication();
}

// Run
main().catch(console.error);
