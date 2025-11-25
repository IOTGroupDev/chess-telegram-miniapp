# ===================================
# Stage 1: Build
# ===================================
FROM node:20-slim AS builder

WORKDIR /app

# Копируем package.json
COPY package*.json ./

# Устанавливаем ВСЕ зависимости (включая dev для build)
RUN npm install

# Копируем исходники
COPY . .

# Build NestJS
RUN npm run build

# ===================================
# Stage 2: Production
# ===================================
FROM node:20-slim AS production

WORKDIR /app

# Устанавливаем curl, wget и stockfish для healthcheck
RUN apt-get update \
  && apt-get install -y --no-install-recommends curl wget stockfish \
  && rm -rf /var/lib/apt/lists/*

# Попытка установить Stockfish 17.1 (если не получится - будет версия из apt)
# Скачиваем бинарник напрямую без tar
RUN wget -q -O /tmp/stockfish17 https://github.com/official-stockfish/Stockfish/releases/download/sf_17.1/stockfish-ubuntu-x86-64-avx2 \
  && chmod +x /tmp/stockfish17 \
  && mv /tmp/stockfish17 /usr/local/bin/stockfish \
  || echo "Failed to download Stockfish 17.1, using system version"

# Копируем package.json
COPY package*.json ./

# Устанавливаем ТОЛЬКО production зависимости
RUN npm install --production

# Копируем собранное приложение из builder stage
COPY --from=builder /app/dist ./dist

# Переменные окружения для runtime
ENV NODE_ENV=production
ENV PORT=3000
# Приоритет: /usr/local/bin/stockfish (17.1) или /usr/games/stockfish (15.1 fallback)
ENV STOCKFISH_PATH=/usr/local/bin/stockfish

EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD curl -f http://localhost:3000/health || exit 1

CMD ["npm", "run", "start:prod"]
