# 📊 Анализ: Что создается при регистрации пользователя

## ✅ Текущая реализация

### 1. Таблица `users`
**Создается:** Вручную в `backend/src/auth/auth.service.ts:174-195`

```typescript
const { data: newUser, error: insertError } = await this.supabase
  .from('users')
  .insert({
    telegram_id: telegramUser.id,
    username: telegramUser.username || null,
    first_name: telegramUser.first_name,
    last_name: telegramUser.last_name || null,
    avatar_url: telegramUser.photo_url || null,
    language: telegramUser.language_code || 'en',
  })
  .select()
  .single();
```

**Что создается:**
- ✅ Профиль пользователя
- ✅ Дефолтные рейтинги (1500 для всех режимов)
- ✅ Дефолтная статистика (0 игр)

### 2. Таблица `user_wallets`
**Создается:** Автоматически через database trigger

**Trigger:** `supabase/migrations/20250123000004_betting_system.sql:171-174`
```sql
CREATE TRIGGER create_wallet_on_user_insert
  AFTER INSERT ON users
  FOR EACH ROW
  EXECUTE FUNCTION create_user_wallet();
```

**Функция:**
```sql
CREATE OR REPLACE FUNCTION create_user_wallet()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO user_wallets (user_id)
  VALUES (NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

**Что создается:**
- ✅ Кошелек пользователя
- ✅ Начальный баланс: **0 coins, 0 stars**
- ✅ Статистика: 0/0/0/0

**RLS Политика:** `supabase/migrations/20250123000005_betting_rls_policies.sql:26-29`
```sql
CREATE POLICY "System can insert wallets"
ON user_wallets FOR INSERT
WITH CHECK (true);
```

## ❌ Что НЕ создается при регистрации

### Не требуется при регистрации:
- ❌ `user_puzzle_attempts` - создается при решении паззлов
- ❌ `tournament_participants` - создается при участии в турнирах
- ❌ `games` - создается при начале игры
- ❌ `wallet_transactions` - создается при транзакциях
- ❌ `moves` - создается при совершении ходов
- ❌ `game_analysis` - создается после окончания игры

## 🔧 Проблемы и решения

### Проблема 1: RLS блокировала создание пользователей ✅ ИСПРАВЛЕНО

**Было:**
```sql
CREATE POLICY "Users can insert own profile"
  ON users FOR INSERT
  WITH CHECK (auth.uid() = id);
```

**Стало:** (миграция `20250126000001_fix_users_insert_policy.sql`)
```sql
CREATE POLICY "Allow user creation via service role or own profile"
  ON users FOR INSERT
  WITH CHECK (
    auth.uid() IS NULL  -- Service role
    OR auth.uid() = id
  );
```

### Проблема 2: Trigger может не сработать ⚠️ РИСК

**Риск:** Если trigger не срабатывает, кошелек не создается → ошибки при играх на ставки

**Как проверить:**
```sql
-- После регистрации нового пользователя
SELECT u.id, u.telegram_id, u.first_name, uw.id as wallet_id
FROM users u
LEFT JOIN user_wallets uw ON uw.user_id = u.id
WHERE u.created_at > NOW() - INTERVAL '1 hour'
ORDER BY u.created_at DESC;

-- Если wallet_id = NULL, значит trigger не сработал!
```

**Решение 1: Проверка в backend** (рекомендуется)
Обновить `auth.service.ts` для гарантированного создания кошелька:

```typescript
// После создания пользователя
// Убедиться что кошелек создался
const { data: wallet, error: walletError } = await this.supabase
  .from('user_wallets')
  .select('id')
  .eq('user_id', userId)
  .single();

if (walletError || !wallet) {
  // Trigger не сработал - создаем вручную
  await this.supabase.from('user_wallets').insert({ user_id: userId });
}
```

**Решение 2: Fallback в wallet service**
Обновить `wallet.service.ts:58-76` для автоматического создания:

```typescript
async getWallet(userId: string): Promise<UserWallet> {
  const { data, error } = await this.supabase
    .from('user_wallets')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (error?.code === 'PGRST116') {
    // Кошелек не найден - создаем
    const { data: newWallet, error: createError } = await this.supabase
      .from('user_wallets')
      .insert({ user_id: userId })
      .select()
      .single();

    if (createError) throw new BadRequestException('Failed to create wallet');
    return newWallet;
  }

  if (error) throw new BadRequestException('Failed to fetch wallet');
  return data;
}
```

## 💡 Рекомендации

### 1. Welcome Bonus (опционально)

Многие игры дают начальный баланс для новых игроков. Рекомендуется добавить:

**Вариант A: В trigger (автоматически)**
```sql
-- Обновить функцию create_user_wallet
CREATE OR REPLACE FUNCTION create_user_wallet()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO user_wallets (user_id, balance_coins)
  VALUES (NEW.id, 100.00);  -- 100 бесплатных монет

  -- Записать транзакцию
  INSERT INTO wallet_transactions (
    user_id,
    wallet_id,
    transaction_type,
    amount,
    currency,
    balance_before,
    balance_after,
    description
  ) VALUES (
    NEW.id,
    (SELECT id FROM user_wallets WHERE user_id = NEW.id),
    'deposit_coins',
    100.00,
    'coins',
    0.00,
    100.00,
    'Welcome bonus'
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

**Вариант B: В auth service (управляемо)**
```typescript
// После создания пользователя в auth.service.ts
if (newUser) {
  // Дать welcome bonus
  await this.walletService.addCoins(
    newUser.id,
    100,
    'Welcome bonus for new player'
  );
}
```

### 2. Logging и мониторинг

Добавить логирование в `auth.service.ts`:

```typescript
this.logger.log(`New user ${userId} created successfully`);

// Проверить кошелек
const { data: wallet } = await this.supabase
  .from('user_wallets')
  .select('id')
  .eq('user_id', userId)
  .single();

if (wallet) {
  this.logger.log(`Wallet ${wallet.id} created for user ${userId}`);
} else {
  this.logger.error(`Wallet NOT created for user ${userId}!`);
}
```

### 3. Тестирование

Тест для проверки полной регистрации:

```typescript
describe('User Registration', () => {
  it('should create user and wallet', async () => {
    // 1. Authenticate
    const result = await authService.authenticateUser(initData);

    // 2. Check user created
    expect(result.user).toBeDefined();
    expect(result.user.telegram_id).toBe(mockTelegramId);

    // 3. Check wallet created
    const wallet = await walletService.getWallet(result.user.id);
    expect(wallet).toBeDefined();
    expect(wallet.balance_coins).toBe(0); // или 100 если welcome bonus
    expect(wallet.balance_stars).toBe(0);
  });
});
```

## 📈 Порядок создания записей

```
1. POST /api/auth/telegram
   ↓
2. auth.service.authenticateUser()
   ↓
3. INSERT INTO users (...)
   ↓
4. 🔥 TRIGGER: create_wallet_on_user_insert
   ↓
5. INSERT INTO user_wallets (user_id)
   ↓
6. (опционально) Welcome bonus transaction
   ↓
7. Return JWT + user data
```

## 🚨 Возможные ошибки

### 1. "new row violates row-level security policy"
**Причина:** RLS политика блокирует INSERT
**Решение:** Применить миграцию `20250126000001_fix_users_insert_policy.sql`

### 2. "Wallet not found for user"
**Причина:** Trigger не сработал или была ошибка при создании кошелька
**Решение:** Добавить fallback в `wallet.service.ts` (см. выше)

### 3. "Failed to create user"
**Причина:** Неверные credentials или ошибка БД
**Проверка:**
```sql
SELECT * FROM pg_stat_activity WHERE state = 'active';
```

## 📝 Итоговый чеклист

При регистрации нового пользователя должно быть создано:

- [x] ✅ Запись в `users`
  - telegram_id
  - username, first_name, last_name
  - avatar_url
  - Дефолтные рейтинги (1500)
  - language preference

- [x] ✅ Запись в `user_wallets` (через trigger)
  - balance_coins: 0.00 (или 100 с welcome bonus)
  - balance_stars: 0
  - Все статистики: 0.00

- [ ] ⚠️ (Опционально) Welcome bonus transaction в `wallet_transactions`

## 🔍 SQL запросы для проверки

### Проверить недавних пользователей и их кошельки:
```sql
SELECT
  u.id,
  u.telegram_id,
  u.username,
  u.first_name,
  u.created_at as user_created,
  uw.id as wallet_id,
  uw.balance_coins,
  uw.balance_stars,
  uw.created_at as wallet_created
FROM users u
LEFT JOIN user_wallets uw ON uw.user_id = u.id
WHERE u.created_at > NOW() - INTERVAL '24 hours'
ORDER BY u.created_at DESC;
```

### Найти пользователей БЕЗ кошельков (проблема!):
```sql
SELECT
  u.id,
  u.telegram_id,
  u.username,
  u.created_at
FROM users u
LEFT JOIN user_wallets uw ON uw.user_id = u.id
WHERE uw.id IS NULL;
```

Если такие есть - нужно создать кошельки вручную:
```sql
INSERT INTO user_wallets (user_id)
SELECT u.id FROM users u
LEFT JOIN user_wallets uw ON uw.user_id = u.id
WHERE uw.id IS NULL;
```

---

**Создано:** 2025-11-26
**Статус:** Готово для проверки ✅
