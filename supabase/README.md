# Supabase Setup - Chess Telegram Mini App

Этот документ описывает настройку Supabase для гибридной архитектуры шахматного приложения.

## 🏗️ Архитектура

```
Frontend (React) → Supabase (95% запросов)
                ↓
                NestJS Engine Service (5% - анализ, движки)
```

## 📋 Содержание

- [Быстрый старт](#быстрый-старт)
- [Локальная разработка](#локальная-разработка)
- [Production setup](#production-setup)
- [Миграции](#миграции)
- [RLS Policies](#rls-policies)
- [Real-time](#real-time)

---

## 🚀 Быстрый Старт

### Вариант 1: Supabase Cloud (Рекомендуется для начала)

1. **Создайте проект на Supabase.com:**
   ```bash
   # Перейдите на https://supabase.com
   # Создайте новый проект
   # Выберите регион (EU для России)
   # Сохраните URL и API ключи
   ```

2. **Примените миграции:**
   ```bash
   # Установите Supabase CLI
   npm install -g supabase

   # Войдите в аккаунт
   supabase login

   # Свяжите проект
   supabase link --project-ref YOUR_PROJECT_REF

   # Примените миграции
   supabase db push
   ```

3. **Загрузите seed данные:**
   ```bash
   # Через SQL Editor на Supabase.com
   # Или через CLI:
   psql $DATABASE_URL < supabase/seed/seed.sql
   ```

4. **Настройте переменные окружения:**
   ```bash
   # frontend/.env
   VITE_SUPABASE_URL=https://your-project.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-key
   ```

### Вариант 2: Local Development с Docker

1. **Запустите локальный Supabase:**
   ```bash
   # В корне проекта
   supabase init
   supabase start
   ```

2. **Примените миграции:**
   ```bash
   supabase db reset
   ```

3. **Supabase будет доступен на:**
   - API: http://localhost:54321
   - Studio: http://localhost:54323
   - Database: postgresql://postgres:postgres@localhost:54322/postgres

---

## 📊 Database Schema

### Основные таблицы:

| Таблица | Описание | Real-time |
|---------|----------|-----------|
| `users` | Профили с рейтингами Glicko-2 | ❌ |
| `games` | Шахматные партии | ✅ |
| `moves` | Индивидуальные ходы | ✅ |
| `game_analysis` | Анализ партий | ❌ |
| `puzzles` | Тактические пазлы | ❌ |
| `user_puzzle_attempts` | Попытки решения пазлов | ❌ |
| `openings` | База дебютов | ❌ |
| `tournaments` | Турниры | ❌ |
| `tournament_participants` | Участники турниров | ✅ |

### Типы рейтингов:

```sql
-- По временному контролю
bullet_rating    -- < 3 минуты
blitz_rating     -- 3-10 минут
rapid_rating     -- 10-30 минут
classical_rating -- > 30 минут

-- Дополнительные
ai_rating        -- Игра с AI
puzzle_rating    -- Решение пазлов
```

---

## 🔒 Row Level Security (RLS)

Все таблицы защищены RLS policies:

### Games Table

```sql
-- ✅ Можно просматривать:
- Свои партии
- Публичные партии
- Завершенные партии

-- ✅ Можно обновлять:
- Только свои партии (оба игрока)

-- ❌ Нельзя:
- Удалять завершенные партии
- Модифицировать чужие партии
```

### Moves Table

```sql
-- ✅ Можно вставлять ходы:
- Только в свою очередь
- Только в активных партиях
- Автоматическая проверка move_number

-- ❌ Нельзя:
- Обновлять ходы (immutable)
- Удалять ходы
- Делать ход не в свою очередь
```

### Проверка прав в коде:

```typescript
// RLS автоматически фильтрует результаты
const { data: games } = await supabase
  .from('games')
  .select('*')
  .eq('white_player_id', userId);

// Нет доступа к чужим партиям - RLS вернет пустой массив
```

---

## ⚡ Real-time Subscriptions

### Подписка на изменения партии:

```typescript
const gameChannel = supabase
  .channel(`game:${gameId}`)

  // 1. Обновления состояния партии
  .on('postgres_changes',
    {
      event: 'UPDATE',
      schema: 'public',
      table: 'games',
      filter: `id=eq.${gameId}`
    },
    (payload) => {
      console.log('Game updated:', payload.new);
      setGame(payload.new);
    }
  )

  // 2. Новые ходы
  .on('postgres_changes',
    {
      event: 'INSERT',
      schema: 'public',
      table: 'moves',
      filter: `game_id=eq.${gameId}`
    },
    (payload) => {
      console.log('New move:', payload.new);
      addMove(payload.new);
    }
  )

  // 3. Broadcast для таймера (не сохраняется в БД)
  .on('broadcast',
    { event: 'clock-tick' },
    ({ payload }) => {
      setClock(payload);
    }
  )

  .subscribe();
```

### Broadcast таймера:

```typescript
// Отправка (каждую секунду)
gameChannel.send({
  type: 'broadcast',
  event: 'clock-tick',
  payload: {
    whiteTime: 180000,
    blackTime: 175000,
    activePlayer: 'white'
  }
});
```

### Presence (кто онлайн):

```typescript
const presenceChannel = supabase.channel('online-players');

// Присоединиться
presenceChannel.subscribe(async (status) => {
  if (status === 'SUBSCRIBED') {
    await presenceChannel.track({
      user_id: userId,
      online_at: new Date().toISOString()
    });
  }
});

// Отслеживать других
presenceChannel.on('presence', { event: 'sync' }, () => {
  const state = presenceChannel.presenceState();
  console.log('Online players:', Object.keys(state));
});
```

---

## 🎮 Примеры Использования

### Создание новой партии:

```typescript
const { data: game, error } = await supabase
  .from('games')
  .insert({
    white_player_id: userId,
    time_control: 'blitz',
    time_limit: 180,
    time_increment: 2,
    white_time_remaining: 180000,
    is_public: true
  })
  .select()
  .single();
```

### Сделать ход:

```typescript
// 1. Валидация на клиенте
const chess = new Chess(game.fen);
const move = chess.move({ from: 'e2', to: 'e4' });

if (!move) {
  throw new Error('Invalid move');
}

// 2. Вставить ход в БД
const { data: newMove, error } = await supabase
  .from('moves')
  .insert({
    game_id: gameId,
    user_id: userId,
    move_number: game.move_number + 1,
    uci: 'e2e4',
    san: move.san,
    fen: chess.fen(),
    time_spent: timeSpent,
    clock_time: remainingTime
  })
  .select()
  .single();

// 3. Обновить состояние партии
await supabase
  .from('games')
  .update({
    fen: chess.fen(),
    pgn: chess.pgn(),
    move_number: game.move_number + 1,
    last_move_at: new Date().toISOString(),
    // Проверка окончания партии
    status: chess.isGameOver() ? 'finished' : 'active',
    winner: chess.isCheckmate()
      ? (chess.turn() === 'w' ? 'black' : 'white')
      : chess.isDraw() ? 'draw' : null
  })
  .eq('id', gameId);

// Все подписчики автоматически получат обновления!
```

### Поиск партий:

```typescript
// Активные партии пользователя
const { data: activeGames } = await supabase
  .from('games')
  .select('*, white_player:users!white_player_id(*), black_player:users!black_player_id(*)')
  .or(`white_player_id.eq.${userId},black_player_id.eq.${userId}`)
  .in('status', ['waiting', 'active'])
  .order('created_at', { ascending: false });

// История партий
const { data: history } = await supabase
  .from('games')
  .select('*, white_player:users!white_player_id(username, blitz_rating), black_player:users!black_player_id(username, blitz_rating)')
  .or(`white_player_id.eq.${userId},black_player_id.eq.${userId}`)
  .eq('status', 'finished')
  .order('finished_at', { ascending: false })
  .limit(20);
```

### Получить пазл:

```typescript
// Адаптивный подбор по рейтингу
const userRating = user.puzzle_rating || 1500;

const { data: puzzle } = await supabase
  .from('puzzles')
  .select('*')
  .gte('rating', userRating - 200)
  .lte('rating', userRating + 200)
  .order('popularity', { ascending: false })
  .limit(1)
  .single();
```

---

## 🔧 Миграции

### Создание новой миграции:

```bash
# Создать файл миграции
supabase migration new add_feature_name

# Редактировать файл
nano supabase/migrations/20250123_add_feature_name.sql

# Применить локально
supabase db reset

# Применить в production
supabase db push
```

### Откат миграции:

```bash
# Локально
supabase db reset

# Production - осторожно!
# Создайте revert миграцию вручную
```

---

## 📈 Performance Tips

### 1. Используйте индексы:

```sql
-- Уже созданы в initial_schema.sql:
CREATE INDEX idx_games_white_player ON games(white_player_id);
CREATE INDEX idx_games_status ON games(status);
CREATE INDEX idx_moves_game_id ON moves(game_id, move_number);
```

### 2. Select только нужные поля:

```typescript
// ❌ Плохо - загружает все поля
const { data } = await supabase.from('games').select('*');

// ✅ Хорошо - только нужные поля
const { data } = await supabase
  .from('games')
  .select('id, status, fen, white_player_id, black_player_id');
```

### 3. Используйте лимиты:

```typescript
const { data } = await supabase
  .from('games')
  .select('*')
  .eq('status', 'finished')
  .order('finished_at', { ascending: false })
  .limit(20); // Пагинация
```

### 4. Кеширование на клиенте:

```typescript
// React Query для кеширования
import { useQuery } from '@tanstack/react-query';

const { data: games } = useQuery({
  queryKey: ['games', userId],
  queryFn: () => fetchUserGames(userId),
  staleTime: 5 * 60 * 1000, // 5 минут
});
```

---

## 🔐 Security Best Practices

### 1. Всегда используйте RLS:

```sql
-- Включите RLS на всех таблицах
ALTER TABLE table_name ENABLE ROW LEVEL SECURITY;
```

### 2. Проверяйте данные на клиенте И сервере:

```typescript
// Клиент
const chess = new Chess(fen);
if (!chess.move(move)) {
  return; // Invalid move
}

// RLS policy проверит на сервере автоматически
```

### 3. Никогда не используйте service_role ключ на клиенте:

```typescript
// ✅ Правильно - anon key
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ❌ НЕПРАВИЛЬНО - service_role key
// const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
```

---

## 📚 Полезные Ссылки

- [Supabase Docs](https://supabase.com/docs)
- [Realtime Documentation](https://supabase.com/docs/guides/realtime)
- [RLS Policies](https://supabase.com/docs/guides/auth/row-level-security)
- [Supabase CLI](https://supabase.com/docs/guides/cli)

---

## 🐛 Troubleshooting

### Проблема: Realtime не работает

```bash
# Проверьте, что таблица включена в публикацию
ALTER PUBLICATION supabase_realtime ADD TABLE games;

# Проверьте подписку
const channel = supabase.channel('test');
channel.subscribe((status) => {
  console.log('Status:', status); // Должно быть 'SUBSCRIBED'
});
```

### Проблема: RLS блокирует запросы

```sql
-- Проверьте политики
SELECT * FROM pg_policies WHERE tablename = 'games';

-- Временно отключите RLS для отладки (только локально!)
ALTER TABLE games DISABLE ROW LEVEL SECURITY;
```

### Проблема: Медленные запросы

```sql
-- Проверьте план запроса
EXPLAIN ANALYZE
SELECT * FROM games
WHERE white_player_id = 'user-id'
AND status = 'active';

-- Добавьте индекс если нужно
CREATE INDEX idx_custom ON games(white_player_id, status);
```

---

## 🎯 Следующие Шаги

1. ✅ Миграции созданы
2. ⏭️ Интеграция frontend с Supabase
3. ⏭️ Real-time game sync
4. ⏭️ Рефакторинг backend (только движки)
5. ⏭️ Тестирование
