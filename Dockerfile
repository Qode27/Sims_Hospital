FROM node:22-alpine AS frontend-builder
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

FROM node:22-alpine AS backend-builder
WORKDIR /app/backend
COPY backend/package*.json ./
RUN npm ci
COPY backend/ ./
RUN npx prisma generate
RUN npm run build

FROM node:22-alpine AS runtime
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=4000
ENV DATABASE_URL=file:/app/data/sims.db
ENV UPLOAD_DIR_PATH=/app/uploads
ENV LOG_DIR=/app/logs
ENV FRONTEND_DIST_DIR=/app/frontend-dist

COPY --from=backend-builder /app/backend/package*.json ./backend/
COPY --from=backend-builder /app/backend/node_modules ./backend/node_modules
COPY --from=backend-builder /app/backend/dist ./backend/dist
COPY --from=backend-builder /app/backend/prisma ./backend/prisma
COPY --from=frontend-builder /app/frontend/dist ./frontend-dist

RUN mkdir -p /app/data /app/uploads /app/logs

WORKDIR /app/backend
EXPOSE 4000
CMD ["node", "dist/src/server.js"]
