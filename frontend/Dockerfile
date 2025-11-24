# Сборка фронта
FROM node:20-alpine AS build
WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# Продовый nginx, отдающий статический билд
FROM nginx:alpine
WORKDIR /usr/share/nginx/html

# Копируем сборку
COPY --from=build /app/dist ./

# Конфиг по умолчанию nginx для статики ок,
# если нужен кастом — добавим позже.
EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
