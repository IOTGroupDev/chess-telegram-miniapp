# ===================================
# Stage 1: Build
# ===================================
FROM node:20-slim AS builder

WORKDIR /app

# Копируем package.json
COPY package*.json ./

# Устанавливаем ВСЕ зависимости (включая dev для build)
RUN npm ci

# Копируем исходники
COPY . .

# Build NestJS
RUN npm run build

# ===================================
# Stage 2: Production
# ===================================
FROM node:20-slim AS production

WORKDIR /app

# Устанавливаем STOCKFISH и curl (для healthcheck)
# Debian-based slim → binary будет в /usr/games/stockfish
RUN apt-get update \
  && apt-get install -y --no-install-recommends stockfish curl \
  && rm -rf /var/lib/apt/lists/*

# Копируем package.json
COPY package*.json ./

# Устанавливаем ТОЛЬКО production зависимости
RUN npm ci --only=production

# Копируем собранное приложение из builder stage
COPY --from=builder /app/dist ./dist

# Переменные окружения для runtime
ENV NODE_ENV=production
ENV PORT=3000
ENV STOCKFISH_PATH=/usr/games/stockfish

EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD curl -f http://localhost:3000/health || exit 1

CMD ["npm", "run", "start:prod"]
