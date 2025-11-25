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

# Устанавливаем инструменты для сборки Stockfish
RUN apt-get update \
  && apt-get install -y --no-install-recommends \
    curl \
    git \
    make \
    g++ \
  && rm -rf /var/lib/apt/lists/*

# Собираем Stockfish 17 из исходников с автоопределением архитектуры CPU
# make build автоматически выберет оптимальные инструкции (x86-64, SSE41, AVX2, BMI2, etc)
RUN git clone --depth 1 --branch sf_17 https://github.com/official-stockfish/Stockfish.git /tmp/stockfish \
  && cd /tmp/stockfish/src \
  && make -j$(nproc) build ARCH=x86-64-modern \
  && cp stockfish /usr/local/bin/stockfish \
  && chmod +x /usr/local/bin/stockfish \
  && cd / \
  && rm -rf /tmp/stockfish

# Очищаем build зависимости для уменьшения размера образа
RUN apt-get purge -y git make g++ \
  && apt-get autoremove -y \
  && apt-get clean

# Копируем package.json
COPY package*.json ./

# Устанавливаем ТОЛЬКО production зависимости
RUN npm install --production

# Копируем собранное приложение из builder stage
COPY --from=builder /app/dist ./dist

# Переменные окружения для runtime
ENV NODE_ENV=production
ENV PORT=3000
# Stockfish 17 built from source, optimized for this CPU
ENV STOCKFISH_PATH=/usr/local/bin/stockfish

EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD curl -f http://localhost:3000/health || exit 1

CMD ["npm", "run", "start:prod"]
