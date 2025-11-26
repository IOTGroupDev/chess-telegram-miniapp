# AI Analysis Setup Guide

This guide explains how to set up AI-powered move analysis in AI Training mode.

## Features

- **Local Heuristic Analysis** (always works, no API needed):
  - Instant move quality assessment
  - Material loss detection
  - Tactical mistake detection
  - Position evaluation

- **AI-Powered Detailed Analysis** (requires API key):
  - Deep strategic explanations
  - Tactical motif identification
  - Alternative move suggestions
  - Positional understanding

## Setup Instructions

### 1. Choose AI Provider

We support 3 AI providers:

| Provider | Model | Cost | Quality | Speed |
|----------|-------|------|---------|-------|
| **Claude** | Haiku | $0.25/M tokens | ⭐⭐⭐⭐⭐ | Fast |
| **Deepseek** | deepseek-chat | $0.14/M tokens | ⭐⭐⭐⭐ | Very Fast |
| **OpenAI** | GPT-4o-mini | $0.15/M tokens | ⭐⭐⭐⭐ | Fast |

**Recommendation**: Claude Haiku - best quality for chess analysis

### 2. Get API Key

#### Claude (Recommended)
1. Go to https://console.anthropic.com/
2. Sign up or log in
3. Navigate to "API Keys"
4. Create new key
5. Copy the key (starts with `sk-ant-...`)

#### Deepseek
1. Go to https://platform.deepseek.com/
2. Sign up or log in
3. Navigate to "API Keys"
4. Create new key
5. Copy the key

#### OpenAI
1. Go to https://platform.openai.com/
2. Sign up or log in
3. Navigate to "API Keys"
4. Create new key
5. Copy the key (starts with `sk-...`)

### 3. Configure Backend

Edit `backend/.env`:

```bash
# Choose one provider
AI_PROVIDER=claude          # or: deepseek, openai, gpt4o-mini
AI_API_KEY=sk-ant-...      # Your actual API key

# Other required settings
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your-service-key
```

### 4. Restart Backend

```bash
# Docker
docker compose restart backend

# Or local development
cd backend
npm run start:dev
```

### 5. Test

1. Open app in Telegram
2. Go to AI Training
3. Make a non-optimal move
4. Click "🤖 Подробный AI-анализ" button
5. Wait 2-5 seconds for analysis

## Troubleshooting

### "❌ Не удалось получить детальный анализ"

**Check 1: Backend Running?**
```bash
docker ps | grep backend
```

**Check 2: Environment Variables Set?**
```bash
docker exec -it chess-telegram-miniapp-backend-1 env | grep AI
```

**Check 3: API Key Valid?**
- Check API key is correct
- Check you have credits/balance
- Check key has proper permissions

**Check 4: Backend Logs**
```bash
docker logs chess-telegram-miniapp-backend-1 --tail 50
```

Look for:
```
[AI Analysis] AI move analysis failed
```

### "Network error"

**Check**: `VITE_ENGINE_API_URL` in `frontend/.env`:

```bash
# Local development
VITE_ENGINE_API_URL=http://localhost:3000

# Production (Docker)
VITE_ENGINE_API_URL=http://backend:3000
```

### Analysis is slow

- Claude Haiku: 2-4 seconds (normal)
- Deepseek: 1-3 seconds (fast)
- OpenAI GPT-4o-mini: 2-5 seconds (normal)

If slower than 10 seconds, check:
- Internet connection
- API provider status page
- Backend server location (use same region as AI provider)

## Cost Estimation

Typical move analysis prompt: ~300 tokens
Typical response: ~150 tokens
Total per analysis: ~450 tokens

**Cost per 1000 analyses:**
- Claude Haiku: $0.11
- Deepseek: $0.06
- OpenAI GPT-4o-mini: $0.07

For a chess app with 100 daily active users making ~10 analyzed moves each:
- **1000 analyses/day** = $0.06-0.11/day
- **~$2-3/month** for 1000 DAU

## Fallback Mode

If AI API is not configured or fails, the app automatically falls back to heuristic explanations. Users will still get useful feedback, just without AI-powered deep analysis.

## Example AI Analysis

**User move**: E4→E5 (blunder)
**Best move**: C2→C4

**AI Response**:
> "Ваш ход E4→E5 выглядит агрессивным, но оставляет центральную пешку без защиты. После хода противника d5, вы потеряете контроль над центром. Лучшим ходом было C2→C4, укрепляя контроль центра и подготавливая развитие коня. Вы пропустили тактический мотив - противник может немедленно атаковать вашу незащищенную пешку вилкой."

## Privacy & Security

- API keys stored only on backend
- Move positions (FEN) sent to AI provider
- No personal data sent to AI
- Responses cached for 24h to reduce costs
- You control which AI provider to use

## Support

Issues? Open ticket: https://github.com/your-repo/issues
