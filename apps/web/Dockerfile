# =========================================================
# Stage 1 — Base & Dependencies
# =========================================================
FROM node:20-alpine AS builder

WORKDIR /app

# ---------------------------------------------------------
# Build Arguments
# ---------------------------------------------------------
ARG NEXT_PUBLIC_API_BASE_URL=http://localhost:5000
ARG NEXT_PUBLIC_APP_URL=http://localhost:3000

# ---------------------------------------------------------
# Environment Variables (Development for building)
# ---------------------------------------------------------
ENV NODE_ENV=development
ENV NEXT_PUBLIC_API_BASE_URL=${NEXT_PUBLIC_API_BASE_URL}
ENV NEXT_PUBLIC_APP_URL=${NEXT_PUBLIC_APP_URL}

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
# Copy Full Web Workspace Source
# ---------------------------------------------------------
COPY apps/web ./apps/web

# =========================================================
# Stage 2 — Build
# =========================================================
FROM builder AS build-stage

# Ensure Public Directory Exists
RUN mkdir -p ./apps/web/public

# Build Next.js Application
# We use development env for build tools but they will output production build
RUN npm run build --workspace=@link-shortener/web

# =========================================================
# Stage 3 — Production Runtime
# =========================================================
FROM node:20-alpine AS runner

WORKDIR /app

# Runtime Environment Variables
ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

# Create Non-Root User
RUN addgroup -S nodejs -g 1001 && \
    adduser -S nextjs -u 1001

# Copy Standalone Build from build-stage
COPY --from=build-stage --chown=nextjs:nodejs /app/apps/web/.next/standalone ./
COPY --from=build-stage --chown=nextjs:nodejs /app/apps/web/.next/static ./apps/web/.next/static
COPY --from=build-stage --chown=nextjs:nodejs /app/apps/web/public ./apps/web/public

USER nextjs
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=10s --start-period=15s --retries=3 \
    CMD wget -qO- http://localhost:3000 || exit 1

CMD ["node", "apps/web/server.js"]