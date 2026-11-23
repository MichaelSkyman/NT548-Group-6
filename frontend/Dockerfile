# ---- Stage 1: build ra dist/ ----
FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# ---- Stage 2: nginx phục vụ tĩnh, KHÔNG chạy bằng root ----
# nginx-unprivileged chạy bằng user nginx (uid 101) và nghe cổng 8080
# (user thường không được bind cổng < 1024).
FROM nginxinc/nginx-unprivileged:1.27.5-alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 8080
CMD ["nginx", "-g", "daemon off;"]
