# =========================================================
# Stage 1 — Builder
# =========================================================
FROM node:20-alpine AS builder

WORKDIR /app

# ---------------------------------------------------------
# Environment Variables
# ---------------------------------------------------------
ENV NODE_ENV=production

# ---------------------------------------------------------
# Copy Root Workspace Files
# ---------------------------------------------------------
COPY package*.json ./
COPY tsconfig.base.json ./

# ---------------------------------------------------------
# Copy Full API Workspace
# ---------------------------------------------------------
COPY apps/api ./apps/api

# ---------------------------------------------------------
# Install Dependencies
# ---------------------------------------------------------
RUN npm install --prefer-offline --no-audit --no-fund

# ---------------------------------------------------------
# Generate Prisma Client
# ---------------------------------------------------------
RUN npm run prisma:generate --workspace=@link-shortener/api

# ---------------------------------------------------------
# Build API
# ---------------------------------------------------------
RUN npm run build --workspace=@link-shortener/api

# =========================================================
# Stage 2 — Production Runtime
# =========================================================
FROM node:20-alpine AS runner

WORKDIR /app

# ---------------------------------------------------------
# Runtime Environment Variables
# ---------------------------------------------------------
ENV NODE_ENV=production
ENV PORT=5000

# ---------------------------------------------------------
# Create Non-Root User
# ---------------------------------------------------------
RUN addgroup -S nodejs -g 1001 && \
    adduser -S apiuser -u 1001

# ---------------------------------------------------------
# Copy Root Package Files
# ---------------------------------------------------------
COPY package*.json ./

# ---------------------------------------------------------
# Copy API Workspace Files
# ---------------------------------------------------------
COPY apps/api/package*.json ./apps/api/
COPY apps/api/prisma ./apps/api/prisma

# ---------------------------------------------------------
# Install Production Dependencies
# ---------------------------------------------------------
RUN npm install --omit=dev --prefer-offline --no-audit --no-fund && \
    npm cache clean --force

# ---------------------------------------------------------
# Generate Prisma Client
# ---------------------------------------------------------
RUN npm run prisma:generate --workspace=@link-shortener/api

# ---------------------------------------------------------
# Copy Built Application
# ---------------------------------------------------------
COPY --from=builder --chown=apiuser:nodejs /app/apps/api/dist ./apps/api/dist

# ---------------------------------------------------------
# Copy Generated Prisma Client
# ---------------------------------------------------------
COPY --from=builder --chown=apiuser:nodejs /app/node_modules/.prisma ./node_modules/.prisma

COPY --from=builder --chown=apiuser:nodejs /app/node_modules/@prisma ./node_modules/@prisma

# ---------------------------------------------------------
# Use Non-Root User
# ---------------------------------------------------------
USER apiuser

# ---------------------------------------------------------
# Expose Application Port
# ---------------------------------------------------------
EXPOSE 5000

# ---------------------------------------------------------
# Health Check
# ---------------------------------------------------------
HEALTHCHECK --interval=30s --timeout=10s --start-period=15s --retries=3 \
    CMD wget -qO- http://localhost:5000/api/v1/health || exit 1

# ---------------------------------------------------------
# Start API Server
# ---------------------------------------------------------
CMD ["node", "apps/api/dist/server.js"]