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

COPY apps/web/package*.json ./apps/web/

# ---------------------------------------------------------
# Install Dependencies
# ---------------------------------------------------------
RUN npm install --no-audit --no-fund

# =========================================================
# Stage 2 — Builder
# =========================================================
FROM node:20-alpine AS builder

WORKDIR /app

# ---------------------------------------------------------
# Build Arguments
# ---------------------------------------------------------
ARG NEXT_PUBLIC_API_BASE_URL=http://localhost:5000/api/v1
ARG NEXT_PUBLIC_APP_URL=http://localhost:3000

# ---------------------------------------------------------
# Environment Variables
# ---------------------------------------------------------
ENV NODE_ENV=production
ENV NEXT_PUBLIC_API_BASE_URL=${NEXT_PUBLIC_API_BASE_URL}
ENV NEXT_PUBLIC_APP_URL=${NEXT_PUBLIC_APP_URL}

# ---------------------------------------------------------
# Copy Dependencies
# ---------------------------------------------------------
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/package*.json ./
COPY --from=deps /app/apps/web/package*.json ./apps/web/

# ---------------------------------------------------------
# Copy Source Code
# ---------------------------------------------------------
COPY tsconfig.base.json ./
COPY apps/web ./apps/web

# ---------------------------------------------------------
# Ensure Public Directory Exists
# ---------------------------------------------------------
RUN mkdir -p ./apps/web/public

# ---------------------------------------------------------
# Build Next.js App
# ---------------------------------------------------------
RUN npm run build --workspace=@link-shortener/web

# =========================================================
# Stage 3 — Runtime
# =========================================================
FROM node:20-alpine AS runner

WORKDIR /app

# ---------------------------------------------------------
# Runtime Environment
# ---------------------------------------------------------
ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

# ---------------------------------------------------------
# Create Non-Root User
# ---------------------------------------------------------
RUN addgroup -S nodejs -g 1001 && \
    adduser -S nextjs -u 1001

# ---------------------------------------------------------
# Copy Standalone Output
# ---------------------------------------------------------
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next/standalone ./

# ---------------------------------------------------------
# Copy Static Assets
# ---------------------------------------------------------
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next/static ./apps/web/.next/static

# ---------------------------------------------------------
# Copy Public Assets
# ---------------------------------------------------------
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/public ./apps/web/public

# ---------------------------------------------------------
# Use Non-Root User
# ---------------------------------------------------------
USER nextjs

# ---------------------------------------------------------
# Expose Port
# ---------------------------------------------------------
EXPOSE 3000

# ---------------------------------------------------------
# Healthcheck
# ---------------------------------------------------------
HEALTHCHECK --interval=30s --timeout=10s --start-period=15s --retries=3 \
    CMD wget -qO- http://localhost:3000 || exit 1

# ---------------------------------------------------------
# Start Next.js
# ---------------------------------------------------------
CMD ["node", "apps/web/server.js"]