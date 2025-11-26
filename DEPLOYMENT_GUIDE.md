# 🚀 Deployment Guide - Betting System

Пошаговое руководство по развертыванию системы ставок в production.

---

## 📋 Pre-Deployment Checklist

### 1. Environment Setup

#### Backend Environment Variables (.env.production)
```bash
# Node
NODE_ENV=production
PORT=3000

# Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your-service-role-key
SUPABASE_ANON_KEY=your-anon-key

# JWT
JWT_SECRET=your-super-secret-jwt-key-min-32-chars

# Telegram Bot (если используете Stars)
TELEGRAM_BOT_TOKEN=your-bot-token
TELEGRAM_WEBHOOK_URL=https://your-domain.com/api/telegram/webhook

# CORS
CORS_ORIGIN=https://your-frontend-domain.com

# Rate Limiting
RATE_LIMIT_TTL=60
RATE_LIMIT_MAX=100
```

#### Frontend Environment Variables (.env.production)
```bash
VITE_API_URL=https://your-api-domain.com/api
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_TELEGRAM_BOT_USERNAME=YourChessBotName
```

### 2. Security Review

- [ ] **Secrets не в коде** - все ключи в environment variables
- [ ] **CORS настроен** - только доверенные origins
- [ ] **Rate limiting** включен на всех endpoints
- [ ] **JWT expiration** настроен (например, 24 часа)
- [ ] **RLS policies** включены на всех таблицах
- [ ] **SQL Injection** - используем parameterized queries
- [ ] **XSS Protection** - sanitize user inputs

---

## 🗄️ Database Deployment

### Шаг 1: Backup Production Database

```bash
# Через Supabase Dashboard
# Settings → Database → Backups → Create Backup

# Или через CLI
supabase db dump -f backup_$(date +%Y%m%d).sql
```

### Шаг 2: Apply Migrations

```bash
# Подключиться к production Supabase
supabase link --project-ref your-project-ref

# Применить миграции (в порядке)
supabase db push

# Или вручную через SQL Editor:
```

#### Migration 1: Betting System Tables
```bash
# Открыть Supabase Dashboard → SQL Editor
# Скопировать содержимое:
cat supabase/migrations/20250123000004_betting_system.sql

# Выполнить в SQL Editor
```

**Проверка:**
```sql
-- Проверить что таблицы созданы
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('user_wallets', 'game_bets', 'wallet_transactions');

-- Expected: 3 rows

-- Проверить функции
SELECT routine_name
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name IN (
    'deposit_game_bet',
    'calculate_bet_payout',
    'process_bet_payout',
    'refund_game_bet',
    'has_sufficient_balance'
  );

-- Expected: 5 rows
```

#### Migration 2: RLS Policies
```bash
cat supabase/migrations/20250123000005_betting_rls_policies.sql
# Выполнить в SQL Editor
```

**Проверка:**
```sql
-- Проверить RLS policies
SELECT tablename, policyname, permissive, roles, cmd
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('user_wallets', 'game_bets', 'wallet_transactions');

-- Expected: ~9-12 policies
```

### Шаг 3: Seed Initial Data (optional)

```sql
-- Создать тестовые кошельки для первых пользователей (optional)
-- Кошельки создаются автоматически через trigger при регистрации

-- Можно дать стартовые бонусы
UPDATE user_wallets
SET balance_coins = 1000
WHERE created_at > NOW() - INTERVAL '1 hour';  -- Новым пользователям
```

### Шаг 4: Enable Real-time

```bash
# Supabase Dashboard → Database → Replication
# Включить replication для таблиц:
# - user_wallets
# - game_bets
# - wallet_transactions
# - games
```

**Или через SQL:**
```sql
-- Enable realtime for tables
ALTER PUBLICATION supabase_realtime ADD TABLE user_wallets;
ALTER PUBLICATION supabase_realtime ADD TABLE game_bets;
ALTER PUBLICATION supabase_realtime ADD TABLE wallet_transactions;
```

---

## 🖥️ Backend Deployment

### Option 1: Deploy to Railway

```bash
# Install Railway CLI
npm install -g @railway/cli

# Login
railway login

# Create new project
railway init

# Add environment variables
railway variables set SUPABASE_URL=https://...
railway variables set SUPABASE_SERVICE_KEY=...
railway variables set JWT_SECRET=...

# Deploy
cd backend
railway up
```

### Option 2: Deploy to Render

```bash
# render.yaml
services:
  - type: web
    name: chess-backend
    env: node
    buildCommand: npm install && npm run build
    startCommand: npm run start:prod
    envVars:
      - key: NODE_ENV
        value: production
      - key: SUPABASE_URL
        sync: false
      - key: SUPABASE_SERVICE_KEY
        sync: false
```

### Option 3: Deploy to VPS (Ubuntu)

```bash
# 1. Setup Node.js
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# 2. Clone repo
git clone https://github.com/your-repo/chess-app.git
cd chess-app/backend

# 3. Install dependencies
npm ci --production

# 4. Build
npm run build

# 5. Setup PM2
npm install -g pm2
pm2 start dist/main.js --name chess-backend

# 6. Setup Nginx reverse proxy
sudo apt install nginx

# /etc/nginx/sites-available/chess-api
server {
    listen 80;
    server_name api.your-domain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}

# 7. Enable site
sudo ln -s /etc/nginx/sites-available/chess-api /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx

# 8. Setup SSL (Let's Encrypt)
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d api.your-domain.com
```

### Health Check Endpoint

Добавить в backend:
```typescript
// backend/src/app.controller.ts
@Get('health')
healthCheck() {
  return {
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  };
}
```

**Проверка:**
```bash
curl https://api.your-domain.com/api/health
# Expected: {"status":"ok","timestamp":"...","uptime":123}
```

---

## 🌐 Frontend Deployment

### Option 1: Vercel (Recommended for Next.js/React)

```bash
# Install Vercel CLI
npm install -g vercel

# Deploy
cd frontend
vercel --prod

# Set environment variables in Vercel Dashboard
# Settings → Environment Variables
```

### Option 2: Netlify

```bash
# netlify.toml
[build]
  command = "npm run build"
  publish = "dist"

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200

[build.environment]
  VITE_API_URL = "https://api.your-domain.com/api"
```

```bash
# Deploy
npm install -g netlify-cli
cd frontend
netlify deploy --prod
```

### Option 3: Cloudflare Pages

```bash
# 1. Build locally
npm run build

# 2. Install Wrangler
npm install -g wrangler

# 3. Deploy
wrangler pages publish dist --project-name=chess-app
```

---

## 🤖 Telegram Bot Setup (для Stars payments)

### Шаг 1: Create Bot

```bash
# 1. Открыть @BotFather в Telegram
# 2. Отправить /newbot
# 3. Следовать инструкциям
# 4. Получить Bot Token
```

### Шаг 2: Enable Payments

```bash
# 1. @BotFather → /mybots
# 2. Выбрать бота
# 3. Bot Settings → Payments
# 4. Выбрать "Telegram Stars" как payment provider
# 5. Получить подтверждение
```

### Шаг 3: Setup Webhook

```typescript
// backend/src/telegram/telegram.service.ts
async setupWebhook() {
  const webhookUrl = `${process.env.TELEGRAM_WEBHOOK_URL}`;

  await this.bot.telegram.setWebhook(webhookUrl, {
    allowed_updates: ['message', 'pre_checkout_query', 'successful_payment'],
  });

  console.log(`Webhook set to: ${webhookUrl}`);
}
```

**Проверка:**
```bash
curl https://api.telegram.org/bot<BOT_TOKEN>/getWebhookInfo
```

### Шаг 4: Handle Webhook Events

```typescript
// backend/src/telegram/telegram.controller.ts
@Post('webhook')
async handleWebhook(@Body() update: any) {
  // Pre-checkout query
  if (update.pre_checkout_query) {
    const result = await this.paymentService.validatePreCheckout(
      update.pre_checkout_query
    );

    await this.bot.answerPreCheckoutQuery(
      update.pre_checkout_query.id,
      result.ok,
      result.error_message
    );
  }

  // Successful payment
  if (update.message?.successful_payment) {
    const userId = update.message.from.id;
    await this.paymentService.processSuccessfulPayment(
      userId,
      update.message.successful_payment
    );
  }

  return { ok: true };
}
```

---

## 📊 Monitoring & Analytics

### 1. Application Monitoring

#### Setup Sentry (Error Tracking)
```bash
npm install @sentry/node @sentry/nestjs

# backend/src/main.ts
import * as Sentry from '@sentry/nestjs';

Sentry.init({
  dsn: 'your-sentry-dsn',
  environment: 'production',
});
```

#### Setup LogRocket (Session Replay)
```bash
npm install logrocket

# frontend/src/main.tsx
import LogRocket from 'logrocket';

LogRocket.init('your-app-id');
```

### 2. Database Monitoring

```sql
-- Create monitoring views
CREATE VIEW active_bets_summary AS
SELECT
  COUNT(*) FILTER (WHERE status = 'pending') as pending_bets,
  COUNT(*) FILTER (WHERE status = 'locked') as active_bets,
  SUM(total_pot) FILTER (WHERE status = 'locked') as locked_funds,
  COUNT(*) FILTER (WHERE status = 'completed') as completed_today
FROM game_bets
WHERE created_at > CURRENT_DATE;

-- Query every 5 minutes
SELECT * FROM active_bets_summary;
```

### 3. Performance Metrics

```typescript
// backend/src/interceptors/logging.interceptor.ts
@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const start = Date.now();
    const req = context.switchToHttp().getRequest();

    return next.handle().pipe(
      tap(() => {
        const duration = Date.now() - start;
        console.log(`${req.method} ${req.url} - ${duration}ms`);
      })
    );
  }
}
```

### 4. Business Metrics Dashboard

```sql
-- Daily betting statistics
CREATE VIEW daily_betting_stats AS
SELECT
  DATE(created_at) as date,
  bet_type,
  COUNT(*) as total_bets,
  SUM(bet_amount * 2) as total_volume,
  SUM(bet_amount * 2 * platform_fee_percentage / 100) as platform_revenue,
  AVG(bet_amount) as avg_bet_amount
FROM game_bets
WHERE status = 'completed'
GROUP BY DATE(created_at), bet_type
ORDER BY date DESC;
```

---

## 🔄 Post-Deployment Verification

### 1. Smoke Tests

```bash
# Health check
curl https://api.your-domain.com/api/health

# Wallet endpoint
curl -H "Authorization: Bearer TOKEN" \
     https://api.your-domain.com/api/wallet

# Game bets endpoint
curl https://api.your-domain.com/api/payment/packages
```

### 2. Create Test Bet

1. Зарегистрировать 2 тестовых аккаунта
2. Добавить тестовые средства:
   ```sql
   UPDATE user_wallets
   SET balance_coins = 1000
   WHERE user_id IN ('test1', 'test2');
   ```
3. Создать игру → выбрать Coins → 100 coins
4. Принять ставку
5. Внести депозиты
6. Сыграть партию
7. Проверить выплату

### 3. Monitor Logs

```bash
# Backend logs
tail -f /var/log/pm2/chess-backend-error.log
tail -f /var/log/pm2/chess-backend-out.log

# Nginx logs
tail -f /var/log/nginx/access.log | grep POST
```

### 4. Database Verification

```sql
-- Check active connections
SELECT count(*) FROM pg_stat_activity;

-- Check table sizes
SELECT
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

-- Check slow queries
SELECT query, calls, total_time, mean_time
FROM pg_stat_statements
ORDER BY mean_time DESC
LIMIT 10;
```

---

## 🔐 Security Hardening

### 1. Database Security

```sql
-- Revoke public access
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM PUBLIC;

-- Only authenticated users can access
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;

-- Service role for backend
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
```

### 2. API Rate Limiting

```typescript
// backend/src/main.ts
import { ThrottlerModule } from '@nestjs/throttler';

@Module({
  imports: [
    ThrottlerModule.forRoot({
      ttl: 60,
      limit: 100, // 100 requests per minute
    }),
  ],
})
```

### 3. Input Validation

```typescript
// backend/src/game-bets/dto/create-bet.dto.ts
import { IsNumber, IsEnum, Min, Max } from 'class-validator';

export class CreateBetDto {
  @IsEnum(['free', 'coins', 'stars'])
  bet_type: BetType;

  @IsNumber()
  @Min(1)
  @Max(10000)
  bet_amount: number;
}
```

### 4. HTTPS Only

```nginx
# Redirect HTTP to HTTPS
server {
    listen 80;
    server_name api.your-domain.com;
    return 301 https://$server_name$request_uri;
}
```

---

## 📈 Scaling Considerations

### When to Scale

**Database:**
- Connection pool > 80% capacity
- Query latency > 100ms p95
- CPU usage > 70%

**Backend:**
- Response time > 500ms p95
- CPU usage > 80%
- Memory usage > 85%

**Frontend:**
- Load time > 3s
- Bundle size > 2MB

### Scaling Strategies

#### Database (Supabase)
1. Upgrade plan (more connections, compute)
2. Enable connection pooling (PgBouncer)
3. Add read replicas
4. Optimize queries (indexes, caching)

#### Backend
1. Horizontal scaling (multiple instances)
2. Load balancer (Nginx/HAProxy)
3. Redis caching
4. CDN for static assets

#### Frontend
1. Code splitting
2. Lazy loading
3. Service worker caching
4. CDN (Cloudflare)

---

## 🆘 Rollback Plan

### If deployment fails:

#### 1. Database Rollback
```bash
# Restore from backup
supabase db reset --linked

# Or restore specific backup
psql -h db.xxx.supabase.co -U postgres -d postgres < backup_20250126.sql
```

#### 2. Backend Rollback
```bash
# Revert to previous version
git revert HEAD
git push

# Railway/Render will auto-deploy previous version

# Or manual rollback
pm2 restart chess-backend --update-env
```

#### 3. Frontend Rollback
```bash
# Vercel
vercel rollback

# Netlify
netlify rollback

# Manual
git checkout previous-commit
npm run build
vercel --prod
```

---

## ✅ Launch Checklist

### Pre-Launch (T-24h)
- [ ] All tests passing
- [ ] Security audit completed
- [ ] Performance testing done
- [ ] Monitoring configured
- [ ] Backups scheduled
- [ ] Team notified

### Launch (T-0)
- [ ] Database migrations applied
- [ ] Backend deployed
- [ ] Frontend deployed
- [ ] Telegram bot configured
- [ ] DNS records updated
- [ ] SSL certificates valid

### Post-Launch (T+1h)
- [ ] Health checks passing
- [ ] No errors in logs
- [ ] Real-time working
- [ ] Test transaction successful
- [ ] Monitoring active
- [ ] Team on standby

### Post-Launch (T+24h)
- [ ] Review metrics
- [ ] Check error rates
- [ ] Verify payments
- [ ] User feedback
- [ ] Performance acceptable

---

## 📞 Emergency Contacts

**Database Issues:**
- Supabase Support: support@supabase.io
- Status Page: status.supabase.com

**Hosting Issues:**
- Railway Support: help@railway.app
- Vercel Support: support@vercel.com

**Telegram Bot Issues:**
- @BotSupport

---

## 📚 Resources

- [Supabase Docs](https://supabase.com/docs)
- [NestJS Deployment](https://docs.nestjs.com/deployment)
- [Telegram Bot API](https://core.telegram.org/bots/api)
- [PostgreSQL Performance](https://www.postgresql.org/docs/current/performance-tips.html)

---

**Версия:** 1.0
**Дата:** 2025-01-26
**Автор:** Claude Code (Sonnet 4.5)
