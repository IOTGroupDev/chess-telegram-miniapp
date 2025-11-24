# Сборка фронта
FROM node:20-alpine AS build
WORKDIR /app

# Build args для Vite env переменных
ARG VITE_SUPABASE_URL
ARG VITE_SUPABASE_ANON_KEY
ARG VITE_ENGINE_API_URL

# Устанавливаем переменные окружения для сборки
ENV VITE_SUPABASE_URL=$VITE_SUPABASE_URL
ENV VITE_SUPABASE_ANON_KEY=$VITE_SUPABASE_ANON_KEY
ENV VITE_ENGINE_API_URL=$VITE_ENGINE_API_URL

COPY package*.json ./
RUN npm install

COPY . .
RUN npm run build

# Продовый nginx, отдающий статический билд
FROM nginx:alpine
WORKDIR /usr/share/nginx/html

# Копируем сборку
COPY --from=build /app/dist ./

# Копируем кастомный nginx конфиг для SPA (fallback на index.html)
RUN echo 'server { \
  listen 80; \
  root /usr/share/nginx/html; \
  index index.html; \
  location / { \
    try_files $uri $uri/ /index.html; \
  } \
}' > /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
