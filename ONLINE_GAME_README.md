# Онлайн-игра в шахматы

## Реализованный функционал

### Backend (Node.js + TypeScript + Express + Socket.IO)

#### Модели данных (TypeORM)
- **User**: id, telegram_id, username, rating, created_at
- **Game**: id, white_id, black_id, fen, status (waiting, active, finished), move_number, created_at
- **Move**: id, game_id, move_number, uci, from, to, piece, captured, promotion, san, fen, timestamp

#### REST API
- `POST /api/online-games` - создать игру (режимы: "waiting", "join")
- `GET /api/online-games/:id` - получить состояние игры
- `GET /api/online-games/:id/history` - история игр пользователя
- `GET /api/online-games/waiting/list` - список ожидающих игр

#### WebSocket события (Socket.IO)
- `join_game: { userId, gameId }` - присоединиться к игре
- `player_move: { gameId, from, to, promotion }` - сделать ход
- `game_update: { fen, move, nextTurn }` - обновление состояния игры
- `resign: { gameId }` - сдаться
- `draw_offer: { gameId }` - предложить ничью
- `draw_accept: { gameId }` - принять ничью

#### Redis интеграция
- Хранение активных игр: `game:{id}` → {fen, moveNumber, status, currentTurn}
- Pub/Sub для синхронизации между инстансами Socket.IO

### Логика игры
- Ходы проверяются сервером через chess.js
- Состояние партии хранится в PostgreSQL
- После каждого хода обновляется Game и создается Move
- Поддержка матчмейкинга (ожидание соперника)

## Запуск и тестирование

### 1. Запуск через Docker Compose
```bash
# Запуск всех сервисов
docker-compose up -d

# Проверка статуса
docker-compose ps
```

### 2. Запуск вручную
```bash
# Запуск баз данных
docker-compose up -d db redis

# Backend
cd backend
npm install
npm run dev

# Frontend
cd frontend
npm install
npm run dev
```

### 3. Тестирование API

#### Создание игры
```bash
# Создать ожидающую игру
curl -X POST http://localhost:3000/api/online-games \
  -H "Content-Type: application/json" \
  -d '{"telegramId": 123456789, "mode": "waiting"}'

# Присоединиться к игре
curl -X POST http://localhost:3000/api/online-games \
  -H "Content-Type: application/json" \
  -d '{"telegramId": 987654321, "mode": "join"}'
```

#### Получение состояния игры
```bash
curl http://localhost:3000/api/online-games/{gameId}
```

### 4. Тестирование WebSocket

#### Подключение к игре
```javascript
const socket = io('http://localhost:3000');

// Присоединиться к игре
socket.emit('join_game', {
  userId: 'user-id',
  gameId: 'game-id'
});

// Слушать обновления
socket.on('game_update', (data) => {
  console.log('Game updated:', data);
});

// Сделать ход
socket.emit('player_move', {
  gameId: 'game-id',
  from: 'e2',
  to: 'e4'
});
```

## Структура проекта

```
backend/
├── src/
│   ├── controllers/
│   │   └── OnlineGameController.ts    # REST API контроллер
│   ├── services/
│   │   ├── GameService.ts             # Логика игр
│   │   └── WebSocketService.ts        # WebSocket обработка
│   ├── models/
│   │   ├── User.ts                    # Модель пользователя
│   │   ├── Game.ts                    # Модель игры
│   │   └── Move.ts                    # Модель хода
│   ├── routes/
│   │   └── onlineGameRoutes.ts        # Маршруты API
│   └── index.ts                       # Главный файл
├── docker-compose.yml                 # Docker конфигурация
└── package.json
```

## Особенности реализации

1. **Матчмейкинг**: Игроки могут создавать ожидающие игры или присоединяться к существующим
2. **Валидация ходов**: Все ходы проверяются сервером через chess.js
3. **Синхронизация**: Redis используется для хранения состояния и синхронизации между инстансами
4. **WebSocket комнаты**: Игроки объединяются в комнаты по gameId
5. **Обработка ошибок**: Подробные сообщения об ошибках для клиентов

## Следующие шаги

1. Добавить систему рейтингов
2. Реализовать турниры
3. Добавить анализ партий
4. Улучшить матчмейкинг (по рейтингу, времени)
5. Добавить уведомления
