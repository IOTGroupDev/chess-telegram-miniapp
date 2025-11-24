#!/bin/bash

# =====================================
# Let's Encrypt SSL Setup Script
# =====================================
#
# Usage: ./scripts/init-letsencrypt.sh yourdomain.com
#
# This script will:
# 1. Create nginx config with SSL
# 2. Obtain SSL certificate from Let's Encrypt
# 3. Restart nginx with SSL enabled
#
# Requirements:
# - Docker and Docker Compose installed
# - Domain pointing to your VPS IP
# - Port 80 and 443 open
#
# =====================================

set -e

DOMAIN=$1
EMAIL=${2:-admin@$DOMAIN}

if [ -z "$DOMAIN" ]; then
  echo "❌ Error: Domain name required"
  echo "Usage: ./scripts/init-letsencrypt.sh yourdomain.com [email@example.com]"
  exit 1
fi

echo "🚀 Setting up SSL for $DOMAIN"
echo "📧 Email: $EMAIL"
echo ""

# Create directories
echo "📁 Creating directories..."
mkdir -p nginx/conf.d
mkdir -p certbot/conf
mkdir -p certbot/www

# Create initial nginx config (HTTP only for challenge)
echo "📝 Creating initial nginx config..."
cat > nginx/conf.d/default.conf << EOF
# HTTP Server (for Let's Encrypt challenge)
server {
    listen 80;
    server_name $DOMAIN www.$DOMAIN;

    # Let's Encrypt challenge
    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }

    # Redirect all other traffic to HTTPS
    location / {
        return 301 https://\$host\$request_uri;
    }
}
EOF

# Start nginx temporarily for certificate
echo "🔧 Starting nginx for certificate challenge..."
docker-compose -f docker-compose.vps.yml up -d nginx

# Wait for nginx to start
echo "⏳ Waiting for nginx to start..."
sleep 5

# Obtain certificate
echo "🔐 Obtaining SSL certificate..."
docker-compose -f docker-compose.vps.yml run --rm certbot certonly \
  --webroot \
  --webroot-path=/var/www/certbot \
  --email $EMAIL \
  --agree-tos \
  --no-eff-email \
  -d $DOMAIN \
  -d www.$DOMAIN

if [ $? -ne 0 ]; then
  echo "❌ Failed to obtain certificate"
  echo ""
  echo "Common issues:"
  echo "1. Domain not pointing to this server"
  echo "2. Port 80/443 not open"
  echo "3. Another service using port 80/443"
  echo ""
  exit 1
fi

# Create production nginx config (with SSL)
echo "📝 Creating production nginx config with SSL..."
cat > nginx/conf.d/default.conf << EOF
# HTTP Server (redirect to HTTPS)
server {
    listen 80;
    server_name $DOMAIN www.$DOMAIN;

    # Let's Encrypt challenge
    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }

    # Redirect to HTTPS
    location / {
        return 301 https://\$host\$request_uri;
    }
}

# HTTPS Server
server {
    listen 443 ssl http2;
    server_name $DOMAIN www.$DOMAIN;

    # SSL Configuration
    ssl_certificate /etc/letsencrypt/live/$DOMAIN/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/$DOMAIN/privkey.pem;

    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;

    # Security Headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    # Frontend (React SPA)
    location / {
        proxy_pass http://frontend:80;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_cache_bypass \$http_upgrade;

        # SPA fallback
        try_files \$uri \$uri/ /index.html;
    }

    # Backend API
    location /api/ {
        proxy_pass http://backend:3000/api/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;

        # Timeouts for long-running chess analysis
        proxy_read_timeout 300s;
        proxy_connect_timeout 300s;
        proxy_send_timeout 300s;
    }

    # WebSocket support
    location /socket.io/ {
        proxy_pass http://backend:3000/socket.io/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_cache_bypass \$http_upgrade;
    }

    # Health check
    location /health {
        proxy_pass http://backend:3000/health;
        access_log off;
    }
}
EOF

# Reload nginx
echo "🔄 Reloading nginx with SSL..."
docker-compose -f docker-compose.vps.yml restart nginx

# Test certificate renewal
echo "🧪 Testing certificate renewal..."
docker-compose -f docker-compose.vps.yml run --rm certbot renew --dry-run

if [ $? -eq 0 ]; then
  echo ""
  echo "✅ SSL Setup Complete!"
  echo ""
  echo "🌐 Your site is now available at:"
  echo "   https://$DOMAIN"
  echo "   https://www.$DOMAIN"
  echo ""
  echo "📋 Next steps:"
  echo "   1. Update your .env file:"
  echo "      BACKEND_URL=https://$DOMAIN"
  echo "      DOMAIN=$DOMAIN"
  echo ""
  echo "   2. Rebuild containers:"
  echo "      docker-compose -f docker-compose.vps.yml up -d --build"
  echo ""
  echo "   3. Update Telegram Bot:"
  echo "      @BotFather -> /setmenubutton -> https://$DOMAIN"
  echo ""
  echo "🔄 Certificate will auto-renew every 12 hours via certbot container"
  echo ""
else
  echo "⚠️  SSL setup complete but renewal test failed"
  echo "Certificate is valid but may not auto-renew"
fi
