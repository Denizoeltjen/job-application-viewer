# Build stage: frontend bundle + type check of the server
FROM node:24-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

RUN npm run build

# Runtime stage: Node runs the server's TypeScript directly (type stripping)
FROM node:24-alpine

ENV NODE_ENV=production \
    PORT=3000 \
    DB_PATH=/data/app.db \
    STATIC_DIR=/app/dist

WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force

COPY server ./server
COPY --from=builder /app/dist ./dist

RUN mkdir /data && chown node:node /data
VOLUME /data
USER node

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=3s CMD wget -qO- http://localhost:3000/api/health >/dev/null || exit 1

CMD ["node", "--disable-warning=ExperimentalWarning", "server/index.ts"]
