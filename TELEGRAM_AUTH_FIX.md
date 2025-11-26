# 🔧 Исправление Telegram авторизации

## Проблема

При авторизации через Telegram пользователи могли войти в приложение, но **новые пользователи не сохранялись в базу данных**.

### Причина

Row Level Security (RLS) политика для таблицы `users` блокировала создание новых пользователей через backend:

```sql
-- Старая политика (НЕПРАВИЛЬНАЯ)
CREATE POLICY "Users can insert own profile"
  ON users FOR INSERT
  WITH CHECK (auth.uid() = id);
```

**Проблема:** Когда backend использует `SUPABASE_SERVICE_KEY`, `auth.uid()` возвращает `NULL`, потому что это service role. Проверка `auth.uid() = id` не проходит → INSERT блокируется.

## Решение

Создана новая миграция, которая обновляет RLS политику:

**Файл:** `supabase/migrations/20250126000001_fix_users_insert_policy.sql`

```sql
-- Новая политика (ПРАВИЛЬНАЯ)
CREATE POLICY "Allow user creation via service role or own profile"
  ON users FOR INSERT
  WITH CHECK (
    -- Разрешить service role создавать пользователей
    auth.uid() IS NULL
    -- ИЛИ пользователи могут создать свой профиль
    OR auth.uid() = id
  );
```

## Как применить исправление

### Вариант 1: Через Supabase Dashboard (рекомендуется)

1. Откройте https://app.supabase.com/project/YOUR_PROJECT/sql/new

2. Скопируйте и выполните SQL:
   ```bash
   cat supabase/migrations/20250126000001_fix_users_insert_policy.sql
   ```

3. Вставьте в SQL Editor и нажмите **Run**

4. Проверьте, что политика обновлена:
   ```sql
   SELECT
     schemaname, tablename, policyname,
     qual, with_check
   FROM pg_policies
   WHERE tablename = 'users'
     AND policyname LIKE '%insert%';
   ```

### Вариант 2: Через Supabase CLI

```bash
# Установите Supabase CLI (если еще не установлен)
npm install -g supabase

# Войдите в аккаунт
supabase login

# Подключитесь к проекту
supabase link --project-ref YOUR_PROJECT_REF

# Примените миграцию
supabase db push

# Или выполните конкретный файл:
supabase db execute -f supabase/migrations/20250126000001_fix_users_insert_policy.sql
```

## Проверка исправления

После применения миграции проверьте авторизацию:

### 1. Проверьте backend логи

```bash
# Локально
cd backend && npm run dev

# В Docker
docker logs backend -f
```

Вы должны увидеть:
```
[AuthService] New user {user-id} created successfully
```

### 2. Проверьте базу данных

```sql
-- Посмотрите недавно созданных пользователей
SELECT
  id,
  telegram_id,
  username,
  first_name,
  created_at
FROM users
ORDER BY created_at DESC
LIMIT 10;
```

### 3. Проверьте через Telegram

1. Откройте Mini App в Telegram
2. Авторизуйтесь
3. Проверьте, что пользователь появился в таблице `users`

## Дополнительная информация

### Почему service role должен обходить RLS?

**Вопрос:** Service role key должен обходить RLS. Почему это не работало?

**Ответ:** Service role key обходит RLS только если политика **отсутствует**. Если есть политика `FOR INSERT WITH CHECK`, она применяется даже к service role. Наше решение явно разрешает `auth.uid() IS NULL`, что соответствует service role.

### Безопасность

**Вопрос:** Безопасно ли разрешать `auth.uid() IS NULL`?

**Ответ:** Да, потому что:
1. `auth.uid() IS NULL` означает, что запрос идет от service role (backend)
2. `SUPABASE_SERVICE_KEY` - это секретный ключ, который хранится только на сервере
3. Клиент (frontend) использует `SUPABASE_ANON_KEY`, который не может делать запросы с `auth.uid() IS NULL`

## Связанные файлы

- **Auth Service:** `backend/src/auth/auth.service.ts:174-195`
- **Старая политика:** `supabase/migrations/20250123000002_rls_policies.sql:23-25`
- **Новая миграция:** `supabase/migrations/20250126000001_fix_users_insert_policy.sql`
- **Database Setup:** `DATABASE_SETUP.md`

## Помощь

Если проблема не решена:

1. Проверьте `.env` файл backend:
   ```env
   SUPABASE_URL=https://YOUR_PROJECT.supabase.co
   SUPABASE_SERVICE_KEY=eyJhbGc...  # Должен быть service_role key!
   TELEGRAM_BOT_TOKEN=your-bot-token
   JWT_SECRET=your-jwt-secret
   ```

2. Убедитесь, что используете **service_role** key, а не **anon** key:
   - Supabase Dashboard → Settings → API → `service_role` key (secret)

3. Проверьте логи backend на ошибки:
   ```bash
   # Должны увидеть ошибку вида:
   # "new row violates row-level security policy"
   ```

4. Проверьте, что миграция применена:
   ```sql
   SELECT * FROM pg_policies WHERE tablename = 'users';
   ```

---

**Создано:** 2025-11-26
**Статус:** Готово к применению ✅
