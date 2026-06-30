FROM node:22-alpine AS build-backend
WORKDIR /app/backend
COPY backend/package*.json ./
RUN npm ci
COPY backend/ ./
RUN npm run build

FROM node:22-alpine AS build-frontend
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

FROM node:22-alpine
WORKDIR /app
COPY --from=build-backend /app/backend/dist ./backend/dist
COPY --from=build-backend /app/backend/node_modules ./backend/node_modules
COPY --from=build-backend /app/backend/package*.json ./backend/
COPY --from=build-backend /app/backend/drizzle.config.ts ./backend/
COPY --from=build-backend /app/backend/src/database/schemas ./backend/src/database/schemas
COPY --from=build-frontend /app/frontend/dist ./frontend/dist

RUN mkdir -p /app/data

EXPOSE 3001

CMD ["node", "backend/dist/index.js"]
