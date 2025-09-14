# Chess Telegram Mini App

Монорепозиторий для приложения шахмат в формате Telegram Mini App.

## Структура проекта

```
chess/
├── frontend/          # React + TypeScript + Vite + Tailwind CSS
├── backend/           # Node.js + TypeScript + Express + Socket.IO
├── docker-compose.yml # Docker конфигурация
└── README.md
```

## Технологии

### Frontend
- React 19 + TypeScript
- Vite для сборки
- Tailwind CSS для стилей
- react-chessboard для шахматной доски
- chess.js для логики игры
- Telegram Mini Apps SDK

### Backend
- Node.js + TypeScript
- Express.js для REST API
- Socket.IO для WebSocket соединений
- TypeORM для работы с базой данных
- PostgreSQL для хранения данных
- Redis для кэширования и матчмейкинга

### Базы данных
- PostgreSQL для основных данных
- Redis для кэширования и WebSocket синхронизации

## Быстрый старт

### Предварительные требования
- Node.js 18+
- Docker и Docker Compose
- npm или yarn

### Установка и запуск

1. **Клонируйте репозиторий:**
```bash
git clone <repository-url>
cd chess
```

2. **Установите зависимости:**
```bash
npm install
```

3. **Запустите с помощью Docker Compose:**
```bash
npm run docker:up
```

Или запустите сервисы по отдельности:

```bash
# Запуск баз данных
docker-compose up -d db redis

# Запуск backend (в отдельном терминале)
cd backend
npm install
npm run dev

# Запуск frontend (в отдельном терминале)
cd frontend
npm install
npm run dev
```

### Доступ к приложению

- **Frontend:** http://localhost:5173
- **Backend API:** http://localhost:3000
- **Health Check:** http://localhost:3000/health

## Разработка

### Frontend

```bash
cd frontend
npm run dev          # Запуск dev сервера
npm run build        # Сборка для продакшена
npm run test         # Запуск тестов
npm run lint         # Линтинг
npm run cypress:open # E2E тесты
```

### Backend

```bash
cd backend
npm run dev          # Запуск dev сервера
npm run build        # Сборка TypeScript
npm run start        # Запуск продакшен сервера
npm run test         # Запуск тестов
npm run lint         # Линтинг
```

## API Endpoints

### Игры против ИИ
- `POST /api/games` - Создать игру
- `GET /api/games/:id` - Получить состояние игры
- `POST /api/games/:id/moves` - Сделать ход
- `POST /api/games/:id/ai-move` - Получить ход ИИ

### Онлайн-игры
- `POST /api/online-games` - Создать/присоединиться к игре
- `GET /api/online-games/:id` - Получить состояние онлайн-игры
- `GET /api/online-games/:id/history` - История игр пользователя
- `GET /api/online-games/waiting/list` - Список ожидающих игр

### Пользователи
- `GET /api/users/:id` - Получить пользователя
- `GET /api/users/:id/history` - История игр пользователя
- `POST /api/users` - Создать/обновить пользователя

### WebSocket события
- `join_game` - Присоединиться к игре
- `player_move` - Сделать ход
- `game_update` - Обновление состояния игры
- `resign` - Сдаться
- `draw_offer` - Предложить ничью
- `draw_accept` - Принять ничью

## Функциональность

### ✅ Реализовано
- [x] Базовая структура монорепозитория
- [x] Frontend с React + TypeScript + Vite
- [x] Tailwind CSS стилизация
- [x] Telegram Mini Apps SDK интеграция
- [x] Шахматная доска с кастомной реализацией
- [x] Логика игры с chess.js
- [x] Backend с Express + TypeScript
- [x] Socket.IO для WebSocket соединений
- [x] TypeORM модели для PostgreSQL
- [x] Redis интеграция
- [x] Docker Compose конфигурация
- [x] Базовое тестирование (Jest + Cypress)
- [x] ESLint + Prettier настройка
- [x] **Онлайн-игра с WebSocket**
- [x] **Матчмейкинг система**
- [x] **REST API для игр**
- [x] **Валидация ходов на сервере**

### 🚧 В разработке
- [ ] Полноценная интеграция с Stockfish
- [ ] Система рейтингов
- [ ] Турниры
- [ ] Анализ партий
- [ ] История партий
- [ ] Профиль пользователя

### 📋 Планируется
- [ ] Турниры
- [ ] Анализ партий
- [ ] Уведомления
- [ ] Мобильная оптимизация

## Конфигурация

### Переменные окружения

Создайте файл `.env` в корне проекта:

```env
# Server
PORT=3000
NODE_ENV=development
FRONTEND_URL=http://localhost:5173

# Database
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=postgres
DB_NAME=chess_db

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_DB=0

# Telegram
TELEGRAM_BOT_TOKEN=your_bot_token_here
TELEGRAM_WEBHOOK_URL=your_webhook_url_here
```

## Тестирование

### Unit тесты (Jest)
```bash
npm run test
```

### E2E тесты (Cypress)
```bash
npm run cypress:open
```

## Развертывание

### Docker
```bash
docker-compose up -d
```

### Продакшен сборка
```bash
npm run build
```

## Лицензия

MIT License

## Поддержка

Для вопросов и предложений создавайте Issues в репозитории.
