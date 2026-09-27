# syntax=docker/dockerfile:1
# Multi-stage production Dockerfile for Job Event Processing Service

# Stage 1: Build & compile TypeScript
FROM node:22-alpine AS builder

WORKDIR /app

# Copy dependency manifests
COPY package*.json tsconfig.json ./

# Install all dependencies (including devDependencies required for compilation)
RUN npm ci

# Copy source code, scripts, and fixtures
COPY src/ ./src/
COPY scripts/ ./scripts/
COPY fixtures/ ./fixtures/
COPY test/ ./test/

# Compile TypeScript to JavaScript in /app/dist
RUN npm run build

# Stage 2: Minimal Production Runtime
FROM node:22-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production

# Install only production dependencies
COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force

# Copy compiled JavaScript output and runtime fixtures from builder
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/fixtures ./fixtures

# Expose default HTTP API port
EXPOSE 3000

# Default command starts the Fastify API server
CMD ["node", "dist/src/api/server.js"]
