# Telegram Authentication Setup Guide

## Архитектура авторизации

Система использует правильную модель авторизации для Telegram Mini Apps:

```
┌──────────────┐
│   Telegram   │  ──→  initData (источник идентичности)
└──────────────┘
       │
       ↓
┌──────────────┐
│   NestJS     │  ──→  1. Валидирует initData по бот-токену
│   Backend    │       2. Создаёт/обновляет пользователя в Supabase
│              │       3. Генерит JWT (совместимый с Supabase)
└──────────────┘
       │
       ↓
┌──────────────┐
│   Frontend   │  ──→  1. Хранит JWT
│              │       2. Использует для NestJS и Supabase
└──────────────┘
       │
       ↓
┌──────────────┐
│   Supabase   │  ──→  RLS использует auth.uid() из JWT
└──────────────┘
```

## Настройка Backend (NestJS)

### 1. Установка зависимостей

```bash
cd backend
npm install @nestjs/jwt @nestjs/passport passport passport-jwt crypto-js
```

### 2. Переменные окружения

Добавьте в `.env`:

```env
# Telegram Bot (Required)
TELEGRAM_BOT_TOKEN=your_bot_token_here

# Supabase Configuration (Required)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your-service-role-key-here
SUPABASE_JWT_SECRET=your-jwt-secret-here
```

**Где взять SUPABASE_JWT_SECRET:**
1. Зайдите в Supabase Dashboard
2. Project Settings → API
3. Скопируйте "JWT Secret"

**Где взять TELEGRAM_BOT_TOKEN:**
1. Создайте бота через [@BotFather](https://t.me/BotFather)
2. Команда `/newbot`
3. Скопируйте токен

### 3. Структура AuthModule

Модуль авторизации включает:

- **AuthService** (`src/auth/auth.service.ts`)
  - Валидация Telegram initData (HMAC-SHA256)
  - Создание/обновление пользователя в Supabase
  - Генерация JWT, совместимого с Supabase

- **AuthController** (`src/auth/auth.controller.ts`)
  - `POST /api/auth/telegram` - endpoint для авторизации

- **JwtAuthGuard** (`src/auth/jwt-auth.guard.ts`)
  - Guard для защиты endpoints

- **JwtStrategy** (`src/auth/jwt.strategy.ts`)
  - Passport strategy для валидации JWT

### 4. Защита endpoints

Для защиты endpoint используйте `@UseGuards(JwtAuthGuard)`:

```typescript
import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from './auth/jwt-auth.guard';

@Controller('protected')
export class ProtectedController {
  @Get()
  @UseGuards(JwtAuthGuard)
  getProtectedData() {
    return { message: 'This is protected data' };
  }
}
```

## Настройка Frontend

### 1. Переменные окружения

Добавьте в `.env`:

```env
VITE_BACKEND_URL=http://localhost:3000
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

### 2. AuthService

Фронтенд использует `AuthService` (`src/services/authService.ts`):

```typescript
import { AuthService } from '../services/authService';

// Авторизация через Telegram
const result = await AuthService.authenticateWithTelegram(
  window.Telegram?.WebApp?.initData
);

// Получение токена для API запросов
const headers = AuthService.getAuthHeader();
// { Authorization: 'Bearer <token>' }

// Проверка авторизации
const isAuth = AuthService.isAuthenticated();

// Выход
await AuthService.logout();
```

### 3. Zustand Store

Store обновлен для хранения JWT и Supabase User ID:

```typescript
const {
  user,              // Telegram user
  isAuthorized,      // Auth status
  accessToken,       // JWT token
  supabaseUserId,    // UUID from Supabase
  setAccessToken,
  setSupabaseUserId,
} = useAppStore();
```

## Настройка Supabase

### 1. Таблица users

Убедитесь, что таблица `users` имеет поле `telegram_id`:

```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  telegram_id BIGINT UNIQUE NOT NULL,
  username TEXT,
  first_name TEXT,
  last_name TEXT,
  avatar_url TEXT,
  language TEXT DEFAULT 'en',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  last_seen_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 2. Row Level Security (RLS)

Настройте RLS для доступа к данным пользователя:

```sql
-- Enable RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Policy: Users can read their own data
CREATE POLICY "Users can read own data"
ON users FOR SELECT
USING (auth.uid() = id);

-- Policy: Users can update their own data
CREATE POLICY "Users can update own data"
ON users FOR UPDATE
USING (auth.uid() = id);
```

JWT от NestJS будет содержать `sub = user.id`, который Supabase RLS использует через `auth.uid()`.

## Флоу авторизации

### 1. Пользователь открывает Mini App

```typescript
// Frontend: StartPage.tsx
const tg = window.Telegram?.WebApp;

if (tg?.initData) {
  // Отправляем initData в NestJS
  const result = await AuthService.authenticateWithTelegram(tg.initData);
}
```

### 2. NestJS валидирует и создаёт пользователя

```typescript
// Backend: auth.service.ts
validateTelegramData(initData: string) {
  // 1. Проверка HMAC-SHA256 signature
  // 2. Проверка auth_date (не старше 24 часов)
  // 3. Извлечение user data
}

authenticateUser(initData: string) {
  // 1. Валидация
  // 2. Создание/обновление в Supabase
  // 3. Генерация JWT
}
```

### 3. Frontend использует JWT

```typescript
// Для Supabase
await supabase.auth.setSession({
  access_token: jwt,
  refresh_token: jwt,
});

// Для NestJS API
fetch('/api/protected', {
  headers: AuthService.getAuthHeader(),
});
```

## Тестирование

### 1. Локальное тестирование с Telegram

Используйте [Telegram WebApp Tester](https://github.com/twa-dev/Mark42):

```bash
npm install -g @twa-dev/mark42
mark42 --port 5173
```

### 2. Тест авторизации

```bash
# Backend должен быть запущен
cd backend && npm run dev

# Frontend должен быть запущен
cd frontend && npm run dev

# Откройте через Telegram Bot:
# t.me/YOUR_BOT_USERNAME?startapp=test
```

### 3. Проверка JWT

```typescript
// В консоли браузера
const token = localStorage.getItem('access_token');
console.log(JSON.parse(atob(token.split('.')[1])));

// Должно быть:
// {
//   sub: "uuid-user-id",
//   role: "authenticated",
//   aud: "authenticated",
//   iat: 1234567890,
//   exp: 1234567890
// }
```

## Безопасность

### ✅ Что реализовано:

- ✅ Валидация Telegram initData через HMAC-SHA256
- ✅ Проверка auth_date (не старше 24 часов)
- ✅ JWT совместимый с Supabase (одинаковый secret)
- ✅ RLS на уровне Supabase
- ✅ Secure cookie storage для JWT
- ✅ AuthGuard для защиты NestJS endpoints

### 🔒 Рекомендации:

1. **HTTPS обязателен** в production
2. **Rotate JWT_SECRET** регулярно
3. **Rate limiting** на `/api/auth/telegram`
4. **Логирование** попыток авторизации
5. **Monitoring** подозрительной активности

## Troubleshooting

### Ошибка: "Invalid Telegram data signature"

- Проверьте TELEGRAM_BOT_TOKEN
- Убедитесь что initData не изменён
- Проверьте что auth_date не старше 24 часов

### Ошибка: "Invalid token"

- Проверьте что SUPABASE_JWT_SECRET совпадает в NestJS и Supabase
- Убедитесь что токен не истёк (exp)
- Проверьте формат токена (должен быть Bearer <token>)

### RLS не работает

- Убедитесь что JWT содержит правильный `sub` (user.id)
- Проверьте что RLS policies настроены на `auth.uid()`
- Проверьте что Supabase использует тот же JWT_SECRET

## Дополнительные ресурсы

- [Telegram Mini Apps Documentation](https://core.telegram.org/bots/webapps)
- [Supabase Auth Documentation](https://supabase.com/docs/guides/auth)
- [NestJS JWT Documentation](https://docs.nestjs.com/security/authentication)
