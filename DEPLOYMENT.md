# 🚀 Deployment Guide - Chess Telegram Mini App

## 🎯 VPS Deployment (Рекомендуется)

**Преимущества:**
- ✅ Полный контроль над инфраструктурой
- ✅ Все сервисы на одном сервере
- ✅ Один Docker Compose файл
- ✅ Бесплатно (если VPS уже есть)
- ✅ Простое управление через Docker

**Требования:**
- VPS с 1GB+ RAM (рекомендуется 2GB)
- Docker и Docker Compose
- Доменное имя (опционально, для SSL)

### Быстрый старт VPS

#### 1️⃣ Supabase (База данных - БЕСПЛАТНО)
```bash
# 1. Создайте проект на https://supabase.com
# 2. Скопируйте учетные данные:
#    Settings > API > URL
#    Settings > API > anon/public key
#    Settings > API > service_role key

# 3. Примените миграцию
cd supabase
# Скопируйте содержимое FULL_MIGRATION.sql в SQL Editor на Supabase
```

#### 2️⃣ Настройка переменных окружения
```bash
# Скопируйте шаблон
cp .env.vps.example .env

# Отредактируйте .env
nano .env

# Обязательно заполните:
# - SUPABASE_URL=https://xxx.supabase.co
# - SUPABASE_ANON_KEY=eyJ...
# - SUPABASE_SERVICE_KEY=eyJ...
# - BACKEND_URL=https://api.yourdomain.com (или http://YOUR_IP:3000)
# - DOMAIN=yourdomain.com
# - EMAIL=your@email.com
```

#### 3️⃣ Запуск Docker
```bash
# Сборка и запуск всех сервисов
docker-compose -f docker-compose.vps.yml up -d

# Проверка статуса
docker-compose -f docker-compose.vps.yml ps

# Просмотр логов
docker-compose -f docker-compose.vps.yml logs -f
```

#### 4️⃣ Настройка SSL (опционально)
```bash
# Если у вас есть домен
./scripts/init-letsencrypt.sh yourdomain.com

# Перезапуск Nginx для применения SSL
docker-compose -f docker-compose.vps.yml restart nginx
```

#### 5️⃣ Telegram Bot
```bash
# 1. Создайте бота через @BotFather
# 2. Выполните: /newapp
# 3. Web App URL: https://yourdomain.com
#    (или http://YOUR_VPS_IP если без домена)
```

### ✅ Проверка работы
```bash
# Backend health check
curl http://localhost:3000/health

# Проверка всех контейнеров
docker-compose -f docker-compose.vps.yml ps

# Мониторинг ресурсов
docker stats

# Открыть в браузере
# https://yourdomain.com (или http://YOUR_VPS_IP)
```

### 🔄 Обновление после изменений
```bash
# Пересборка и перезапуск
docker-compose -f docker-compose.vps.yml up -d --build

# Или только backend/frontend
docker-compose -f docker-compose.vps.yml up -d --build backend
docker-compose -f docker-compose.vps.yml up -d --build frontend
```

---

## ☁️ Cloud Deployment (Альтернатива)

Если у вас нет VPS, можно использовать облачные платформы:

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

