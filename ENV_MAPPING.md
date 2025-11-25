# Environment Variables Mapping for VPS Deployment

## 📋 Корневой `.env` файл → Распределение по контейнерам

Один файл `.env` в корне проекта используется для всех сервисов через Docker Compose.

---

## 🗺️ Как переменные попадают в контейнеры

### 1️⃣ **Backend Container**

Из `.env` читаются напрямую через `environment:` в docker-compose.vps.yml:

```yaml
backend:
  environment:
    # Из корневого .env
    SUPABASE_URL: ${SUPABASE_URL}              # → backend внутри контейнера
    SUPABASE_SERVICE_KEY: ${SUPABASE_SERVICE_KEY}
    STOCKFISH_THREADS: ${STOCKFISH_THREADS:-1}
    AI_API_KEY: ${AI_API_KEY}
    CORS_ORIGIN: ${CORS_ORIGIN:-*}

    # Хардкод значения (не из .env)
    NODE_ENV: production
    PORT: 3000
    REDIS_HOST: redis                          # Имя сервиса в Docker сети
    REDIS_PORT: 6379
    STOCKFISH_PATH: /usr/games/stockfish
```

**Что попадает в backend:**
- ✅ Supabase credentials для чтения данных игр
- ✅ AI API key для анализа позиций
- ✅ CORS настройки
- ✅ Redis для кеширования
- ✅ Stockfish конфигурация

---

### 2️⃣ **Frontend Container**

Переменные передаются через `build.args` (только на этапе сборки!):

```yaml
frontend:
  build:
    args:
      # Из корневого .env → встраиваются в JS bundle
      VITE_SUPABASE_URL: ${SUPABASE_URL}
      VITE_SUPABASE_ANON_KEY: ${SUPABASE_ANON_KEY}
      VITE_ENGINE_API_URL: ${BACKEND_URL}
```

**⚠️ ВАЖНО:**
- Frontend переменные встраиваются в код при сборке
- После сборки изменить их нельзя
- Нужен пересборка при изменении: `docker-compose build frontend`

**Что попадает в frontend:**
- ✅ Supabase URL и anon key (публичные ключи)
- ✅ Backend API URL для вызова Stockfish

---

### 3️⃣ **Redis Container**

Не использует переменные из `.env`, работает с дефолтными настройками:

```yaml
redis:
  image: redis:7-alpine
  command: >
    redis-server
    --maxmemory 512mb
    --maxmemory-policy allkeys-lru
```

---

### 4️⃣ **Nginx Container**

Не использует переменные из `.env` напрямую, но зависит от:
- `DOMAIN` (для SSL сертификатов)
- Конфигурационные файлы в `./nginx/conf.d/`

---

## 📝 Минимальный `.env` для работы на VPS

```bash
# ===================================
# Обязательные переменные
# ===================================

# Supabase (FREE tier)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=eyJhbGci...   # Public key
SUPABASE_SERVICE_KEY=eyJhbGci... # Secret key

# Backend URL (для frontend)
BACKEND_URL=http://YOUR_VPS_IP:3000
# или с доменом:
# BACKEND_URL=https://api.yourdomain.com

# ===================================
# Опциональные (есть дефолты)
# ===================================

# Stockfish (по умолчанию: 1 thread, 128MB hash)
STOCKFISH_THREADS=2
STOCKFISH_HASH_SIZE=512

# CORS (по умолчанию: *)
CORS_ORIGIN=*

# AI API (опционально, для анализа)
AI_PROVIDER=deepseek
AI_API_KEY=sk-...
```

---

## 🔍 Проверка текущих переменных

### На VPS:

```bash
# 1. Проверить что .env существует
ls -la /path/to/project/.env

# 2. Посмотреть содержимое (без секретов)
grep -v "KEY\|PASSWORD" .env

# 3. Проверить какие переменные использует backend контейнер
docker exec chess-backend env | grep -E "SUPABASE|STOCKFISH|AI"

# 4. Проверить что frontend собрался с правильными переменными
docker exec chess-frontend cat /usr/share/nginx/html/index.html | grep -o "VITE_[^\"]*"
```

---

## 🔄 Как обновить переменные на работающем VPS

### Изменение backend переменных:

```bash
# 1. Отредактировать .env
nano .env

# 2. Пересоздать backend контейнер (без пересборки)
docker-compose -f docker-compose.vps.yml up -d backend

# Переменные применятся сразу
```

### Изменение frontend переменных:

```bash
# 1. Отредактировать .env
nano .env

# 2. ПЕРЕСОБРАТЬ frontend (важно!)
docker-compose -f docker-compose.vps.yml build frontend

# 3. Пересоздать контейнер
docker-compose -f docker-compose.vps.yml up -d frontend
```

---

## 🚫 Что НЕ нужно в корневом `.env`

Эти переменные только для локальной разработки (`frontend/.env` и `backend/.env`):

```bash
# ❌ НЕ нужны в корневом .env для Docker
PORT=3000                    # Хардкод в docker-compose
NODE_ENV=development         # Хардкод в docker-compose
FRONTEND_URL=...             # Заменён на CORS_ORIGIN
REDIS_HOST=localhost         # В Docker: redis (имя сервиса)
STOCKFISH_PATH=/usr/bin/...  # В Docker: /usr/games/stockfish
```

---

## 🎯 Схема потока данных

```
┌─────────────────────────────────────────────────┐
│  Корневой .env файл                            │
│  ├─ SUPABASE_URL                               │
│  ├─ SUPABASE_ANON_KEY                          │
│  ├─ SUPABASE_SERVICE_KEY                       │
│  ├─ BACKEND_URL                                │
│  ├─ AI_API_KEY                                 │
│  └─ ...                                        │
└─────────────┬───────────────────────────────────┘
              │
              │ docker-compose.vps.yml читает
              │
      ┌───────┴────────┐
      │                │
      ▼                ▼
┌─────────────┐  ┌──────────────────┐
│  Backend    │  │  Frontend        │
│  Container  │  │  Container       │
│             │  │  (build args)    │
│ Runtime env │  │  Embedded in JS  │
│ можно       │  │  нужна пересборка│
│ изменить    │  │  при изменении   │
└─────────────┘  └──────────────────┘
      │                  │
      ├─ Supabase       ├─ Supabase
      ├─ Redis          ├─ Backend API
      ├─ Stockfish      └─ No secrets!
      └─ AI API
```

---

## ✅ Best Practices

1. **Один .env в корне** - для всех Docker сервисов
2. **Разные .env в subdirs** - только для локальной разработки без Docker
3. **Не коммитить .env** - только `.env.example` в git
4. **Frontend пересборка** - после изменения VITE_ переменных
5. **Секреты в backend** - service_role key только в backend
6. **Публичные ключи во frontend** - только anon key
7. **CORS настройка** - укажите конкретные домены в продакшене

---

## 🔐 Безопасность

### ✅ В frontend можно (публичные данные):
```bash
VITE_SUPABASE_URL=https://...
VITE_SUPABASE_ANON_KEY=eyJ...  # Public key, безопасно
VITE_ENGINE_API_URL=https://...
```

### ❌ В frontend НЕЛЬЗЯ (секреты):
```bash
VITE_SUPABASE_SERVICE_KEY=...  # ❌ НИКОГДА!
VITE_AI_API_KEY=...            # ❌ НИКОГДА!
VITE_REDIS_PASSWORD=...        # ❌ НИКОГДА!
```

Секреты остаются только в backend контейнере!

---

## 📞 Troubleshooting

### Проблема: "Frontend не видит backend"

**Проверка:**
```bash
# Проверить BACKEND_URL в собранном frontend
docker exec chess-frontend grep -r "VITE_ENGINE_API_URL" /usr/share/nginx/html/
```

**Решение:**
```bash
# 1. Убедиться что BACKEND_URL правильный в .env
# 2. Пересобрать frontend
docker-compose -f docker-compose.vps.yml build frontend
docker-compose -f docker-compose.vps.yml up -d frontend
```

---

### Проблема: "Backend не подключается к Supabase"

**Проверка:**
```bash
docker exec chess-backend env | grep SUPABASE
```

**Решение:**
```bash
# Пересоздать backend с новыми переменными
docker-compose -f docker-compose.vps.yml up -d backend
```

---

**Last Updated:** November 25, 2025
