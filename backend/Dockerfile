# Build stage
FROM node:20-alpine AS builder
WORKDIR /app
COPY package.json package-lock.json ./
COPY shared/package.json shared/tsconfig.json shared/
COPY backend/package.json backend/tsconfig.json backend/
RUN npm ci --workspace=backend --workspace=shared
COPY shared/src shared/src/
RUN npm run build -w shared
COPY backend/src backend/src/
RUN npm run build -w backend

# Runtime stage
FROM node:20-alpine
WORKDIR /app
COPY --from=builder /app/backend/dist ./dist
COPY --from=builder /app/backend/node_modules ./node_modules
COPY --from=builder /app/shared/dist ./shared/dist
COPY --from=builder /app/shared/node_modules ./shared/node_modules
COPY backend/package.json ./
EXPOSE 4000
CMD ["node", "dist/index.js"]
