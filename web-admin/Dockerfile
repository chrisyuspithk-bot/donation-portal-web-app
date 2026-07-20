FROM node:20-alpine AS builder
WORKDIR /app
COPY package.json tsconfig.base.json ./
COPY shared/package.json shared/tsconfig.json shared/
COPY web-admin/package.json web-admin/tsconfig.json web-admin/vite.config.ts web-admin/tailwind.config.js web-admin/postcss.config.js web-admin/
RUN npm install --workspace=web-admin --workspace=shared
COPY shared/src shared/src/
RUN npm run build -w shared
COPY web-admin/index.html web-admin/
COPY web-admin/src web-admin/src/
RUN npm run build -w web-admin

FROM nginx:alpine
COPY --from=builder /app/web-admin/dist /usr/share/nginx/html
COPY web-admin/nginx/default.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
