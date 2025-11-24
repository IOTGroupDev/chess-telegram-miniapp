# 🚀 Deployment Guide - Chess Telegram Mini App

## Быстрый старт

### 1️⃣ Supabase (База данных)
1. Создайте проект на https://supabase.com
2. Выполните миграцию: `supabase/FULL_MIGRATION.sql`
3. Скопируйте URL и Service Key

### 2️⃣ Backend (Railway/Render)
```bash
# Railway (рекомендуется)
cd backend
railway login
railway init
railway variables set SUPABASE_URL=your_url
railway variables set SUPABASE_SERVICE_KEY=your_key
railway up
```

### 3️⃣ Frontend (Vercel)
```bash
cd frontend
vercel
# Добавьте env переменные:
# VITE_SUPABASE_URL
# VITE_SUPABASE_ANON_KEY
# VITE_ENGINE_API_URL
vercel --prod
```

### 4️⃣ Telegram Bot
1. Создайте бота через @BotFather
2. `/newapp` - создайте Mini App
3. Web App URL: `https://your-app.vercel.app`

## Полная документация

См. подробности ниже ⬇️

---

## Environment Variables

### Backend (.env)
```env
PORT=3000
NODE_ENV=production
FRONTEND_URL=https://your-app.vercel.app
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_KEY=your-service-key
```

### Frontend (.env)
```env
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_ENGINE_API_URL=https://your-backend.railway.app
VITE_TELEGRAM_BOT_NAME=your_bot
```

## Проверка после деплоя

✅ Frontend: https://your-app.vercel.app
✅ Backend: https://your-backend.railway.app/api/health
✅ Telegram: https://t.me/your_bot/chess

