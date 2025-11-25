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

# Устанавливаем curl и stockfish для healthcheck
# Debian 12: stockfish версия ~15.1 - стабильная и совместимая со всеми CPU
RUN apt-get update \
  && apt-get install -y --no-install-recommends curl stockfish \
  && rm -rf /var/lib/apt/lists/*

# Stockfish из apt (~15.1) работает на любом x86-64 процессоре
# Для VPS это оптимальный выбор: стабильно, без зависимостей от CPU инструкций

# Копируем package.json
COPY package*.json ./

# Устанавливаем ТОЛЬКО production зависимости
RUN npm install --production

# Копируем собранное приложение из builder stage
COPY --from=builder /app/dist ./dist

# Переменные окружения для runtime
ENV NODE_ENV=production
ENV PORT=3000
# Stockfish from apt is located in /usr/games/stockfish
ENV STOCKFISH_PATH=/usr/games/stockfish

EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD curl -f http://localhost:3000/health || exit 1

CMD ["npm", "run", "start:prod"]
