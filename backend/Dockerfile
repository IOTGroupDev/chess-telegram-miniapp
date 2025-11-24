FROM node:20-slim AS production

WORKDIR /app

# 1. Устанавливаем STOCKFISH
# Debian-based slim → binary будет в /usr/games/stockfish
RUN apt-get update \
  && apt-get install -y --no-install-recommends stockfish \
  && rm -rf /var/lib/apt/lists/*

# 2. Копируем package.json и prisma
COPY package*.json ./
COPY prisma ./prisma/

# 3. Ставим зависимости
RUN npm ci

# 4. Генерируем Prisma Client
RUN npx prisma generate

# 5. Копируем исходники
COPY . .

# 6. Build NestJS
RUN npm run build

# 7. Переменные окружения для runtime
ENV NODE_ENV=production
ENV PORT=3000
ENV STOCKFISH_PATH=/usr/games/stockfish

EXPOSE 3000

CMD ["npm", "run", "start:prod"]
