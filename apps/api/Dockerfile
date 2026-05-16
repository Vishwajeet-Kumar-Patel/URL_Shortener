# =========================================================
# Stage 1 — Dependencies
# =========================================================
FROM node:20-alpine AS deps

WORKDIR /app

# ---------------------------------------------------------
# Copy Workspace Manifests
# ---------------------------------------------------------
COPY package*.json ./
COPY tsconfig.base.json ./

COPY apps/api/package*.json ./apps/api/

# ---------------------------------------------------------
# Install Dependencies
# ---------------------------------------------------------
RUN npm install --no-audit --no-fund

# =========================================================
# Stage 2 — Builder
# =========================================================
FROM node:20-alpine AS builder

WORKDIR /app

ENV NODE_ENV=development

# ---------------------------------------------------------
# Copy Installed Dependencies
# ---------------------------------------------------------
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/package*.json ./
COPY --from=deps /app/apps/api/package*.json ./apps/api/

# ---------------------------------------------------------
# Copy Source Code
# ---------------------------------------------------------
COPY tsconfig.base.json ./
COPY apps/api ./apps/api

# ---------------------------------------------------------
# Prisma Generate
# ---------------------------------------------------------
RUN npm run prisma:generate --workspace=@link-shortener/api

# ---------------------------------------------------------
# Build API
# ---------------------------------------------------------
RUN npm run build --workspace=@link-shortener/api

# =========================================================
# Stage 3 — Production Runtime
# =========================================================
FROM node:20-alpine AS runner

WORKDIR /app

# ---------------------------------------------------------
# Runtime Environment
# ---------------------------------------------------------
ENV NODE_ENV=production
ENV PORT=5000

# ---------------------------------------------------------
# Create Non-Root User
# ---------------------------------------------------------
RUN addgroup -S nodejs -g 1001 && \
    adduser -S apiuser -u 1001

# ---------------------------------------------------------
# Copy Workspace Manifests
# ---------------------------------------------------------
COPY package*.json ./
COPY apps/api/package*.json ./apps/api/

# ---------------------------------------------------------
# Install Production Dependencies
# ---------------------------------------------------------
RUN npm install --omit=dev --no-audit --no-fund && \
    npm cache clean --force

# ---------------------------------------------------------
# Copy Prisma Schema
# ---------------------------------------------------------
COPY apps/api/prisma ./apps/api/prisma

# ---------------------------------------------------------
# Copy Prisma Client
# ---------------------------------------------------------
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma

# ---------------------------------------------------------
# Copy Built Application
# ---------------------------------------------------------
COPY --from=builder --chown=apiuser:nodejs /app/apps/api/dist ./apps/api/dist

# ---------------------------------------------------------
# Use Non-Root User
# ---------------------------------------------------------
USER apiuser

# ---------------------------------------------------------
# Expose Port
# ---------------------------------------------------------
EXPOSE 5000

# ---------------------------------------------------------
# Healthcheck
# ---------------------------------------------------------
HEALTHCHECK --interval=30s --timeout=10s --start-period=15s --retries=3 \
    CMD wget -qO- http://localhost:5000/api/v1/health || exit 1

# ---------------------------------------------------------
# Start API
# ---------------------------------------------------------
CMD ["node", "apps/api/dist/server.js"]