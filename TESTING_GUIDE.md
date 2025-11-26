# 🧪 Testing Guide - Betting System

Руководство по тестированию полного flow системы ставок для Chess Telegram MiniApp.

## 📋 Подготовка к тестированию

### Предварительные требования:
1. ✅ Применены все миграции БД
2. ✅ Backend запущен (NestJS)
3. ✅ Frontend запущен (React)
4. ✅ Supabase настроен
5. ✅ Два тестовых Telegram аккаунта

### Тестовые данные:
```sql
-- Добавить тестовые монеты пользователям
UPDATE user_wallets
SET balance_coins = 10000, balance_stars = 100
WHERE user_id IN ('user1_id', 'user2_id');
```

---

## 🎯 Test Cases

### 1. Бесплатная игра (Free Battle)

#### Сценарий: Happy Path
**Участники:** Игрок А (белые), Игрок Б (черные)

**Шаги:**
1. **Игрок А**: Заходит в MainMenu
2. **Игрок А**: Нажимает "Create Invite Link"
3. **Система**: Создает игру со статусом `pending_bet_setup`
4. **Игрок А**: Видит GameModePopup с 3 опциями
5. **Игрок А**: Выбирает "Free Battle"
6. **Система**:
   - Создает game_bet с type='free'
   - Обновляет game.status → 'waiting'
   - Открывает share dialog Telegram
7. **Игрок А**: Делится ссылкой с Игроком Б
8. **Игрок Б**: Переходит по ссылке
9. **Система**: Обновляет game.black_player_id, status → 'active'
10. **Оба игрока**: Игра начинается

**Ожидаемый результат:**
- ✅ Игра стартует без запроса депозитов
- ✅ Нет записей в wallet_transactions
- ✅ game_bets.status = 'completed' (free)
- ✅ После завершения игры нет начислений

**SQL проверки:**
```sql
-- Проверить bet
SELECT * FROM game_bets WHERE game_id = 'game_id';
-- Expected: bet_type = 'free', status = 'completed'

-- Проверить что нет транзакций
SELECT * FROM wallet_transactions WHERE game_id = 'game_id';
-- Expected: empty
```

---

### 2. Игра на монеты (Coins Game)

#### Сценарий: Happy Path - Победа белых
**Участники:** Игрок А (белые, 1000 coins), Игрок Б (черные, 1000 coins)
**Ставка:** 100 coins каждый

**Шаги:**

**Фаза 1: Создание ставки**
1. **Игрок А**: Нажимает "Create Invite Link"
2. **Игрок А**: Выбирает "Coins Game" в GameModePopup
3. **Система**: Показывает BetAmountPopup
4. **Игрок А**: Видит баланс: 1000 coins
5. **Игрок А**: Вводит 100 в поле amount
6. **Система**: Показывает расчет:
   - Your bet: 100 coins
   - Opponent bet: 100 coins
   - Total pot: 200 coins
   - Platform fee (10%): 20 coins
   - Winner gets: 180 coins
7. **Игрок А**: Нажимает "Propose Bet"
8. **Система**:
   - Создает game_bet (type='coins', amount=100, status='pending')
   - Обновляет game.status → 'pending_bet_acceptance'
9. **Игрок А**: Делится ссылкой

**Проверки после фазы 1:**
```sql
SELECT * FROM game_bets WHERE game_id = 'game_id';
-- Expected:
-- bet_type = 'coins'
-- bet_amount = 100
-- status = 'pending'
-- white_deposit_status = 'pending'
-- black_deposit_status = 'pending'
-- platform_fee_percentage = 10
-- winner_payout = 180

SELECT status FROM games WHERE id = 'game_id';
-- Expected: 'pending_bet_acceptance'
```

**Фаза 2: Принятие ставки**
10. **Игрок Б**: Переходит по ссылке
11. **Система**: Показывает BetConfirmationPopup
12. **Игрок Б**: Видит:
    - Opponent's bet: 100 coins
    - Your bet: 100 coins
    - Total pot: 200 coins
    - Winner gets: 180 coins
    - Terms (5 пунктов)
13. **Игрок Б**: Читает условия
14. **Игрок Б**: Ставит галочку "I accept the terms"
15. **Игрок Б**: Нажимает "Accept Terms & Deposit"
16. **Система**:
    - Обновляет game.black_player_id
    - Обновляет game.status → 'pending_deposits'

**Проверки после фазы 2:**
```sql
SELECT status FROM games WHERE id = 'game_id';
-- Expected: 'pending_deposits'

SELECT status FROM game_bets WHERE game_id = 'game_id';
-- Expected: still 'pending'
```

**Фаза 3: Внесение депозитов**
17. **Оба игрока**: Видят DepositWaitingPopup
18. **Игрок А**: Видит:
    - White (You): ⏳ Waiting for deposit
    - Black: ⏳ Waiting for deposit
19. **Игрок А**: Нажимает "Deposit"
20. **Система**: Вызывает `deposit_game_bet(game_id, user_a_id)`
21. **База данных**:
    ```sql
    -- Списывает 100 coins с balance
    -- Создает transaction (type='bet_lock')
    -- Обновляет white_deposit_status = 'locked'
    ```
22. **Игрок А**: Видит ✅ Your deposit received
23. **Игрок Б**: Видит обновление в реал-тайме
24. **Игрок Б**: Нажимает "Deposit"
25. **Система**: Вызывает `deposit_game_bet(game_id, user_b_id)`
26. **База данных**:
    - Списывает 100 coins
    - Создает transaction
    - Обновляет black_deposit_status = 'locked'
    - **Оба внесли** → обновляет:
      - game_bets.status = 'locked'
      - games.status = 'active'
      - game_bets.total_pot = 200

**Проверки после фазы 3:**
```sql
-- Проверить балансы
SELECT balance_coins FROM user_wallets WHERE user_id IN ('user_a', 'user_b');
-- Expected: 900, 900 (было 1000-100)

-- Проверить транзакции
SELECT * FROM wallet_transactions
WHERE game_id = 'game_id' AND transaction_type = 'bet_lock';
-- Expected: 2 rows (по одной на игрока)

-- Проверить bet
SELECT status, white_deposit_status, black_deposit_status, total_pot
FROM game_bets WHERE game_id = 'game_id';
-- Expected: 'locked', 'locked', 'locked', 200

-- Проверить game
SELECT status FROM games WHERE id = 'game_id';
-- Expected: 'active'
```

**Фаза 4: Игра**
27. **Оба игрока**: Видят шахматную доску
28. **Игроки**: Играют партию
29. **Игрок А**: Побеждает (мат)
30. **Система**: Обновляет games.winner_id = 'user_a_id'

**Фаза 5: Выплата (автоматическая)**
31. **Триггер `process_bet_payout()`** срабатывает автоматически:
    - Читает game_bet.winner_payout = 180
    - Начисляет 180 coins на wallet Игрока А
    - Создает transaction (type='bet_win')
    - Обновляет wallet.total_won += 180 (Игрок А)
    - Обновляет wallet.total_lost += 100 (Игрок Б)
    - Обновляет game_bets.status = 'completed'

**Финальные проверки:**
```sql
-- Проверить балансы
SELECT user_id, balance_coins, total_won, total_lost
FROM user_wallets WHERE user_id IN ('user_a', 'user_b');
-- Expected:
-- user_a: 1080 coins (1000-100+180), total_won=180, total_lost=0
-- user_b: 900 coins (1000-100), total_won=0, total_lost=100

-- Проверить bet
SELECT status FROM game_bets WHERE game_id = 'game_id';
-- Expected: 'completed'

-- Проверить транзакции
SELECT transaction_type, amount, user_id
FROM wallet_transactions WHERE game_id = 'game_id'
ORDER BY created_at;
-- Expected 3 rows:
-- 1. bet_lock, -100, user_a
-- 2. bet_lock, -100, user_b
-- 3. bet_win, +180, user_a

-- Комиссия платформы
-- Total pot = 200, Winner gets = 180, Fee = 20 (10%)
```

**Итоговая математика:**
- Игрок А: было 1000 → внес 100 → получил 180 → стало 1080 (+80)
- Игрок Б: было 1000 → внес 100 → получил 0 → стало 900 (-100)
- Платформа: получила 20 coins комиссии (10% от 200)
- Сумма: 1080 + 900 + 20 = 2000 ✅

---

#### Сценарий: Draw (Ничья)
**Участники:** Игрок А, Игрок Б
**Ставка:** 100 coins каждый

**Отличие от Happy Path:**
- Шаги 1-26: идентичны
- Шаг 27-28: Игроки играют
- **Шаг 29**: Игроки соглашаются на ничью
- **Шаг 30**: Система обновляет games.result = 'draw'

**Автоматическая выплата при ничьей:**
```sql
-- Триггер handle_draw_refund()
-- Каждому возвращается 95% его ставки
-- user_a: 100 * 0.95 = 95 coins
-- user_b: 100 * 0.95 = 95 coins
-- Комиссия: 5 + 5 = 10 coins (5% от каждого)
```

**Финальные проверки:**
```sql
SELECT balance_coins FROM user_wallets WHERE user_id IN ('user_a', 'user_b');
-- Expected: 995, 995 (было 1000-100+95)

SELECT transaction_type, amount, user_id
FROM wallet_transactions WHERE game_id = 'game_id'
ORDER BY created_at;
-- Expected 4 rows:
-- 1. bet_lock, -100, user_a
-- 2. bet_lock, -100, user_b
-- 3. draw_refund, +95, user_a
-- 4. draw_refund, +95, user_b
```

---

#### Сценарий: Insufficient Balance
**Участники:** Игрок А (50 coins), Игрок Б (1000 coins)
**Попытка ставки:** 100 coins

**Шаги:**
1-8. Игрок А создает ставку на 100 coins (как в Happy Path)
9-16. Игрок Б принимает условия
17. Игрок Б нажимает "Deposit" → Успешно (900 coins)
18. **Игрок А**: Нажимает "Deposit"
19. **Система**: Вызывает `deposit_game_bet()`
20. **Функция проверяет баланс**: 50 < 100
21. **Возвращает ошибку**: "Insufficient balance"

**Ожидаемый результат:**
- ❌ Депозит Игрока А отклонен
- ✅ Игрок Б может отменить или ждать
- ✅ Через 5 минут автоматическая отмена + refund

**Проверки:**
```sql
-- Баланс Игрока Б не изменился (еще locked)
SELECT balance_coins FROM user_wallets WHERE user_id = 'user_b';
-- Expected: 900 (1000-100 locked)

-- Депозит статус
SELECT white_deposit_status, black_deposit_status
FROM game_bets WHERE game_id = 'game_id';
-- Expected: 'pending', 'locked'
```

---

#### Сценарий: Cancel Before Deposits
**Участники:** Игрок А, Игрок Б

**Шаги:**
1-16. Создание и принятие ставки (как Happy Path)
17. Оба видят DepositWaitingPopup
18. **Игрок А**: Нажимает "Cancel Bet"
19. **Система**: Вызывает `DELETE /api/game-bets/:gameId`
20. **Backend**:
    - Проверяет что нет locked deposits
    - Удаляет game_bet
    - Обновляет game.status = 'cancelled'

**Ожидаемый результат:**
- ✅ Bet удален
- ✅ Балансы не изменились
- ✅ Игра отменена
- ✅ Оба игрока получают уведомление

---

### 3. Игра на Telegram Stars

#### Сценарий: Happy Path
**Идентичен сценарию с Coins**, но:
- Валюта: `stars` вместо `coins`
- Минимальная ставка: 1 Star (вместо 10 coins)
- Проверки баланса в `balance_stars`

**Дополнительная проверка:**
```sql
-- Балансы Stars
SELECT balance_stars FROM user_wallets WHERE user_id IN ('user_a', 'user_b');

-- Транзакции Stars
SELECT * FROM wallet_transactions
WHERE game_id = 'game_id' AND currency = 'stars';
```

---

### 4. Покупка Telegram Stars

#### Сценарий: Purchase Stars Package

**Предварительное требование:** Настроен Telegram Bot с Payment API

**Шаги:**
1. **Пользователь**: Открывает Wallet/Profile
2. **Пользователь**: Нажимает "Buy Stars"
3. **Система**: Показывает PurchaseStarsPopup
4. **Пользователь**: Видит:
   - Текущий баланс: X Stars
   - 6 пакетов с бонусами
5. **Пользователь**: Выбирает "Premium Pack" (100+15 bonus)
6. **Система**: Подсвечивает выбранный пакет
7. **Пользователь**: Нажимает "Purchase Stars"
8. **Frontend**: Вызывает `POST /api/payment/create-invoice`
   ```json
   {
     "amount": 100,
     "description": "Purchase 100 Telegram Stars"
   }
   ```
9. **Backend**: Создает invoice:
   ```typescript
   {
     title: "Purchase 100 Telegram Stars",
     description: "Add 100 Stars to your Chess Master wallet",
     currency: "XTR",
     prices: [{ label: "100 Stars", amount: 100 }],
     payload: JSON.stringify({
       userId: "user_id",
       amount: 100,
       timestamp: Date.now()
     })
   }
   ```
10. **Frontend**: Получает invoice, вызывает Telegram WebApp API
11. **Telegram**: Показывает платежную форму
12. **Пользователь**: Подтверждает оплату в Telegram
13. **Telegram**: Отправляет pre-checkout query на webhook
14. **Backend**: Обрабатывает `POST /api/payment/pre-checkout`
    - Валидирует payload
    - Проверяет timestamp (не старше 24ч)
    - Возвращает `{ ok: true }`
15. **Telegram**: Обрабатывает платеж
16. **Telegram**: Отправляет successful_payment webhook
17. **Backend**: Обрабатывает `POST /api/payment/successful-payment`
    - Парсит payload
    - Вызывает `walletService.addStars(userId, 100, ...)`
    - Начисляет 100 Stars
    - Создает transaction
18. **Frontend**: Получает уведомление, обновляет баланс

**Проверки:**
```sql
-- Баланс обновлен
SELECT balance_stars FROM user_wallets WHERE user_id = 'user_id';
-- Expected: previous + 100

-- Транзакция создана
SELECT * FROM wallet_transactions
WHERE user_id = 'user_id'
  AND transaction_type = 'deposit_stars'
ORDER BY created_at DESC LIMIT 1;
-- Expected:
-- amount = 100
-- currency = 'stars'
-- metadata содержит telegram_payment_charge_id
```

**Примечание:** Бонус +15 Stars должен начисляться отдельной логикой (TODO)

---

#### Сценарий: Custom Amount

**Шаги:**
1-3. Открытие PurchaseStarsPopup
4. **Пользователь**: Прокручивает до "Custom Amount"
5. **Пользователь**: Вводит 250 в поле
6. **Система**: Показывает "You will receive: ⭐ 250 Stars"
7. **Пользователь**: Нажимает "Purchase Stars"
8-18. Аналогично package сценарию

**Проверки:**
- ✅ Минимум 1 Star
- ✅ Максимум 2500 Stars
- ❌ Отрицательные значения
- ❌ Не числовые значения

---

## 🔍 Edge Cases & Error Handling

### 1. Network Issues
- ❌ Потеря соединения во время депозита
- ❌ Timeout при создании ставки
- **Ожидаемое поведение**: Retry mechanism, rollback

### 2. Concurrent Deposits
- Оба игрока нажимают "Deposit" одновременно
- **Ожидаемое поведение**: PostgreSQL locks, sequential processing

### 3. Game Abandonment
- Игрок уходит после депозита
- **Ожидаемое поведение**: Timeout 15 минут → победа оппоненту

### 4. Double Deposit Attempt
- Игрок нажимает "Deposit" дважды
- **Ожидаемое поведение**: Проверка deposit_status, второй раз reject

### 5. Negative Balance Attack
- Попытка внести депозит с отрицательным балансом
- **Ожидаемое поведение**: Balance check в `deposit_game_bet()`

---

## 📊 Performance Testing

### Load Tests
```bash
# 100 concurrent bet creations
ab -n 100 -c 10 -H "Authorization: Bearer TOKEN" \
   -p bet.json \
   http://localhost:3000/api/game-bets

# Expected: < 500ms p95 latency
```

### Database Performance
```sql
-- Проверить индексы
EXPLAIN ANALYZE
SELECT * FROM game_bets WHERE game_id = 'xxx';

-- Должны использоваться indexes
-- Expected: Index Scan (not Seq Scan)
```

---

## ✅ Checklist перед деплоем

### Backend
- [ ] Все endpoints возвращают правильные status codes
- [ ] Error handling для всех edge cases
- [ ] Логирование всех операций
- [ ] Rate limiting на endpoints
- [ ] CORS настроен правильно
- [ ] Environment variables настроены
- [ ] Health check endpoint работает

### Database
- [ ] Все миграции применены
- [ ] RLS policies включены
- [ ] Индексы созданы
- [ ] Backup настроен
- [ ] Connection pooling настроен

### Frontend
- [ ] Error boundaries установлены
- [ ] Loading states для всех операций
- [ ] Offline mode handling
- [ ] Локализация полная (EN/RU)
- [ ] Responsive design проверен
- [ ] Telegram WebApp parameters читаются

### Integration
- [ ] Real-time subscriptions работают
- [ ] Telegram share links работают
- [ ] Платежи Telegram Stars (если используются)
- [ ] Analytics события отправляются

---

## 🐛 Known Issues & Limitations

1. **Telegram Payment API** требует Production Bot Token
2. **Stars bonuses** не реализованы автоматически
3. **Timeout deposits** требует background job (TODO)
4. **Refund при abandon** требует game monitoring service

---

## 📞 Support & Debugging

### Логи для проверки:
```bash
# Backend logs
tail -f logs/app.log | grep "game-bets\|wallet\|payment"

# Database logs
tail -f /var/log/postgresql/postgresql.log
```

### Debug queries:
```sql
-- Все активные ставки
SELECT g.id, g.status, gb.bet_type, gb.bet_amount, gb.status as bet_status
FROM games g
LEFT JOIN game_bets gb ON gb.game_id = g.id
WHERE g.status IN ('pending_bet_setup', 'pending_bet_acceptance', 'pending_deposits');

-- Locked funds
SELECT SUM(bet_amount * 2) as total_locked
FROM game_bets
WHERE status = 'locked';

-- Platform earnings
SELECT
  SUM(bet_amount * 2 * platform_fee_percentage / 100) as total_fees
FROM game_bets
WHERE status = 'completed';
```

---

**Последнее обновление:** 2025-01-26
**Версия:** 1.0
**Автор:** Claude Code (Sonnet 4.5)
