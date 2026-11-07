FROM node:22-alpine AS build
WORKDIR /app
RUN apk add --no-cache python3 make g++
COPY package.json package-lock.json ./
COPY backend/package.json ./backend/package.json
COPY frontend/package.json ./frontend/package.json
RUN npm ci
COPY backend ./backend
COPY frontend ./frontend
RUN npm run build

FROM node:22-alpine AS production-dependencies
WORKDIR /app
RUN apk add --no-cache python3 make g++
COPY package.json package-lock.json ./
COPY backend/package.json ./backend/package.json
COPY frontend/package.json ./frontend/package.json
RUN npm ci --omit=dev --workspace=backend --include-workspace-root=false

FROM node:22-alpine AS runtime
WORKDIR /app
RUN apk add --no-cache libstdc++ \
  && mkdir -p /app/data \
  && chown -R node:node /app/data
COPY --from=production-dependencies /app/node_modules ./node_modules
COPY backend/package.json ./backend/package.json
COPY --from=build /app/backend/dist ./backend/dist
COPY --from=build /app/frontend/dist ./frontend/dist
ENV NODE_ENV=production \
  HOST=0.0.0.0 \
  PORT=3001 \
  DATABASE_URL=/app/data/ghostledger.db \
  ALLOW_REMOTE=false
EXPOSE 3001
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:3001/api/health').then(r => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))"
USER node
CMD ["node", "backend/dist/index.js"]
