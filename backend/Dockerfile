# Build stage
FROM node:20-alpine AS builder
WORKDIR /app
COPY package.json ./
COPY shared/package.json shared/tsconfig.json shared/
COPY backend/package.json backend/tsconfig.json backend/
RUN npm install --workspace=backend --workspace=shared
COPY shared/src shared/src/
RUN npm run build -w shared
COPY backend/src backend/src/
RUN npm run build -w backend

# Runtime stage
FROM node:20-alpine
WORKDIR /app
COPY --from=builder /app/package.json ./
COPY --from=builder /app/backend/dist ./dist
COPY --from=builder /app/backend/node_modules ./node_modules
COPY --from=builder /app/shared/dist ./shared/dist
ENV NODE_ENV=production
EXPOSE 4000
CMD ["node", "dist/index.js"]
