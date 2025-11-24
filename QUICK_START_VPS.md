# ⚡ Quick Start - Деплой за 10 минут

Быстрая инструкция для опытных пользователей. Полная документация: [VPS_SETUP.md](./VPS_SETUP.md)

## 🎯 Необходимо:
- VPS с Ubuntu 22.04+ (1GB+ RAM)
- Доменное имя (опционально)
- Аккаунт Supabase (бесплатный)

---

## 🚀 Установка на VPS

### 1. Подключитесь к VPS и установите ПО
```bash
ssh root@YOUR_VPS_IP

# Обновление системы
apt update && apt upgrade -y

# Установка Git, Docker, UFW
apt install git ufw curl -y

# Установка Docker
curl -fsSL https://get.docker.com | sh
usermod -aG docker $USER

# Настройка firewall
ufw allow ssh
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable
```

### 2. Клонируйте проект
```bash
git clone https://github.com/IOTGroupDev/chess-telegram-miniapp.git
cd chess-telegram-miniapp
```

### 3. Настройте Supabase
1. Создайте проект на https://supabase.com (FREE)
2. SQL Editor → выполните `supabase/FULL_MIGRATION.sql`
3. Settings > API → скопируйте URL и ключи

### 4. Настройте переменные окружения
```bash
cp .env.vps.example .env
nano .env
```

**Обязательно заполните:**
```env
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_KEY=eyJ...
BACKEND_URL=https://yourdomain.com  # или http://YOUR_IP:3000
DOMAIN=yourdomain.com
EMAIL=your@email.com
```

### 5. Запустите Docker
```bash
docker compose -f docker-compose.vps.yml up -d
```

### 6. Настройте SSL (если есть домен)
```bash
# Убедитесь что DNS настроен (A-запись на ваш IP)
./scripts/init-letsencrypt.sh yourdomain.com your@email.com

# Пересоберите контейнеры
docker compose -f docker-compose.vps.yml up -d --build
```

### 7. Настройте Telegram Bot
1. @BotFather → `/newbot` → следуйте инструкциям
2. @BotFather → `/newapp` → Web App URL: `https://yourdomain.com`
3. @BotFather → `/setmenubutton` → кнопка "Играть ♟️"

---

## 🤖 GitHub Actions (автодеплой)

### 1. Создайте SSH ключ
```bash
# На вашем компьютере:
ssh-keygen -t ed25519 -f ~/.ssh/github_actions_key

# Скопируйте публичный ключ на VPS:
ssh-copy-id -i ~/.ssh/github_actions_key.pub root@YOUR_VPS_IP

# Скопируйте приватный ключ для GitHub:
cat ~/.ssh/github_actions_key
```

### 2. Добавьте GitHub Secrets
Repository → Settings → Secrets and variables → Actions → New secret

```
VPS_HOST           = YOUR_VPS_IP
VPS_USER           = root
VPS_SSH_KEY        = (приватный ключ из предыдущего шага)
VPS_PORT           = 22

SUPABASE_URL              = https://xxx.supabase.co
SUPABASE_ANON_KEY         = eyJ...
SUPABASE_SERVICE_KEY      = eyJ...

BACKEND_URL               = https://yourdomain.com
DOMAIN                    = yourdomain.com
EMAIL                     = your@email.com

AI_API_KEY                = sk-... (опционально)
```

### 3. Готово!
Теперь при каждом push в `main` приложение автоматически обновится на VPS.

---

## 📊 Проверка

```bash
# Статус контейнеров
docker compose -f docker-compose.vps.yml ps

# Логи
docker compose -f docker-compose.vps.yml logs -f

# Здоровье backend
curl http://localhost:3000/health

# Использование ресурсов
docker stats
```

**Ожидаемый вывод:**
```
NAME              STATUS    PORTS
chess-backend     Up        0.0.0.0:3000->3000/tcp
chess-frontend    Up        80/tcp
chess-redis       Up        6379/tcp
chess-nginx       Up        0.0.0.0:80->80/tcp, 0.0.0.0:443->443/tcp
chess-certbot     Up
```

---

## 🔧 Управление

```bash
# Остановить
docker compose -f docker-compose.vps.yml down

# Перезапустить
docker compose -f docker-compose.vps.yml restart

# Обновить после git pull
docker compose -f docker-compose.vps.yml up -d --build

# Просмотр логов
docker compose -f docker-compose.vps.yml logs -f backend
docker compose -f docker-compose.vps.yml logs -f frontend
```

---

## 🆘 Проблемы?

### Backend не работает
```bash
docker compose -f docker-compose.vps.yml logs backend
# Проверьте SUPABASE_URL и SUPABASE_SERVICE_KEY в .env
```

### Frontend не открывается
```bash
docker compose -f docker-compose.vps.yml logs nginx
# Проверьте открыты ли порты: ufw status
```

### SSL не работает
```bash
# Проверьте DNS
nslookup yourdomain.com

# Повторите настройку SSL
./scripts/init-letsencrypt.sh yourdomain.com
```

### Нехватка памяти
```bash
# Добавьте swap
fallocate -l 2G /swapfile
chmod 600 /swapfile
mkswap /swapfile
swapon /swapfile
echo '/swapfile none swap sw 0 0' >> /etc/fstab
```

---

## 📚 Дополнительная документация

- **Полная инструкция**: [VPS_SETUP.md](./VPS_SETUP.md)
- **Деплой гайд**: [DEPLOYMENT.md](./DEPLOYMENT.md)
- **Docker конфигурация**: [docker-compose.vps.yml](./docker-compose.vps.yml)
- **Environment variables**: [.env.vps.example](./.env.vps.example)

---

## ✅ Готово!

Ваше приложение доступно по адресу:
- **С доменом**: https://yourdomain.com
- **Без домена**: http://YOUR_VPS_IP

Telegram Bot → откройте в Telegram и начните играть! ♟️
