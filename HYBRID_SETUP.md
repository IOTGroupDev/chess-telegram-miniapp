# 🚀 Hybrid Setup Guide
## Chess Telegram Mini App - Supabase + NestJS

Этот документ описывает настройку гибридной архитектуры (Supabase для игр + NestJS для движков).

---

## 📋 Оглавление

- [Архитектура](#архитектура)
- [Быстрый старт](#быстрый-старт)
- [Frontend Setup](#frontend-setup)
- [Backend Setup](#backend-setup)
- [Supabase Setup](#supabase-setup)
- [Development](#development)
- [Production Deployment](#production-deployment)

---

## 🏗️ Архитектура

```
┌─────────────────────────────────────────┐
│     Frontend (React + TypeScript)       │
│  ├─ Supabase Client (95% запросов)      │
│  ├─ Real-time WebSocket                 │
│  └─ Engine API Client (5%)              │
└─────────┬──────────────────┬────────────┘
          │                  │
          ▼                  ▼
┌─────────────────┐  ┌──────────────────┐
│    Supabase     │  │  NestJS Backend  │
│  ├─ PostgreSQL  │  │  ├─ Stockfish    │
│  ├─ Realtime    │  │  ├─ Leela Zero   │
│  ├─ Auth        │  │  ├─ Analysis     │
│  ├─ Storage     │  │  └─ Glicko-2     │
│  └─ RLS         │  └──────────────────┘
└─────────────────┘
```

### Разделение ответственности:

| Функция | Реализация | Причина |
|---------|-----------|---------|
| **База данных** | Supabase | Managed PostgreSQL |
| **Real-time игры** | Supabase | Встроенный WebSocket |
| **Временной контроль** | Supabase Broadcast | Эфемерные сообщения |
| **История партий** | Supabase | Auto-generated API |
| **Рейтинги (данные)** | Supabase | Хранение |
| | | |
| **Stockfish/Leela** | NestJS | child_process |
| **Анализ партий** | NestJS | Долгие вычисления |
| **Glicko-2 расчет** | NestJS | Сложная логика |
| **Кеширование** | NestJS + Redis | Performance |

---

## 🚀 Быстрый Старт

### Требования:

- Node.js 18+
- npm или yarn
- Docker & Docker Compose (для локального Supabase)
- PostgreSQL 15+ (опционально, для production)

### 1. Клонирование и установка:

```bash
# Клонировать репозиторий
git clone <repo-url>
cd chess-telegram-miniapp

# Установить зависимости для всего монорепо
npm install

# Установить зависимости frontend
cd frontend && npm install

# Установить зависимости backend
cd ../backend && npm install
```

### 2. Выбор варианта Supabase:

#### Вариант A: Supabase Cloud (Рекомендуется для начала)

```bash
# 1. Создайте проект на https://supabase.com
# 2. Скопируйте URL и API ключи
# 3. Примените миграции (см. Supabase Setup ниже)
```

#### Вариант B: Local Supabase с Docker

```bash
# Установить Supabase CLI
npm install -g supabase

# Запустить локальный Supabase
supabase start

# Supabase будет доступен на:
# API: http://localhost:54321
# Studio: http://localhost:54323
# DB: postgresql://postgres:postgres@localhost:54322/postgres
```

---

## 🎨 Frontend Setup

### 1. Настройка переменных окружения:

```bash
cd frontend

# Скопировать example
cp .env.example .env

# Редактировать .env
nano .env
```

### 2. Заполнить `.env`:

```bash
# Supabase Configuration
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key

# NestJS Engine Service
VITE_ENGINE_API_URL=http://localhost:3000

# Telegram Mini App (опционально)
VITE_TELEGRAM_BOT_NAME=your_bot_name
```

### 3. Запуск:

```bash
npm run dev

# Frontend будет доступен на http://localhost:5173
```

---

## ⚙️ Backend Setup

Backend теперь отвечает ТОЛЬКО за шахматные движки и сложную логику.

### 1. Структура backend (после рефакторинга):

```
backend/
├── src/
│   ├── engine/              # Шахматные движки
│   │   ├── stockfish.service.ts
│   │   ├── leela.service.ts
│   │   ├── engine-manager.service.ts
│   │   └── engine.module.ts
│   ├── analysis/            # Анализ партий
│   │   ├── analysis.service.ts
│   │   ├── analysis.controller.ts
│   │   └── analysis.module.ts
│   ├── rating/              # Glicko-2 рейтинги
│   │   ├── glicko2.service.ts
│   │   ├── rating.controller.ts
│   │   └── rating.module.ts
│   └── supabase/            # Supabase integration
│       ├── supabase.service.ts
│       └── supabase.module.ts
└── main.ts
```

### 2. Установка Stockfish:

```bash
# Ubuntu/Debian
sudo apt-get install stockfish

# macOS
brew install stockfish

# Проверка
which stockfish
# /usr/bin/stockfish или /opt/homebrew/bin/stockfish
```

### 3. Настройка переменных окружения:

```bash
cd backend

# Создать .env
cat > .env << EOF
# Supabase Integration (для чтения данных)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your-service-role-key

# Redis Cache
REDIS_HOST=localhost
REDIS_PORT=6379

# Stockfish
STOCKFISH_PATH=/usr/bin/stockfish

# Server
PORT=3000
NODE_ENV=development
EOF
```

### 4. Запуск Redis:

```bash
# Docker
docker run -d -p 6379:6379 redis:alpine

# Или через docker-compose
docker-compose up -d redis
```

### 5. Запуск backend:

```bash
npm run start:dev

# Backend API будет доступен на http://localhost:3000
```

---

## 🗄️ Supabase Setup

### Создание проекта:

1. Перейдите на https://supabase.com
2. Создайте новый проект
3. Выберите регион (EU для России)
4. Сохраните URL и API ключи

### Применение миграций:

```bash
# Установить Supabase CLI (если еще не установлен)
npm install -g supabase

# Войти в аккаунт
supabase login

# Связать проект
supabase link --project-ref YOUR_PROJECT_REF

# Применить миграции
supabase db push
```

### Загрузка seed данных (опционально):

```bash
# Через SQL Editor на Supabase.com
# Скопировать содержимое supabase/seed/seed.sql

# Или через psql
psql $DATABASE_URL < supabase/seed/seed.sql
```

### Проверка:

```bash
# Открыть Supabase Studio
# https://app.supabase.com/project/YOUR_PROJECT/editor

# Проверить таблицы:
# - users
# - games
# - moves
# - puzzles
# - openings
```

---

## 💻 Development

### Запуск всего стека локально:

```bash
# Terminal 1: Supabase (если локально)
supabase start

# Terminal 2: Redis
docker run -d -p 6379:6379 redis:alpine

# Terminal 3: Backend
cd backend
npm run start:dev

# Terminal 4: Frontend
cd frontend
npm run dev
```

### URLs в dev режиме:

- Frontend: http://localhost:5173
- Backend API: http://localhost:3000
- Supabase Studio: http://localhost:54323 (если локально)
- Supabase API: http://localhost:54321 (если локально)

### Тестирование Real-time:

1. Откройте два окна браузера
2. Создайте игру в первом окне
3. Присоединитесь во втором окне
4. Сделайте ход - обновление должно быть мгновенным!

---

## 🎮 Использование

### Создание игры:

```typescript
// Frontend
import supabase from './lib/supabase';

const { data: game } = await supabase
  .from('games')
  .insert({
    white_player_id: userId,
    time_control: 'blitz',
    time_limit: 180,
    time_increment: 2,
    is_public: true
  })
  .select()
  .single();
```

### Real-time игра:

```typescript
import { useSupabaseGame } from './hooks/useSupabaseGame';

function GamePage({ gameId, userId }) {
  const {
    game,
    moves,
    chess,
    makeMove,
    resign,
    offerDraw
  } = useSupabaseGame(gameId, userId);

  // Автоматическая синхронизация!
  // Все изменения приходят через WebSocket
}
```

### Анализ партии (через NestJS):

```typescript
// Frontend
const response = await fetch('http://localhost:3000/analysis/game', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ gameId })
});

const analysis = await response.json();
// {
//   whiteAccuracy: 94.5,
//   blackAccuracy: 88.2,
//   analysis: [...],
//   opening: "Ruy Lopez"
// }
```

---

## 🚀 Production Deployment

### Frontend (Vercel/Netlify):

```bash
cd frontend

# Build
npm run build

# Deploy на Vercel
vercel --prod

# Или Netlify
netlify deploy --prod
```

### Backend (Railway/Render/Fly.io):

```bash
cd backend

# Build
npm run build

# Deploy на Railway
railway up

# Environment variables:
# - SUPABASE_URL
# - SUPABASE_SERVICE_KEY
# - REDIS_HOST
# - STOCKFISH_PATH
```

### Supabase (Production):

1. Проект уже в production на Supabase.com
2. Настройте Row Level Security (уже настроено в миграциях)
3. Добавьте домен frontend в Auth settings
4. Enable Realtime для tables: games, moves

### Redis (Upstash/Redis Cloud):

```bash
# Создайте Redis instance на Upstash.com
# Скопируйте connection string
# Обновите REDIS_HOST в backend .env
```

---

## 📊 Monitoring

### Supabase Dashboard:

- Database usage
- API requests
- Realtime connections
- Storage usage

### Backend Logs:

```bash
# PM2 для production
pm2 start dist/main.js --name chess-backend
pm2 logs chess-backend

# Docker logs
docker logs chess-backend -f
```

---

## 🐛 Troubleshooting

### Frontend не подключается к Supabase:

```bash
# Проверьте .env
cat frontend/.env

# Проверьте CORS на Supabase (Auth settings)
# Добавьте http://localhost:5173 в allowed origins
```

### Real-time не работает:

```bash
# Проверьте, что таблица в realtime publication
psql $DATABASE_URL

SELECT * FROM pg_publication_tables
WHERE pubname = 'supabase_realtime';

# Если нет, добавьте:
ALTER PUBLICATION supabase_realtime ADD TABLE games;
ALTER PUBLICATION supabase_realtime ADD TABLE moves;
```

### Backend не может запустить Stockfish:

```bash
# Проверьте путь
which stockfish

# Обновите STOCKFISH_PATH в .env
STOCKFISH_PATH=/usr/games/stockfish  # Ubuntu
STOCKFISH_PATH=/opt/homebrew/bin/stockfish  # macOS

# Проверьте права
chmod +x /usr/bin/stockfish
```

---

## 📚 Дополнительная Документация

- [Supabase README](./supabase/README.md) - Детальная документация по Supabase
- [Architecture Analysis](./ARCHITECTURE_ANALYSIS.md) - Полный архитектурный анализ
- [Supabase Analysis](./SUPABASE_ANALYSIS.md) - Анализ интеграции Supabase

---

## ✅ Чеклист для Production

- [ ] Supabase проект создан
- [ ] Миграции применены
- [ ] RLS policies активированы
- [ ] Frontend .env настроен
- [ ] Backend .env настроен
- [ ] Stockfish установлен
- [ ] Redis запущен
- [ ] Real-time протестирован
- [ ] Временной контроль работает
- [ ] Анализ партий работает
- [ ] Frontend задеплоен
- [ ] Backend задеплоен
- [ ] Monitoring настроен

---

## 🎯 Следующие Шаги

1. ✅ Supabase setup - **ЗАВЕРШЕНО**
2. ✅ Frontend integration - **ЗАВЕРШЕНО**
3. ⏭️ Реальный Stockfish backend - **СЛЕДУЮЩЕЕ**
4. ⏭️ Glicko-2 рейтинги
5. ⏭️ Puzzle система
6. ⏭️ Tournaments

---

## 📞 Support

Если возникли проблемы:
1. Проверьте [Troubleshooting](#troubleshooting)
2. Посмотрите logs (browser console + backend logs)
3. Проверьте Supabase Dashboard (ошибки API)

---

**Версия:** 1.0.0
**Дата:** 23 ноября 2025
