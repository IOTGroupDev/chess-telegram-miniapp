# 🚨 CRITICAL: Backend URL Configuration

## Проблема
Если вы видите ошибку **"Stockfish API error"** в консоли Eruda - это означает, что фронтенд **не может подключиться** к бэкенду!

## Причина
Переменная `BACKEND_URL` в файле `.env` на VPS указана неправильно или не соответствует реальному адресу сервера.

## Решение

### 1. Откройте .env файл на VPS:
```bash
cd ~/chess-telegram-miniapp
nano .env
```

### 2. Найдите строку с BACKEND_URL и измените её:

#### Вариант A: У вас есть домен с SSL (HTTPS)
```bash
BACKEND_URL=https://asrtalink.vip
```
**Проверка:** Откройте в браузере `https://asrtalink.vip/health` - должно показать JSON с `{"status":"ok"}`

#### Вариант B: У вас домен БЕЗ SSL (HTTP)
```bash
BACKEND_URL=http://asrtalink.vip
```
**Проверка:** Откройте в браузере `http://asrtalink.vip/health`

#### Вариант C: Используете только IP адрес
```bash
BACKEND_URL=http://YOUR_VPS_IP:3000
```
Замените `YOUR_VPS_IP` на реальный IP вашего VPS, например:
```bash
BACKEND_URL=http://123.45.67.89:3000
```
**Проверка:** Откройте в браузере `http://123.45.67.89:3000/health`

### 3. Проверьте что backend доступен:

```bash
# Проверка изнутри VPS (должно работать):
curl http://localhost:3000/health

# Проверка снаружи (с вашего компьютера или браузера):
curl http://YOUR_VPS_IP:3000/health
# или
curl https://yourdomain.com/health
```

**Ожидаемый ответ:**
```json
{"status":"ok","timestamp":"2025-11-25T..."}
```

### 4. Пересоберите frontend с новым BACKEND_URL:

```bash
cd ~/chess-telegram-miniapp
sudo docker-compose -f docker-compose.vps.yml build frontend
sudo docker-compose -f docker-compose.vps.yml up -d frontend
```

**ВАЖНО:** Frontend должен быть **пересобран**, потому что `VITE_ENGINE_API_URL` встраивается в JavaScript во время сборки!

### 5. Проверьте в Eruda Console:

После пересборки откройте приложение в Telegram и в Eruda Console введите:
```javascript
import.meta.env.VITE_ENGINE_API_URL
```
Или просто:
```javascript
console.log('Backend URL:', import.meta.env.VITE_ENGINE_API_URL)
```

Должно показать ваш реальный BACKEND_URL.

## Типичные ошибки

### ❌ Ошибка 1: Использован localhost
```bash
BACKEND_URL=http://localhost:3000  # НЕ РАБОТАЕТ!
```
**Почему:** `localhost` работает только внутри контейнера, но браузер пользователя не может до него достучаться.

**Решение:** Используйте публичный IP или домен.

### ❌ Ошибка 2: Не открыт порт 3000
```bash
BACKEND_URL=http://123.45.67.89:3000
```
Но порт 3000 закрыт файерволом.

**Проверка:**
```bash
# На VPS:
sudo ufw status
sudo netstat -tulpn | grep 3000
```

**Решение:**
```bash
sudo ufw allow 3000/tcp
```

### ❌ Ошибка 3: CORS не настроен
Если бэкенд отвечает, но есть ошибка CORS в консоли браузера.

**Решение:** В .env добавьте:
```bash
CORS_ORIGIN=*
```
Или укажите конкретный домен Telegram Mini App.

### ❌ Ошибка 4: Не пересобрали frontend
После изменения BACKEND_URL забыли пересобрать frontend.

**Решение:** Всегда запускайте:
```bash
sudo docker-compose -f docker-compose.vps.yml build frontend
sudo docker-compose -f docker-compose.vps.yml up -d frontend
```

## Дебаг в реальном времени

### 1. Откройте Eruda Console в Telegram

### 2. Проверьте что URL правильный:
```javascript
console.log(import.meta.env.VITE_ENGINE_API_URL)
```

### 3. Попробуйте сделать запрос вручную:
```javascript
fetch('http://YOUR_BACKEND_URL/api/engine/health')
  .then(r => r.json())
  .then(console.log)
  .catch(console.error)
```

### 4. Смотрите Network вкладку в Eruda:
- Видите запрос к `/api/engine/best-move`?
- Какой status code? (200, 404, 500, CORS error?)
- Есть ли response body?

## Правильная конфигурация для вашего VPS

Судя по логам nginx, у вас домен: `asrtalink.vip`

### Рекомендуемая настройка:

1. **Используйте домен с HTTPS:**
```bash
BACKEND_URL=https://asrtalink.vip
```

2. **Настройте Nginx для проксирования API:**

Файл `/etc/nginx/conf.d/default.conf` должен содержать:
```nginx
server {
    listen 443 ssl;
    server_name asrtalink.vip;

    # SSL certificates...

    # Frontend
    location / {
        proxy_pass http://frontend:80;
    }

    # Backend API
    location /api/ {
        proxy_pass http://backend:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    # Health check
    location /health {
        proxy_pass http://backend:3000/health;
    }
}
```

3. **Пересоберите frontend:**
```bash
cd ~/chess-telegram-miniapp
sudo docker-compose -f docker-compose.vps.yml build frontend
sudo docker-compose -f docker-compose.vps.yml restart frontend nginx
```

4. **Проверьте:**
```bash
curl https://asrtalink.vip/health
curl https://asrtalink.vip/api/engine/health
```

Оба должны вернуть успешный ответ!

## Итоговая проверка

✅ `curl https://asrtalink.vip/health` возвращает JSON
✅ `curl https://asrtalink.vip/api/engine/health` возвращает JSON
✅ В Eruda Console видно правильный BACKEND_URL
✅ В Eruda Network видны успешные запросы к `/api/engine/best-move`
✅ Шахматные фигуры кликабельны и AI ходит

Если все ✅ - проблема решена! 🎉
