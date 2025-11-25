# 🚀 Deployment Guide - Click-to-Move Update

## Что изменилось

### ✅ Новая система управления
**Было:** Drag-and-drop (перетаскивание фигур)
**Стало:** Click-to-move (клик по фигуре, клик куда походить)

### 🎮 Как теперь играть

1. **Кликните** на свою фигуру (белые) → она подсветится **жёлтым**
2. Возможные ходы покажутся **зелёными точками**
3. **Кликните** на зелёную точку → фигура походит
4. Клик на ту же фигуру → отмена выбора
5. Клик на другую свою фигуру → переключение выбора

### 📱 Исправления Telegram
- ✅ Кнопки Telegram больше НЕ перекрывают контент
- ✅ Правильные отступы для safe-area
- ✅ Haptic feedback при выборе фигуры

---

## 🔄 Обновление на VPS

### Шаг 1: Получить изменения

```bash
# Зайти на VPS по SSH
ssh user@your-vps-ip

# Перейти в директорию проекта
cd /path/to/chess-telegram-miniapp

# Получить последние изменения
git fetch origin
git pull origin claude/fix-telegram-service-import-015zTw5FAomJkH5A4vPssX23
```

### Шаг 2: Пересобрать frontend

```bash
# Пересобрать только frontend контейнер
docker-compose -f docker-compose.vps.yml build frontend

# Перезапустить
docker-compose -f docker-compose.vps.yml up -d frontend

# Проверить что контейнер запустился
docker-compose -f docker-compose.vps.yml ps
```

### Шаг 3: Проверка

```bash
# Посмотреть логи frontend
docker-compose -f docker-compose.vps.yml logs -f frontend

# Если нужно - перезапустить все сервисы
docker-compose -f docker-compose.vps.yml restart
```

---

## 🔍 Просмотр логов

### Frontend логи (React приложение)

```bash
# В реальном времени
docker logs chess-frontend -f

# Последние 100 строк
docker logs chess-frontend --tail 100

# Логи за последний час
docker logs chess-frontend --since 1h
```

Вы должны увидеть логи типа:
```
[AIGame] Square clicked: e2
[AIGame] Selecting piece, moves: ["e3", "e4"]
[AIGame] Attempting move: e2 → e4
[AIGame] Move result: true
```

### Backend логи (NestJS API)

```bash
# В реальном времени
docker logs chess-backend -f

# Последние 100 строк
docker logs chess-backend --tail 100
```

Вы должны увидеть:
```
🚀 Chess Backend running on port 3000
Stockfish initialized successfully
```

### Все логи сразу

```bash
# Логи всех контейнеров
docker-compose -f docker-compose.vps.yml logs -f

# Только backend и frontend
docker-compose -f docker-compose.vps.yml logs -f backend frontend
```

### Если логи пустые

```bash
# Проверить что контейнеры запущены
docker ps

# Проверить статус сервисов
docker-compose -f docker-compose.vps.yml ps

# Перезапустить если нужно
docker-compose -f docker-compose.vps.yml restart frontend
```

---

## 🧪 Тестирование

### 1. Проверить что приложение открывается

```bash
# Если у вас есть домен
curl https://your-domain.com

# Если только IP
curl http://your-vps-ip

# Должны увидеть HTML страницу
```

### 2. Открыть в Telegram

1. Открыть бота в Telegram
2. Нажать "Play vs AI"
3. Попробовать сделать ход:
   - Кликнуть на пешку (e2)
   - Должна подсветиться жёлтым
   - Должны появиться зелёные точки на e3 и e4
   - Кликнуть на зелёную точку
   - Пешка должна переместиться
   - AI должен ответить

### 3. Проверить что BackButton не перекрывается

- Открыть страницу в Telegram
- Telegram BackButton (←) должен быть в header Telegram
- Заголовок игры НЕ должен быть под кнопкой
- Между Telegram UI и контентом должен быть отступ

---

## ❌ Troubleshooting

### Проблема: "Фигуры всё равно возвращаются назад"

**Решение:**
```bash
# Очистить кэш и пересобрать
docker-compose -f docker-compose.vps.yml build --no-cache frontend
docker-compose -f docker-compose.vps.yml up -d frontend

# Проверить что новая версия
docker logs chess-frontend | grep "AIGame"
```

### Проблема: "Не видно зелёных точек"

**Причина:** Возможно old cache в браузере Telegram

**Решение:**
1. Закрыть Mini App в Telegram
2. Закрыть чат с ботом
3. Открыть снова
4. Hard reload (если в web версии: Ctrl+Shift+R)

### Проблема: "Логи пустые"

**Проверка:**
```bash
# Проверить что контейнер вообще работает
docker ps | grep chess-frontend

# Проверить логи Nginx (который раздаёт frontend)
docker logs chess-nginx

# Зайти внутрь контейнера
docker exec -it chess-frontend sh
ls -la /usr/share/nginx/html/
```

### Проблема: "502 Bad Gateway"

**Причина:** Backend не отвечает или не запущен

**Решение:**
```bash
# Проверить backend
docker logs chess-backend --tail 50

# Проверить что Stockfish инициализировался
docker logs chess-backend | grep "Stockfish"

# Перезапустить backend
docker-compose -f docker-compose.vps.yml restart backend

# Подождать 10 секунд и проверить
sleep 10
curl http://localhost:3000/health
```

### Проблема: "Telegram кнопки всё равно перекрываются"

**Проверка:**
```bash
# Убедиться что новый CSS загрузился
docker exec chess-frontend cat /usr/share/nginx/html/assets/*.css | grep "safe-area"

# Должны увидеть: padding-top: env(safe-area-inset-top);
```

**Решение:**
```bash
# Полная очистка и пересборка
docker-compose -f docker-compose.vps.yml down
docker-compose -f docker-compose.vps.yml build --no-cache frontend
docker-compose -f docker-compose.vps.yml up -d
```

---

## 📊 Мониторинг

### Проверка ресурсов

```bash
# Использование CPU и RAM
docker stats

# Должно быть примерно:
# Frontend:  ~50MB RAM, ~1% CPU
# Backend:   ~300-500MB RAM, ~5-10% CPU
# Redis:     ~200MB RAM, ~1% CPU
```

### Проверка здоровья

```bash
# Backend health check
curl http://localhost:3000/health

# Frontend (через Nginx)
curl http://localhost

# Все сервисы
docker-compose -f docker-compose.vps.yml ps
```

---

## 🎯 Checklist после деплоя

- [ ] Git pull выполнен
- [ ] Frontend пересобран и перезапущен
- [ ] Логи frontend показывают `[AIGame]` сообщения
- [ ] Логи backend показывают "Stockfish initialized"
- [ ] Приложение открывается в браузере
- [ ] Можно сделать ход в AI игре (клик → подсветка → клик → ход)
- [ ] Зелёные точки видны на возможных ходах
- [ ] AI отвечает на ходы
- [ ] Telegram BackButton не перекрывает контент
- [ ] Haptic feedback работает (вибрация при клике)

---

## 💡 Полезные команды

```bash
# Быстрый перезапуск frontend
docker-compose -f docker-compose.vps.yml restart frontend

# Полный перезапуск всего
docker-compose -f docker-compose.vps.yml restart

# Посмотреть что внутри frontend контейнера
docker exec -it chess-frontend sh

# Скопировать файл из контейнера для проверки
docker cp chess-frontend:/usr/share/nginx/html/index.html ./test.html

# Проверить размер логов
docker inspect chess-frontend --format='{{.LogPath}}' | xargs ls -lh

# Очистить старые логи если накопились
docker-compose -f docker-compose.vps.yml logs --no-log-prefix > /dev/null
```

---

## 📞 Если ничего не помогло

1. **Сохраните логи:**
```bash
docker-compose -f docker-compose.vps.yml logs > logs.txt
docker ps -a >> logs.txt
docker stats --no-stream >> logs.txt
```

2. **Проверьте .env файл:**
```bash
grep -v "KEY\|PASSWORD" .env
```

3. **Попробуйте полную переустановку:**
```bash
docker-compose -f docker-compose.vps.yml down -v
docker-compose -f docker-compose.vps.yml build --no-cache
docker-compose -f docker-compose.vps.yml up -d
```

4. **Проверьте версию Git:**
```bash
git log --oneline -5
# Должен быть коммит: "feat: implement click-to-move chess"
```

---

**Last Updated:** November 25, 2025
**Version:** Click-to-Move v1.0
