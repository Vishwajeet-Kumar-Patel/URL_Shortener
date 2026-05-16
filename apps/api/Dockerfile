# =========================================================
# Stage 1 — Base & Dependencies
# =========================================================
FROM node:20-alpine AS builder

WORKDIR /app

# ---------------------------------------------------------
# Environment Variables (Development for building)
# ---------------------------------------------------------
ENV NODE_ENV=development

# Copy package.json files for all workspaces to allow proper npm install
COPY package*.json ./
COPY apps/api/package*.json ./apps/api/
COPY apps/web/package*.json ./apps/web/
COPY tsconfig.base.json ./

# ---------------------------------------------------------
# Install ALL Dependencies (including devDependencies)
# ---------------------------------------------------------
RUN npm install --prefer-offline --no-audit --no-fund

# ---------------------------------------------------------
# Copy Full API Workspace Source
# ---------------------------------------------------------
COPY apps/api ./apps/api

# ---------------------------------------------------------
# Generate Prisma Client (in builder stage)
# ---------------------------------------------------------
RUN npm run prisma:generate --workspace=@link-shortener/api

# =========================================================
# Stage 2 — Build
# =========================================================
FROM builder AS build-stage

# Build API
RUN npm run build --workspace=@link-shortener/api

# =========================================================
# Stage 3 — Production Runtime
# =========================================================
FROM node:20-alpine AS runner

WORKDIR /app

# Runtime Environment Variables
ENV NODE_ENV=production
ENV PORT=5000

# Create Non-Root User
RUN addgroup -S nodejs -g 1001 && \
    adduser -S apiuser -u 1001

# Copy Root Package Files (needed for production node_modules)
COPY package*.json ./
COPY apps/api/package*.json ./apps/api/
COPY apps/api/prisma ./apps/api/prisma

# Install Production Dependencies ONLY
RUN npm install --omit=dev --prefer-offline --no-audit --no-fund && \
    npm cache clean --force

# Copy Built Application from build-stage
COPY --from=build-stage --chown=apiuser:nodejs /app/apps/api/dist ./apps/api/dist

# Copy Generated Prisma Client from builder stage
COPY --from=builder --chown=apiuser:nodejs /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder --chown=apiuser:nodejs /app/node_modules/@prisma ./node_modules/@prisma

USER apiuser
EXPOSE 5000

HEALTHCHECK --interval=30s --timeout=10s --start-period=15s --retries=3 \
    CMD wget -qO- http://localhost:5000/api/v1/health || exit 1

CMD ["node", "apps/api/dist/server.js"]