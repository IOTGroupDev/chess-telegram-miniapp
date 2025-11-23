# 🆓 100% БЕСПЛАТНАЯ Архитектура
## Платим ТОЛЬКО за AI API (Claude, ChatGPT, Deepseek)

---

## 💰 Стоимость

```
Frontend (Cloudflare Pages):    $0/месяц  ✅
Backend (Fly.io Free):           $0/месяц  ✅
Database (Supabase Free):        $0/месяц  ✅
Redis (Upstash Free):            $0/месяц  ✅
CDN (Cloudflare):                $0/месяц  ✅
SSL Certificates:                $0/месяц  ✅
────────────────────────────────────────────
ИТОГО:                           $0/месяц  🔥

Платим только за AI:
- Claude API (анализ):     ~$0.002 за партию
- GPT-4 (альтернатива):    ~$0.003 за партию
- Deepseek (дешево):       ~$0.0003 за партию ✅
```

### При 1000 анализов партий в месяц:
- Deepseek: $0.30/мес  ✅ (РЕКОМЕНДУЕТСЯ)
- Claude:   $2/мес
- GPT-4:    $3/мес

---

## 🏗️ Архитектура

```
         Internet
            │
      ┌─────┴──────────┐
      │                │
      ▼                ▼
┌────────────┐  ┌─────────────┐
│ Cloudflare │  │   Fly.io    │
│   Pages    │  │  Free Tier  │
│  (Frontend)│  │  (Backend)  │
│   БЕСП.    │  │   БЕСП.     │
└────────────┘  └──────┬──────┘
                       │
        ┌──────────────┼─────────────┐
        │              │             │
        ▼              ▼             ▼
┌──────────────┐ ┌──────────┐ ┌──────────┐
│  Supabase    │ │ Upstash  │ │  AI API  │
│  Free Tier   │ │  Redis   │ │  Claude  │
│ (PostgreSQL) │ │  Free    │ │  GPT-4   │
│ (Realtime)   │ │  БЕСП.   │ │ Deepseek │
│   БЕСП.      │ └──────────┘ └──────────┘
└──────────────┘                    💰
```

---

## 📋 Free Tier Лимиты

### 1. Cloudflare Pages (Frontend)
```
✅ Unlimited sites
✅ Unlimited bandwidth
✅ Unlimited requests
✅ 500 builds/month
✅ Custom domains
✅ SSL certificates
✅ CDN global
```
**Лимит:** НЕТУ! Полностью бесплатно навсегда
**Perfect для:** React/Vue/Angular apps

### 2. Fly.io (Backend)
```
✅ 3 shared-cpu-1x VMs (256MB RAM каждый)
✅ 3GB persistent storage
✅ 160GB outbound transfer
```
**Достаточно для:** 10K-50K активных пользователей
**Scaling:** До 3 инстансов бесплатно (load balancing)

### 3. Supabase Free Tier (Database + Realtime)
```
✅ 500MB database storage
✅ 50,000 monthly active users
✅ 2GB egress bandwidth
✅ 50MB file storage
✅ Real-time WebSocket ✅
✅ Row Level Security ✅
✅ Auto-generated APIs ✅
```
**Достаточно для:** ~10K пользователей, ~100K партий

**Upgrade:** Если нужно больше → $25/мес (8GB DB)

### 4. Upstash Redis (Caching)
```
✅ 10,000 commands/day
✅ 256MB storage
✅ Global latency < 50ms
```
**Достаточно для:** Кеширование позиций Stockfish
**Upgrade:** Если нужно больше → $0.20 за 100K commands

### 5. Vercel (альтернатива Cloudflare Pages)
```
✅ Unlimited sites
✅ 100GB bandwidth
✅ Serverless functions
✅ Edge network
```
**Лимит:** 100GB egress
**Perfect для:** Next.js apps

---

## 🚀 Полная Настройка (30 минут)

### Шаг 1: Supabase Setup (5 мин)

```bash
# 1. Перейти на https://supabase.com
# 2. Создать проект (бесплатно)
# 3. Применить миграции

supabase login
supabase link --project-ref YOUR_REF
supabase db push

# Готово! PostgreSQL + Realtime настроены
```

### Шаг 2: Upstash Redis (2 мин)

```bash
# 1. Перейти на https://upstash.com
# 2. Создать Redis database (бесплатно)
# 3. Скопировать URL

REDIS_URL=redis://default:***@***.upstash.io:6379
```

### Шаг 3: Backend на Fly.io (10 мин)

```bash
cd backend

# 1. Установить Fly CLI
curl -L https://fly.io/install.sh | sh

# 2. Login
fly auth login

# 3. Создать app
fly launch --name chess-backend --no-deploy

# 4. Настроить secrets
fly secrets set \
  SUPABASE_URL=https://your-project.supabase.co \
  SUPABASE_SERVICE_KEY=your-service-key \
  REDIS_URL=redis://***@***.upstash.io:6379

# 5. Deploy
fly deploy

# ✅ Backend готов!
# URL: https://chess-backend.fly.dev
```

### Шаг 4: Frontend на Cloudflare Pages (5 мин)

```bash
cd frontend

# 1. Build
npm run build

# 2. Перейти на https://pages.cloudflare.com
# 3. Connect GitHub repository
# 4. Deploy автоматически!

# ✅ Frontend готов!
# URL: https://chess-app.pages.dev
```

### Шаг 5: AI API Keys (2 мин)

```bash
# Выбрать один:

# Deepseek (САМЫЙ ДЕШЕВЫЙ) ✅
# https://platform.deepseek.com
# $0.14 per 1M input tokens

# Claude API
# https://console.anthropic.com
# $3 per 1M input tokens

# OpenAI GPT-4
# https://platform.openai.com
# $10 per 1M input tokens
```

---

## 📊 Сравнение AI Моделей для Анализа

### Задача: Анализ шахматной партии (30 ходов)

| Модель | Токенов на партию | Стоимость | Качество |
|--------|-------------------|-----------|----------|
| **Deepseek V3** | ~5K tokens | $0.0003 | ⭐⭐⭐⭐ ✅ |
| Claude Sonnet 3.5 | ~5K tokens | $0.002 | ⭐⭐⭐⭐⭐ |
| GPT-4o | ~5K tokens | $0.003 | ⭐⭐⭐⭐⭐ |
| GPT-4o-mini | ~5K tokens | $0.0001 | ⭐⭐⭐ ✅ |
| Llama 3.3 70B | ~5K tokens | $0.0004 | ⭐⭐⭐⭐ |

**Рекомендация:**
- **Для анализа:** Deepseek V3 (70B параметров, почти бесплатно)
- **Для генерации контента:** GPT-4o-mini
- **Для критических задач:** Claude Sonnet 3.5

### При 1000 анализов в месяц:

```
Deepseek V3:     $0.30/мес  ✅ ЛУЧШИЙ выбор
GPT-4o-mini:     $0.10/мес  ✅ Дешевле, но хуже качество
Claude:          $2.00/мес
GPT-4o:          $3.00/мес
```

---

## 🎮 Что Можно на Free Tier?

### Реалистичная Оценка:

| Параметр | Free Tier | Paid ($35/мес) |
|----------|-----------|----------------|
| **Пользователи** | 10K MAU | 100K MAU |
| **Партий в месяц** | 50K | 500K |
| **DB размер** | 500MB | 8GB |
| **Анализов AI** | 1K | 10K |
| **Bandwidth** | 2GB + 160GB | Unlimited |
| **Стоимость AI** | $0.30 | $3 |

### Когда Upgradeать:

```
Если:
  - База данных > 500MB  → Supabase Pro ($25)
  - Пользователи > 50K   → Supabase Pro ($25)
  - Traffic > 160GB      → Fly.io ($10)
  - Redis > 10K cmd/day  → Upstash Pro ($10)

Тогда стоимость: ~$45/мес (все равно дешевле VPS)
```

---

## 🔧 fly.toml Конфигурация

```toml
# backend/fly.toml

app = "chess-backend"
primary_region = "fra"  # Frankfurt (ближе к Европе)

[build]
  dockerfile = "Dockerfile"

[env]
  NODE_ENV = "production"
  PORT = "3000"
  STOCKFISH_PATH = "/usr/games/stockfish"

[[services]]
  internal_port = 3000
  protocol = "tcp"

  [[services.ports]]
    port = 80
    handlers = ["http"]

  [[services.ports]]
    port = 443
    handlers = ["tls", "http"]

[http_service]
  internal_port = 3000
  force_https = true
  auto_stop_machines = true
  auto_start_machines = true
  min_machines_running = 0  # Автоматический sleep если нет трафика

[[services.tcp_checks]]
  interval = "15s"
  timeout = "2s"
  grace_period = "10s"

# Scaling
[services.concurrency]
  type = "connections"
  hard_limit = 25
  soft_limit = 20

# Metrics
[metrics]
  port = 9091
  path = "/metrics"
```

---

## 📈 Автоматический Scaling на Free Tier

### Fly.io Auto-scaling:

```toml
[services.concurrency]
  type = "requests"
  hard_limit = 250
  soft_limit = 200

# Fly автоматически создаст 2-3 инстанса при нагрузке
# Все бесплатно (до 3 shared-cpu VMs)
```

### Результат:
- **0 пользователей**: 0 машин работают (экономия)
- **1-100 пользователей**: 1 машина
- **100-500 пользователей**: 2 машины
- **500-1000 пользователей**: 3 машины

**Все бесплатно!** 🔥

---

## 🎯 Дополнительные Бесплатные Сервисы

### Monitoring:
- **Better Uptime** - бесплатный uptime monitoring
- **Sentry Free** - 5K errors/month
- **Fly.io Metrics** - встроенные метрики

### Analytics:
- **Plausible Free** (self-hosted)
- **Umami Free** (privacy-focused)

### CDN:
- **Cloudflare CDN** - бесплатно
- **BunnyCDN Free Tier** - 1GB/мес

### Email (для уведомлений):
- **Resend Free** - 100 emails/day
- **Mailgun Free** - 5K emails/month

---

## ✅ Финальная Стоимость

### Минимальная (0-10K пользователей):
```
Infrastructure:        $0/месяц  ✅
AI API (Deepseek):     $0.30/месяц
───────────────────────────────
ИТОГО:                 $0.30/месяц  🔥
```

### Средняя (10K-50K пользователей):
```
Infrastructure:        $0/месяц  ✅
AI API (Deepseek):     $3/месяц
───────────────────────────────
ИТОГО:                 $3/месяц  ✅
```

### Большая (50K-100K пользователей):
```
Supabase Pro:          $25/месяц
Fly.io:                $10/месяц
Upstash:               $10/месяц
AI API (Deepseek):     $10/месяц
───────────────────────────────
ИТОГО:                 $55/месяц
```

**Экономия vs Managed сервисы: 90%+**

---

## 🚀 Следующие Шаги

1. ✅ Настроить Supabase Free (5 мин)
2. ✅ Настроить Upstash Redis (2 мин)
3. ✅ Deploy на Fly.io (10 мин)
4. ✅ Deploy на Cloudflare Pages (5 мин)
5. ✅ Получить Deepseek API key (2 мин)
6. 🎮 Запуск!

**Total time:** 25 минут
**Total cost:** $0/месяц + AI API

Начать setup? 🚀
