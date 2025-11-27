# Отладка проблем с авторизацией

Если пользователи не создаются в базе данных при входе в приложение, следуйте этому чек-листу.

## Быстрая проверка

### 1. Проверьте переменные окружения

**Файл `.env` должен содержать:**

```bash
# Supabase
SUPABASE_URL=https://ваш-проект.supabase.co
SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_KEY=eyJ...  # Service role key!
SUPABASE_JWT_SECRET=ваш-jwt-secret

# Telegram Bot
TELEGRAM_BOT_TOKEN=123456:ABC-DEF...

# URLs
BACKEND_URL=http://localhost:3000  # или ваш домен
FRONTEND_URL=*  # или конкретный домен

# Для frontend также создайте frontend/.env:
VITE_SUPABASE_URL=https://ваш-проект.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
VITE_BACKEND_URL=http://localhost:3000  # ВАЖНО!
```

**Проверьте что переменные установлены:**

```bash
# Для Docker
docker-compose -f docker-compose.vps.yml exec backend env | grep -E '(TELEGRAM|SUPABASE|FRONTEND)'

# Для локальной разработки
cd backend && node -e "console.log({
  TELEGRAM_BOT_TOKEN: process.env.TELEGRAM_BOT_TOKEN ? '✓ Установлен' : '✗ Отсутствует',
  SUPABASE_SERVICE_KEY: process.env.SUPABASE_SERVICE_KEY ? '✓ Установлен' : '✗ Отсутствует',
  SUPABASE_JWT_SECRET: process.env.SUPABASE_JWT_SECRET ? '✓ Установлен' : '✗ Отсутствует'
})"
```

### 2. Тест создания пользователя

Используйте тестовый скрипт:

```bash
# Установите переменную окружения
export TELEGRAM_BOT_TOKEN=ваш_токен_бота

# Запустите тест
node test-auth.js
```

Скрипт покажет:
- ✅ Подключается ли к backend
- ✅ Создается ли пользователь
- ✅ Возвращается ли JWT токен
- ❌ Где именно возникла ошибка

### 3. Проверьте логи backend

```bash
# Docker
docker-compose -f docker-compose.vps.yml logs -f backend

# Локальная разработка
cd backend && npm run dev
# Смотрите консоль
```

**Что искать в логах:**

```
✅ Хорошо:
  🚀 Chess Backend running on port 3000
  [AuthController] Telegram authentication request received
  [AuthService] New user {uuid} created successfully

❌ Плохо:
  ERROR [AuthService] Invalid Telegram data
    → Неверный TELEGRAM_BOT_TOKEN

  ERROR [AuthService] Error creating user in Supabase
    → Проблема с SUPABASE_SERVICE_KEY или RLS политиками

  ECONNREFUSED
    → Backend не запущен или неверный URL
```

## Частые проблемы и решения

### Проблема 1: "Backend недоступен" (CORS / Connection)

**Симптомы:**
- В консоли браузера: `Failed to fetch` или `CORS error`
- В логах backend: нет запросов от frontend

**Решение:**

1. Проверьте `VITE_BACKEND_URL` в frontend:

```bash
# frontend/.env должен содержать:
VITE_BACKEND_URL=http://localhost:3000

# Или для production:
VITE_BACKEND_URL=https://api.yourdomain.com
```

2. Проверьте CORS в backend `.env`:

```bash
FRONTEND_URL=*  # Разрешить всем (для Telegram Mini App)
# Или конкретный домен:
# FRONTEND_URL=https://yourdomain.com
```

3. Пересоберите frontend с новыми переменными:

```bash
# Docker
docker-compose -f docker-compose.vps.yml up -d --build frontend

# Локальная разработка
cd frontend && npm run dev
```

### Проблема 2: "Invalid Telegram data signature"

**Симптомы:**
- В логах: `UnauthorizedException: Invalid Telegram data signature`
- Пользователь не создается

**Решение:**

Неверный `TELEGRAM_BOT_TOKEN`. Проверьте:

```bash
# 1. Получите правильный токен от @BotFather
# 2. Убедитесь что токен в формате: 123456:ABC-DEF1234ghIkl...
# 3. Обновите .env файл
# 4. Перезапустите backend

docker-compose -f docker-compose.vps.yml restart backend
```

### Проблема 3: "Failed to create user" в Supabase

**Симптомы:**
- В логах: `Error creating user in Supabase`
- Возможно: `new row violates row-level security policy`

**Решение:**

1. **Проверьте Service Role Key:**

```bash
# Должен быть именно Service Role Key (не Anon Key!)
# Получите из: Supabase Dashboard → Settings → API → service_role key
```

2. **Проверьте RLS политику для таблицы users:**

В Supabase SQL Editor выполните:

```sql
-- Проверить существующие политики
SELECT * FROM pg_policies WHERE tablename = 'users';

-- Должна быть политика, которая разрешает создание через service role
-- Проверьте что применена миграция 20250126000001_fix_users_insert_policy.sql
```

Если политики нет, выполните:

```bash
supabase db push
```

3. **Проверьте триггер создания кошелька:**

```sql
-- В Supabase SQL Editor
SELECT * FROM pg_trigger WHERE tgname = 'create_wallet_on_user_insert';
```

Если триггера нет, примените миграцию betting system:

```sql
-- Скопируйте содержимое supabase/migrations/20250123000004_betting_system.sql
-- и выполните в SQL Editor
```

### Проблема 4: JWT Token не работает

**Симптомы:**
- Пользователь создается, но не может делать запросы
- Ошибки типа `JWT verification failed`

**Решение:**

JWT Secret в backend должен совпадать с Supabase JWT Secret:

```bash
# 1. Получите JWT Secret из Supabase:
#    Dashboard → Settings → API → JWT Settings → JWT Secret

# 2. Добавьте в backend .env:
SUPABASE_JWT_SECRET=ваш-jwt-secret-из-supabase

# 3. Перезапустите backend
docker-compose -f docker-compose.vps.yml restart backend
```

### Проблема 5: Кошелек не создается автоматически

**Симптомы:**
- Пользователь создается в таблице `users`
- Но нет записи в `user_wallets`

**Решение:**

Проверьте триггер:

```sql
-- В Supabase SQL Editor
SELECT
    t.tgname as trigger_name,
    p.proname as function_name
FROM pg_trigger t
JOIN pg_proc p ON t.tgfoid = p.oid
WHERE t.tgname = 'create_wallet_on_user_insert';
```

Если пусто, примените миграцию:

```bash
# Из корня проекта
supabase db push

# Или вручную выполните SQL из:
# supabase/migrations/20250123000004_betting_system.sql
```

## Пошаговая отладка

### Шаг 1: Проверка backend

```bash
# Запустите backend
cd backend
npm install
npm run dev

# Или через Docker
docker-compose -f docker-compose.vps.yml up backend

# Проверьте health endpoint
curl http://localhost:3000/health
# Должен вернуть: 200 OK
```

### Шаг 2: Ручной тест аутентификации

```bash
# Установите токен бота
export TELEGRAM_BOT_TOKEN=ваш_токен

# Запустите тестовый скрипт
node test-auth.js

# Ожидаемый результат:
# ✅ Backend is running
# ✅ Authentication successful!
# ✅ User created: {user data}
```

### Шаг 3: Проверка в Supabase Dashboard

1. Откройте Supabase Dashboard
2. Перейдите в Table Editor
3. Проверьте таблицу `users` - должна быть новая запись
4. Проверьте таблицу `user_wallets` - должен быть кошелек для этого user_id

### Шаг 4: Тест через frontend

1. Запустите frontend:

```bash
cd frontend
npm install
npm run dev
```

2. Откройте браузер DevTools (F12)
3. Перейдите на вкладку Network
4. Откройте приложение
5. Проверьте запрос к `/api/auth/telegram`:
   - Статус должен быть 200
   - Response должен содержать `success: true` и данные пользователя

### Шаг 5: Проверка RLS

Если пользователь создался, но не может делать запросы:

```sql
-- В Supabase SQL Editor
-- Проверьте что RLS настроен правильно
SELECT tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE schemaname = 'public';
```

## Checklist перед обращением за помощью

Перед тем как писать в поддержку, убедитесь что:

- [ ] `TELEGRAM_BOT_TOKEN` установлен и правильный (от @BotFather)
- [ ] `SUPABASE_SERVICE_KEY` установлен (не anon key!)
- [ ] `SUPABASE_JWT_SECRET` установлен и совпадает с Supabase
- [ ] `VITE_BACKEND_URL` установлен во frontend
- [ ] Backend запущен и доступен по адресу из `VITE_BACKEND_URL`
- [ ] Миграции применены (`supabase db push`)
- [ ] RLS политика для users есть
- [ ] Триггер создания кошелька существует
- [ ] `test-auth.js` скрипт работает успешно
- [ ] В логах backend нет ошибок
- [ ] В браузере DevTools нет CORS ошибок

Если все пункты выполнены, но проблема остается:

1. Соберите логи:

```bash
# Backend логи
docker-compose -f docker-compose.vps.yml logs backend > backend-logs.txt

# Frontend console (скопируйте из DevTools)

# Test script output
node test-auth.js > test-output.txt 2>&1
```

2. Сделайте скриншот:
   - Supabase Dashboard → Table Editor → users (показать что таблица пустая)
   - Browser DevTools → Network → запрос /api/auth/telegram

3. Опишите что именно происходит и что ожидается

## Дополнительные команды

```bash
# Проверить все environment variables в Docker
docker-compose -f docker-compose.vps.yml config

# Посмотреть логи всех сервисов
docker-compose -f docker-compose.vps.yml logs -f

# Пересобрать все с нуля
docker-compose -f docker-compose.vps.yml down
docker-compose -f docker-compose.vps.yml build --no-cache
docker-compose -f docker-compose.vps.yml up -d

# Проверить подключение к Supabase
# В backend консоли:
node -e "
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);
supabase.from('users').select('count').then(console.log);
"
```
