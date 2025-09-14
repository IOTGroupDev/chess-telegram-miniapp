# 🚀 Инструкции по деплою Chess Telegram Mini App

## 📋 Обзор

Это руководство поможет вам задеплоить Chess Telegram Mini App на Vercel (фронтенд) и Render (бэкенд).

## 🛠 Технологический стек

- **Frontend**: React + Vite + TypeScript + Tailwind CSS + @tma.js/sdk
- **Backend**: NestJS + Prisma + PostgreSQL + Socket.IO
- **Deployment**: Vercel (Frontend) + Render (Backend)
- **Database**: PostgreSQL (Render/Neon)
- **Redis**: Upstash (для WebSocket синхронизации)

## 🎯 Шаг 1: Подготовка базы данных

### 1.1 Создание PostgreSQL базы данных

**Вариант A: Neon (рекомендуется)**
1. Перейдите на [neon.tech](https://neon.tech)
2. Создайте новый проект
3. Скопируйте connection string

**Вариант B: Render**
1. Перейдите на [render.com](https://render.com)
2. Создайте новый PostgreSQL сервис
3. Скопируйте connection string

### 1.2 Настройка Redis

**Upstash (рекомендуется)**
1. Перейдите на [upstash.com](https://upstash.com)
2. Создайте новый Redis database
3. Скопируйте connection string

## 🎯 Шаг 2: Деплой бэкенда на Render

### 2.1 Подготовка кода

```bash
cd backend
```

### 2.2 Создание Dockerfile

```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .
RUN npm run build

EXPOSE 3000

CMD ["npm", "run", "start:prod"]
```

### 2.3 Настройка переменных окружения

В Render добавьте следующие переменные:

```env
DATABASE_URL=postgresql://user:password@host:port/database
REDIS_URL=redis://user:password@host:port
NODE_ENV=production
FRONTEND_URL=https://your-app.vercel.app
PORT=3000
```

### 2.4 Деплой на Render

1. Подключите GitHub репозиторий
2. Выберите папку `backend`
3. Установите переменные окружения
4. Задеплойте

## 🎯 Шаг 3: Деплой фронтенда на Vercel

### 3.1 Подготовка кода

```bash
cd frontend
```

### 3.2 Создание vercel.json

```json
{
  "builds": [
    {
      "src": "package.json",
      "use": "@vercel/static-build",
      "config": {
        "distDir": "dist"
      }
    }
  ],
  "routes": [
    {
      "src": "/(.*)",
      "dest": "/index.html"
    }
  ],
  "env": {
    "VITE_API_URL": "https://your-backend.onrender.com/api"
  }
}
```

### 3.3 Настройка переменных окружения

В Vercel добавьте:

```env
VITE_API_URL=https://your-backend.onrender.com/api
VITE_WS_URL=wss://your-backend.onrender.com
```

### 3.4 Деплой на Vercel

1. Подключите GitHub репозиторий
2. Выберите папку `frontend`
3. Установите переменные окружения
4. Задеплойте

## 🎯 Шаг 4: Настройка Telegram Bot

### 4.1 Создание бота

1. Найдите [@BotFather](https://t.me/BotFather) в Telegram
2. Отправьте `/newbot`
3. Следуйте инструкциям для создания бота
4. Сохраните токен бота

### 4.2 Создание Mini App

1. Отправьте `/newapp` боту
2. Выберите созданный бот
3. Укажите название: "Chess Game"
4. Укажите описание: "Play chess with friends or AI"
5. Загрузите иконку (512x512px)
6. Укажите Web App URL: `https://your-app.vercel.app`
7. Укажите Mini App URL: `https://your-app.vercel.app`

### 4.3 Настройка домена

1. Отправьте `/setdomain` боту
2. Укажите домен: `your-app.vercel.app`

## 🎯 Шаг 5: Настройка Prisma

### 5.1 Генерация клиента

```bash
cd backend
npx prisma generate
```

### 5.2 Миграция базы данных

```bash
npx prisma migrate deploy
```

## 🎯 Шаг 6: Тестирование

### 6.1 Проверка API

```bash
curl https://your-backend.onrender.com/api/health
```

### 6.2 Проверка WebSocket

```javascript
const socket = io('wss://your-backend.onrender.com');
socket.on('connect', () => console.log('Connected!'));
```

### 6.3 Тестирование Mini App

1. Откройте бота в Telegram
2. Нажмите на кнопку "Chess Game"
3. Проверьте работу всех функций

## 🔧 Локальная разработка

### Запуск с Docker Compose

```bash
# В корне проекта
docker-compose up -d
```

### Запуск вручную

```bash
# Backend
cd backend
npm install
npm run prisma:generate
npm run prisma:migrate
npm run dev

# Frontend
cd frontend
npm install
npm run dev
```

## 📱 Структура URL

- **Frontend**: `https://your-app.vercel.app`
- **Backend API**: `https://your-backend.onrender.com/api`
- **WebSocket**: `wss://your-backend.onrender.com`
- **Mini App**: `https://your-app.vercel.app` (через Telegram)

## 🚨 Важные замечания

1. **HTTPS обязательно** - Telegram Mini Apps работают только по HTTPS
2. **CORS настройки** - убедитесь, что CORS настроен правильно
3. **WebSocket поддержка** - Render поддерживает WebSocket
4. **Переменные окружения** - не забудьте настроить все переменные
5. **База данных** - используйте connection pooling для продакшена

## 🐛 Решение проблем

### Проблема: Mini App не загружается
- Проверьте HTTPS
- Проверьте CORS настройки
- Проверьте консоль браузера

### Проблема: WebSocket не работает
- Проверьте URL WebSocket
- Проверьте настройки Render
- Проверьте переменные окружения

### Проблема: База данных не подключается
- Проверьте DATABASE_URL
- Проверьте права доступа
- Проверьте миграции

## 📞 Поддержка

Если у вас возникли проблемы:

1. Проверьте логи в Render/Vercel
2. Проверьте консоль браузера
3. Проверьте Network tab в DevTools
4. Создайте issue в репозитории

## 🎉 Готово!

После выполнения всех шагов ваше приложение будет доступно как Telegram Mini App!

**Ссылки:**
- Frontend: https://your-app.vercel.app
- Backend: https://your-backend.onrender.com
- Bot: @your_bot_username
