# Stage 1: Build Vite frontend
FROM node:18-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
RUN npm ci

# Copy source
COPY . .

# Build args for Vite env vars
ARG VITE_USE_LOCAL_BACKEND
ARG VITE_BASE44_BACKEND_URL

# Build Vite app with env vars
RUN npm run build

# Stage 2: Serve with Caddy
FROM caddy:2-alpine

COPY --from=builder /app/dist /app/dist
COPY Caddyfile /etc/caddy/Caddyfile

EXPOSE 80
