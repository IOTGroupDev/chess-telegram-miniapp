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

# Устанавливаем curl и wget для healthcheck и загрузки Stockfish
RUN apt-get update \
  && apt-get install -y --no-install-recommends curl wget \
  && rm -rf /var/lib/apt/lists/*

# Скачиваем и устанавливаем Stockfish 17.1 (официальный релиз)
# Сильнее на ~100-150 Elo чем версия из apt
RUN wget -q https://github.com/official-stockfish/Stockfish/releases/download/sf_17.1/stockfish-ubuntu-x86-64-vnni256.tar \
  && tar -xf stockfish-ubuntu-x86-64-vnni256.tar \
  && mv stockfish/stockfish-ubuntu-x86-64-vnni256 /usr/local/bin/stockfish \
  && chmod +x /usr/local/bin/stockfish \
  && rm -rf stockfish stockfish-ubuntu-x86-64-vnni256.tar

# Копируем package.json
COPY package*.json ./

# Устанавливаем ТОЛЬКО production зависимости
RUN npm install --production

# Копируем собранное приложение из builder stage
COPY --from=builder /app/dist ./dist

# Переменные окружения для runtime
ENV NODE_ENV=production
ENV PORT=3000
ENV STOCKFISH_PATH=/usr/local/bin/stockfish

EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD curl -f http://localhost:3000/health || exit 1

CMD ["npm", "run", "start:prod"]
