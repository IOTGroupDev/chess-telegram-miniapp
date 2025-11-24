# 🚀 Настройка VPS с нуля для Chess App

## 📋 Минимальные требования VPS

- **RAM**: 1GB+ (рекомендуется 2GB)
- **CPU**: 1 vCPU (рекомендуется 2 vCPU)
- **Диск**: 10GB+ свободного места
- **OS**: Ubuntu 22.04 LTS / Debian 11+ / CentOS 8+

---

## 1️⃣ Первичная настройка VPS

### Подключение к VPS
```bash
ssh root@YOUR_VPS_IP
```

### Обновление системы
```bash
# Ubuntu/Debian
apt update && apt upgrade -y

# CentOS/RHEL
yum update -y
```

### Создание пользователя (опционально, но рекомендуется)
```bash
# Создаем нового пользователя
adduser chess
usermod -aG sudo chess  # Ubuntu/Debian
usermod -aG wheel chess # CentOS

# Копируем SSH ключи
rsync --archive --chown=chess:chess ~/.ssh /home/chess

# Переключаемся на нового пользователя
su - chess
```

---

## 2️⃣ Установка необходимого ПО

### Git
```bash
# Ubuntu/Debian
sudo apt install git -y

# CentOS/RHEL
sudo yum install git -y

# Проверка
git --version
```

### Docker
```bash
# Ubuntu/Debian - официальный метод
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Добавляем текущего пользователя в группу docker (чтобы не использовать sudo)
sudo usermod -aG docker $USER

# Применяем изменения группы
newgrp docker

# Проверка
docker --version
docker ps
```

### Docker Compose
```bash
# Docker Compose уже включен в современные версии Docker
# Проверка:
docker compose version

# Если нет, установите вручную:
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose
```

### Настройка firewall (UFW)
```bash
# Ubuntu/Debian
sudo apt install ufw -y

# Разрешаем SSH (ВАЖНО! Сделайте ДО включения firewall)
sudo ufw allow ssh
sudo ufw allow 22/tcp

# Разрешаем HTTP и HTTPS
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# Включаем firewall
sudo ufw enable

# Проверка статуса
sudo ufw status
```

---

## 3️⃣ Клонирование проекта

```bash
# Переходим в домашнюю директорию
cd ~

# Клонируем репозиторий
git clone https://github.com/IOTGroupDev/chess-telegram-miniapp.git
cd chess-telegram-miniapp

# Переключаемся на нужную ветку (опционально)
git checkout main
```

---

## 4️⃣ Настройка переменных окружения

```bash
# Копируем шаблон
cp .env.vps.example .env

# Редактируем .env файл
nano .env
```

### Обязательные переменные:
```env
# Supabase (получите на https://supabase.com)
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_KEY=eyJ...

# Backend URL
BACKEND_URL=https://yourdomain.com
# или для теста без домена:
# BACKEND_URL=http://YOUR_VPS_IP:3000

# Домен для SSL (если есть)
DOMAIN=yourdomain.com
EMAIL=your-email@example.com

# CORS (укажите ваш домен)
CORS_ORIGIN=https://yourdomain.com

# AI API (опционально)
AI_PROVIDER=deepseek
AI_API_KEY=sk-...
```

**Сохраните**: `Ctrl+O`, `Enter`, `Ctrl+X`

---

## 5️⃣ Настройка Supabase

### Создание проекта
1. Перейдите на https://supabase.com
2. Создайте новый проект (FREE tier)
3. Дождитесь завершения настройки (~2 минуты)

### Получение учетных данных
```
Settings > API > Project URL          → SUPABASE_URL
Settings > API > anon/public key      → SUPABASE_ANON_KEY
Settings > API > service_role key     → SUPABASE_SERVICE_KEY
```

### Применение миграции
1. Откройте SQL Editor в Supabase Dashboard
2. Скопируйте содержимое `supabase/FULL_MIGRATION.sql`
3. Вставьте и выполните (RUN)

---

## 6️⃣ Запуск Docker контейнеров

### Без домена (тестовый запуск)
```bash
# Сборка и запуск
docker compose -f docker-compose.vps.yml up -d

# Проверка статуса
docker compose -f docker-compose.vps.yml ps

# Просмотр логов
docker compose -f docker-compose.vps.yml logs -f

# Проверка работы backend
curl http://localhost:3000/health
```

### С доменом (production)

#### 1. Настройте DNS
Добавьте A-записи для вашего домена:
```
A    @           YOUR_VPS_IP
A    www         YOUR_VPS_IP
```

#### 2. Настройте SSL
```bash
# Запустите скрипт настройки SSL
./scripts/init-letsencrypt.sh yourdomain.com your-email@example.com

# Скрипт автоматически:
# - Создаст nginx конфигурацию
# - Получит SSL сертификат от Let's Encrypt
# - Настроит автоматическое обновление
```

#### 3. Обновите .env и пересоберите
```bash
nano .env
# Обновите BACKEND_URL и DOMAIN

# Пересоберите контейнеры
docker compose -f docker-compose.vps.yml up -d --build
```

---

## 7️⃣ Настройка Telegram Bot

```bash
# 1. Создайте бота через @BotFather в Telegram
#    Отправьте: /newbot
#    Следуйте инструкциям

# 2. Создайте Mini App
#    Отправьте: /newapp
#    Выберите вашего бота
#    Web App URL: https://yourdomain.com
#    (или http://YOUR_VPS_IP если без домена)

# 3. Настройте menu button
#    Отправьте: /setmenubutton
#    Выберите бота
#    Button text: Играть ♟️
#    Web App URL: https://yourdomain.com
```

---

## 8️⃣ Проверка работы

```bash
# Статус всех контейнеров
docker compose -f docker-compose.vps.yml ps

# Мониторинг ресурсов
docker stats

# Логи backend
docker compose -f docker-compose.vps.yml logs -f backend

# Логи frontend
docker compose -f docker-compose.vps.yml logs -f frontend

# Логи nginx
docker compose -f docker-compose.vps.yml logs -f nginx

# Проверка SSL (если настроен)
curl https://yourdomain.com
```

### Ожидаемый результат:
```
✅ Backend:   http://YOUR_IP:3000/health → OK
✅ Frontend:  http://YOUR_IP → Отображается интерфейс
✅ Nginx:     https://yourdomain.com → SSL работает
✅ Redis:     Контейнер работает
```

---

## 9️⃣ Управление контейнерами

```bash
# Остановить все
docker compose -f docker-compose.vps.yml down

# Остановить с удалением volumes
docker compose -f docker-compose.vps.yml down -v

# Перезапустить
docker compose -f docker-compose.vps.yml restart

# Перезапустить только backend
docker compose -f docker-compose.vps.yml restart backend

# Пересобрать и перезапустить
docker compose -f docker-compose.vps.yml up -d --build

# Просмотр логов с момента запуска
docker compose -f docker-compose.vps.yml logs

# Логи в реальном времени
docker compose -f docker-compose.vps.yml logs -f

# Войти в контейнер
docker exec -it chess-backend sh
docker exec -it chess-frontend sh
```

---

## 🔄 Обновление приложения (вручную)

```bash
# Перейдите в директорию проекта
cd ~/chess-telegram-miniapp

# Получите последние изменения
git pull origin main

# Пересоберите и перезапустите контейнеры
docker compose -f docker-compose.vps.yml up -d --build

# Проверьте логи
docker compose -f docker-compose.vps.yml logs -f
```

---

## 🤖 GitHub Actions - Автоматический деплой

### Создание GitHub Secrets

Перейдите в настройки репозитория:
`Settings > Secrets and variables > Actions > New repository secret`

Добавьте следующие секреты:

```
VPS_HOST           = YOUR_VPS_IP
VPS_USER           = chess (или root)
VPS_SSH_KEY        = (ваш приватный SSH ключ)
VPS_PORT           = 22

SUPABASE_URL              = https://xxx.supabase.co
SUPABASE_ANON_KEY         = eyJ...
SUPABASE_SERVICE_KEY      = eyJ...

BACKEND_URL               = https://yourdomain.com
DOMAIN                    = yourdomain.com
EMAIL                     = your@email.com

AI_API_KEY                = sk-... (опционально)
```

### Настройка SSH ключа для GitHub Actions

```bash
# На вашем компьютере (НЕ на VPS):
# Создайте SSH ключ специально для GitHub Actions
ssh-keygen -t ed25519 -C "github-actions" -f ~/.ssh/github_actions_key

# Скопируйте ПУБЛИЧНЫЙ ключ на VPS
ssh-copy-id -i ~/.ssh/github_actions_key.pub chess@YOUR_VPS_IP

# Скопируйте ПРИВАТНЫЙ ключ для GitHub
cat ~/.ssh/github_actions_key
# Скопируйте весь вывод и добавьте как GitHub Secret: VPS_SSH_KEY
```

### Создание workflow файла

Создайте файл `.github/workflows/deploy.yml` (уже есть в проекте, но можно обновить):

```yaml
name: Deploy to VPS

on:
  push:
    branches: [ main ]
  workflow_dispatch:

jobs:
  deploy:
    runs-on: ubuntu-latest

    steps:
    - name: Deploy to VPS
      uses: appleboy/ssh-action@master
      with:
        host: ${{ secrets.VPS_HOST }}
        username: ${{ secrets.VPS_USER }}
        key: ${{ secrets.VPS_SSH_KEY }}
        port: ${{ secrets.VPS_PORT }}
        script: |
          cd ~/chess-telegram-miniapp

          # Получаем последние изменения
          git pull origin main

          # Обновляем .env
          cat > .env << EOF
          SUPABASE_URL=${{ secrets.SUPABASE_URL }}
          SUPABASE_ANON_KEY=${{ secrets.SUPABASE_ANON_KEY }}
          SUPABASE_SERVICE_KEY=${{ secrets.SUPABASE_SERVICE_KEY }}
          BACKEND_URL=${{ secrets.BACKEND_URL }}
          DOMAIN=${{ secrets.DOMAIN }}
          EMAIL=${{ secrets.EMAIL }}
          CORS_ORIGIN=${{ secrets.BACKEND_URL }}
          AI_PROVIDER=deepseek
          AI_API_KEY=${{ secrets.AI_API_KEY }}
          STOCKFISH_THREADS=2
          STOCKFISH_HASH_SIZE=512
          EOF

          # Пересборка и перезапуск
          docker compose -f docker-compose.vps.yml up -d --build

          # Очистка старых образов
          docker image prune -af
```

### Тестирование автодеплоя

```bash
# 1. Сделайте любое изменение и запушьте в main
git add .
git commit -m "test: trigger auto deploy"
git push origin main

# 2. Проверьте выполнение на GitHub:
# https://github.com/IOTGroupDev/chess-telegram-miniapp/actions

# 3. На VPS проверьте логи:
docker compose -f docker-compose.vps.yml logs -f
```

---

## 🔧 Troubleshooting

### Проблема: Контейнер не запускается
```bash
# Проверьте логи
docker compose -f docker-compose.vps.yml logs backend
docker compose -f docker-compose.vps.yml logs frontend

# Проверьте .env файл
cat .env

# Пересоберите с нуля
docker compose -f docker-compose.vps.yml down -v
docker compose -f docker-compose.vps.yml up -d --build
```

### Проблема: SSL не работает
```bash
# Проверьте DNS записи
nslookup yourdomain.com

# Проверьте открыты ли порты
sudo ufw status

# Проверьте сертификат
docker compose -f docker-compose.vps.yml logs certbot

# Повторите инициализацию SSL
./scripts/init-letsencrypt.sh yourdomain.com
```

### Проблема: Нехватка памяти
```bash
# Проверьте использование
docker stats

# Уменьшите лимиты в docker-compose.vps.yml:
# backend: memory: 512M (вместо 1G)
# redis: memory: 256M (вместо 768M)

# Добавьте swap
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
```

### Проблема: Backend не подключается к Supabase
```bash
# Проверьте переменные окружения
docker exec chess-backend env | grep SUPABASE

# Проверьте доступность Supabase
docker exec chess-backend curl https://YOUR_PROJECT.supabase.co

# Проверьте логи backend
docker compose -f docker-compose.vps.yml logs -f backend
```

---

## 📊 Мониторинг

### Базовый мониторинг
```bash
# Использование ресурсов
docker stats

# Дисковое пространство
df -h

# Использование памяти
free -h

# Логи всех сервисов
docker compose -f docker-compose.vps.yml logs -f
```

### Настройка автоматических бэкапов (опционально)
```bash
# Создайте скрипт бэкапа
cat > ~/backup.sh << 'EOF'
#!/bin/bash
BACKUP_DIR=~/backups
mkdir -p $BACKUP_DIR

# Backup Docker volumes
docker run --rm -v chess-telegram-miniapp_redis_data:/data -v $BACKUP_DIR:/backup alpine tar czf /backup/redis-$(date +%Y%m%d).tar.gz -C /data .

# Backup .env
cp ~/chess-telegram-miniapp/.env $BACKUP_DIR/env-$(date +%Y%m%d).backup

# Удаление старых бэкапов (старше 7 дней)
find $BACKUP_DIR -name "*.tar.gz" -mtime +7 -delete
find $BACKUP_DIR -name "*.backup" -mtime +7 -delete
EOF

chmod +x ~/backup.sh

# Добавьте в crontab (ежедневно в 2 ночи)
(crontab -l 2>/dev/null; echo "0 2 * * * ~/backup.sh") | crontab -
```

---

## ✅ Чеклист готовности к продакшену

- [ ] VPS с минимум 1GB RAM
- [ ] Установлены: Git, Docker, Docker Compose
- [ ] Настроен firewall (UFW)
- [ ] Создан проект в Supabase
- [ ] Применена миграция базы данных
- [ ] Настроены переменные окружения (.env)
- [ ] Домен направлен на VPS (A-запись)
- [ ] Настроен SSL (Let's Encrypt)
- [ ] Docker контейнеры запущены и работают
- [ ] Telegram Bot создан и настроен
- [ ] GitHub Actions настроен (опционально)
- [ ] Настроены автоматические бэкапы (опционально)

---

## 🆘 Получение помощи

- **Логи**: `docker compose -f docker-compose.vps.yml logs -f`
- **Статус**: `docker compose -f docker-compose.vps.yml ps`
- **Ресурсы**: `docker stats`
- **Документация**: См. `DEPLOYMENT.md`
