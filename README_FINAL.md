# ♔ Chess Telegram Mini App

Полнофункциональное приложение для игры в шахматы в Telegram с поддержкой онлайн-игры и ИИ.

## 🚀 Особенности

- **Telegram Mini App** - нативная интеграция с Telegram
- **Онлайн-игра** - игра с друзьями в реальном времени через WebSocket
- **ИИ противник** - игра против Stockfish WASM
- **Современный UI** - адаптивный дизайн с Tailwind CSS
- **История партий** - сохранение и просмотр всех игр
- **Чат в игре** - общение с соперником
- **Матчмейкинг** - автоматический поиск соперников

## 🛠 Технологический стек

### Frontend
- **React 18** + **TypeScript** + **Vite**
- **@tma.js/sdk** - Telegram Mini Apps SDK
- **Zustand** - управление состоянием
- **Tailwind CSS** - стилизация
- **React Router** - навигация
- **Socket.IO Client** - WebSocket соединения
- **chess.js** - шахматная логика
- **stockfish** - ИИ движок

### Backend
- **NestJS** - Node.js фреймворк
- **Prisma** - ORM для PostgreSQL
- **PostgreSQL** - основная база данных
- **Socket.IO** - WebSocket сервер
- **Redis** - кэширование и синхронизация
- **chess.js** - валидация ходов

### Deployment
- **Vercel** - фронтенд хостинг
- **Render** - бэкенд хостинг
- **Neon/Upstash** - база данных и Redis
- **Docker** - контейнеризация

## 📁 Структура проекта

```
chess/
├── frontend/                 # React приложение
│   ├── src/
│   │   ├── components/      # UI компоненты
│   │   ├── pages/          # Страницы приложения
│   │   ├── hooks/          # React хуки
│   │   ├── services/       # API и WebSocket сервисы
│   │   ├── store/          # Zustand store
│   │   └── types/          # TypeScript типы
│   ├── public/             # Статические файлы
│   └── vercel.json         # Vercel конфигурация
├── backend/                 # NestJS API
│   ├── src/
│   │   ├── game/           # Игровая логика
│   │   ├── user/           # Пользователи
│   │   ├── websocket/      # WebSocket gateway
│   │   └── prisma/         # Prisma сервис
│   ├── prisma/             # Схема базы данных
│   └── Dockerfile          # Docker конфигурация
├── docker-compose.yml       # Локальная разработка
└── DEPLOYMENT.md           # Инструкции по деплою
```

## 🎮 Игровые режимы

### 1. Игра с человеком
- Автоматический матчмейкинг
- Создание пригласительных ссылок
- WebSocket синхронизация ходов
- Чат во время игры
- Предложение ничьей и сдача

### 2. Игра с ИИ
- Stockfish WASM движок
- Настраиваемая сложность
- Анализ позиции
- Подсказки ходов

### 3. История партий
- Просмотр всех сыгранных игр
- Статистика по играм
- Фильтрация по результату
- Экспорт партий

## 🔧 Локальная разработка

### Требования
- Node.js 18+
- Docker & Docker Compose
- PostgreSQL (или Docker)
- Redis (или Docker)

### Быстрый старт

```bash
# Клонирование репозитория
git clone <repository-url>
cd chess

# Запуск через Docker Compose
docker-compose up -d

# Или запуск вручную:

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

### Доступ к приложению
- Frontend: http://localhost:5173
- Backend API: http://localhost:3000
- WebSocket: ws://localhost:3000

## 🚀 Деплой в продакшн

### 1. Подготовка
1. Создайте PostgreSQL базу данных (Neon/Render)
2. Создайте Redis инстанс (Upstash)
3. Создайте аккаунты на Vercel и Render

### 2. Деплой бэкенда
1. Подключите GitHub к Render
2. Выберите папку `backend`
3. Настройте переменные окружения
4. Задеплойте

### 3. Деплой фронтенда
1. Подключите GitHub к Vercel
2. Выберите папку `frontend`
3. Настройте переменные окружения
4. Задеплойте

### 4. Настройка Telegram Bot
1. Создайте бота через @BotFather
2. Создайте Mini App
3. Укажите URL фронтенда
4. Настройте домен

Подробные инструкции в [DEPLOYMENT.md](./DEPLOYMENT.md)

## 📱 Telegram Mini App интеграция

### Авторизация
- Автоматическое получение данных пользователя
- Сохранение в Zustand store
- Поддержка гостевого режима

### UI/UX
- Адаптация под тему Telegram
- Нативные кнопки и элементы
- Haptic feedback
- Поддержка темной темы

### Функции
- Главная кнопка для действий
- Кнопка "Назад" для навигации
- Уведомления и алерты
- Открытие ссылок

## 🔌 API Endpoints

### Пользователи
- `POST /users` - создание пользователя
- `GET /users/:id` - получение пользователя
- `GET /users/:id/history` - история игр

### Игры
- `POST /games` - создание игры
- `GET /games/:id` - получение игры
- `POST /games/:id/move` - ход в игре
- `POST /games/:id/resign` - сдача
- `POST /games/:id/draw` - ничья

### WebSocket события
- `join_game` - присоединение к игре
- `player_move` - ход игрока
- `game_update` - обновление игры
- `resign` - сдача
- `draw_offer` - предложение ничьей

## 🎯 Основные компоненты

### Frontend
- **StartPage** - стартовый экран с авторизацией
- **MainMenu** - главное меню с выбором режима
- **OnlineGamePage** - онлайн игра с WebSocket
- **AIGamePage** - игра против ИИ
- **HistoryPage** - история партий
- **ChessBoard** - шахматная доска
- **GameInfo** - информация об игре

### Backend
- **GameService** - логика игр
- **UserService** - управление пользователями
- **WebSocketGateway** - WebSocket обработка
- **PrismaService** - работа с базой данных

## 🧪 Тестирование

### Frontend тесты
```bash
cd frontend
npm test
```

### Backend тесты
```bash
cd backend
npm test
```

### E2E тесты
```bash
cd frontend
npm run test:e2e
```

## 📊 Мониторинг

### Логи
- Frontend: Vercel Functions logs
- Backend: Render logs
- Database: Neon/Render logs

### Метрики
- WebSocket соединения
- API запросы
- Игровые сессии
- Ошибки

## 🔒 Безопасность

- Валидация всех входных данных
- CORS настройки
- Rate limiting
- SQL injection защита
- XSS защита

## 🚨 Известные ограничения

1. Stockfish WASM может быть медленным на слабых устройствах
2. WebSocket соединения могут разрываться при плохом интернете
3. Telegram Mini Apps работают только по HTTPS
4. Ограничения Telegram на размер приложения

## 🤝 Вклад в проект

1. Fork репозитория
2. Создайте feature branch
3. Внесите изменения
4. Добавьте тесты
5. Создайте Pull Request

## 📄 Лицензия

MIT License - см. файл LICENSE

## 📞 Поддержка

- GitHub Issues для багов
- Telegram: @your_support_bot
- Email: support@yourdomain.com

## 🎉 Благодарности

- [chess.js](https://github.com/jhlywa/chess.js) - шахматная логика
- [Stockfish](https://stockfishchess.org/) - ИИ движок
- [@tma.js/sdk](https://tma.js.org/) - Telegram Mini Apps SDK
- [NestJS](https://nestjs.com/) - Node.js фреймворк
- [Prisma](https://prisma.io/) - ORM

---

**Готово к запуску!** 🚀

Следуйте инструкциям в [DEPLOYMENT.md](./DEPLOYMENT.md) для деплоя в продакшн.
