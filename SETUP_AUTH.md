# Настройка Telegram Авторизации

## Проблема
При заходе в приложение пользователь не создается в базе данных, потому что отсутствуют необходимые переменные окружения для Telegram Bot авторизации.

## Решение

### 1. Создайте Telegram Bot

1. Откройте Telegram и найдите [@BotFather](https://t.me/BotFather)
2. Отправьте команду `/newbot`
3. Следуйте инструкциям:
   - Введите имя бота (например: "Chess Game Bot")
   - Введите username бота (должен заканчиваться на `bot`, например: `my_chess_game_bot`)
4. BotFather даст вам **токен** в формате: `123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11`
5. **Сохраните этот токен** - он понадобится для `.env` файла

### 2. Получите Supabase JWT Secret

1. Откройте [Supabase Dashboard](https://supabase.com/dashboard)
2. Выберите ваш проект
3. Перейдите в **Settings** → **API**
4. Найдите раздел **JWT Settings**
5. Скопируйте **JWT Secret** (это длинная строка из букв и цифр)

### 3. Создайте `.env` файл

В корне проекта создайте файл `.env` на основе `.env.vps.example`:

```bash
cp .env.vps.example .env
```

### 4. Заполните `.env` файл

Откройте `.env` и заполните следующие **обязательные** переменные:

```bash
# Supabase (получите из https://supabase.com/dashboard/project/YOUR_PROJECT/settings/api)
SUPABASE_URL=https://ваш-проект.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.ваш-anon-key...
SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.ваш-service-key...
SUPABASE_JWT_SECRET=ваш-jwt-secret-из-шага-2

# Telegram Bot (из шага 1)
TELEGRAM_BOT_TOKEN=123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11

# Backend URL (ваш домен или IP)
BACKEND_URL=https://api.yourdomain.com
# или для разработки:
# BACKEND_URL=http://localhost:3000
```

### 5. Создайте `.env` для backend (если нужно)

Если вы хотите запустить только backend для разработки:

```bash
cd backend
cp .env.example .env
```

Заполните `backend/.env`:

```bash
PORT=3000
NODE_ENV=development

# Supabase
SUPABASE_URL=https://ваш-проект.supabase.co
SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.ваш-service-key...
SUPABASE_JWT_SECRET=ваш-jwt-secret

# Telegram Bot
TELEGRAM_BOT_TOKEN=123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11

# Frontend URL (для CORS)
FRONTEND_URL=http://localhost:5173
```

### 6. Примените миграции в Supabase

Убедитесь, что все миграции применены к вашей базе данных:

```bash
# Установите Supabase CLI если еще не установлен
npm install -g supabase

# Войдите в Supabase
supabase login

# Свяжите проект
supabase link --project-ref ваш-проект-id

# Примените миграции
supabase db push
```

### 7. Запустите приложение

#### Вариант A: Docker Compose (рекомендуется)

```bash
# Остановите старые контейнеры если есть
docker-compose -f docker-compose.vps.yml down

# Пересоберите с новыми переменными окружения
docker-compose -f docker-compose.vps.yml up -d --build

# Проверьте логи
docker-compose -f docker-compose.vps.yml logs -f backend
```

#### Вариант B: Локальная разработка

```bash
# Terminal 1: Backend
cd backend
npm install
npm run dev

# Terminal 2: Frontend
cd frontend
npm install
npm run dev
```

### 8. Проверьте работу

1. Откройте приложение в Telegram Web App
2. Авторизуйтесь через Telegram
3. Проверьте в Supabase Dashboard:
   - Таблица `users` - должен появиться новый пользователь
   - Таблица `user_wallets` - должен создаться кошелек для пользователя
   - Таблица `auth.users` (если используете Supabase Auth) - должна быть запись

### 9. Отладка

Если пользователь все еще не создается:

#### Проверьте логи backend:

```bash
# Для Docker
docker-compose -f docker-compose.vps.yml logs -f backend

# Для локальной разработки
# Смотрите в консоль где запущен npm run dev
```

#### Проверьте переменные окружения в контейнере:

```bash
docker-compose -f docker-compose.vps.yml exec backend env | grep -E '(TELEGRAM|SUPABASE|JWT)'
```

#### Проверьте сетевые запросы в браузере:

1. Откройте DevTools (F12)
2. Вкладка Network
3. Перезагрузите приложение
4. Найдите запрос к `/api/auth/telegram`
5. Проверьте статус ответа и тело ответа

#### Типичные ошибки:

- **403 Forbidden** или **401 Unauthorized**: Неверный TELEGRAM_BOT_TOKEN
- **500 Internal Server Error**: Проверьте SUPABASE_SERVICE_KEY и SUPABASE_URL
- **"Invalid Telegram data"**: Проблема с валидацией initData, проверьте TELEGRAM_BOT_TOKEN
- **"Failed to create user"**: Проблема с RLS политиками в Supabase, убедитесь что миграция `20250126000001_fix_users_insert_policy.sql` применена

### 10. RLS Политики

Убедитесь, что в Supabase применена правильная политика для таблицы `users`:

```sql
-- Должна быть такая политика:
CREATE POLICY "Allow user creation via service role or own profile"
  ON users FOR INSERT
  WITH CHECK (
    -- Allow service role to create users (auth.uid() will be NULL)
    auth.uid() IS NULL
    -- OR authenticated users can create their own profile
    OR auth.uid() = id
  );
```

Если политики нет, выполните:

```bash
supabase db push
```

Или вручную в SQL Editor в Supabase Dashboard выполните миграцию из файла `supabase/migrations/20250126000001_fix_users_insert_policy.sql`.

## Итоговый checklist

- [ ] Telegram Bot создан, токен сохранен
- [ ] Supabase JWT Secret получен
- [ ] Файл `.env` создан и заполнен
- [ ] Миграции применены (`supabase db push`)
- [ ] Backend перезапущен с новыми переменными
- [ ] Проверены логи backend (нет ошибок при старте)
- [ ] RLS политика для users таблицы применена
- [ ] Триггер создания кошелька работает (проверить в Supabase Functions)

После выполнения всех шагов пользователи должны успешно создаваться при входе в приложение!
