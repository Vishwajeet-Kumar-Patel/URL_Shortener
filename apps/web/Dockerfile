# Stage 1: Builder
FROM node:22-alpine AS builder

WORKDIR /app

# Enable corepack for Yarn support
#RUN corepack enable

# Build-time arguments for Next.js
ARG NEXT_PUBLIC_API_BASE_URL=http://localhost:5000
ARG NEXT_PUBLIC_APP_URL=http://localhost:3000
ARG NODE_ENV=production

# Convert ARGs to ENV so they're available in RUN commands
ENV NODE_ENV=${NODE_ENV} \
    NEXT_PUBLIC_API_BASE_URL=${NEXT_PUBLIC_API_BASE_URL} \
    NEXT_PUBLIC_APP_URL=${NEXT_PUBLIC_APP_URL}

# Copy root package.json and lock file
COPY package.json yarn.lock ./
COPY apps/web/package.json ./apps/web/
COPY apps/web/tsconfig.json ./apps/web/
COPY apps/web/next.config.ts ./apps/web/
COPY apps/web/tailwind.config.ts ./apps/web/
COPY apps/web/postcss.config.js ./apps/web/
COPY tsconfig.base.json ./

# Install all dependencies including dev
RUN yarn install --frozen-lockfile

# Copy source code
COPY apps/web/src ./apps/web/src

# Ensure public dir exists (may be empty)
RUN mkdir -p ./apps/web/public

# Build the application
RUN yarn workspace @link-shortener/web build

# Stage 2: Runtime
FROM node:20-alpine

WORKDIR /app

ENV NODE_ENV=production \
    PORT=3000 \
    HOSTNAME=0.0.0.0

RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Standalone output bundles everything — no yarn install needed.
# outputFileTracingRoot = monorepo root, so standalone structure mirrors
# the monorepo: server.js lives at apps/web/server.js inside the bundle.
COPY --from=builder --chown=nodejs:nodejs /app/apps/web/.next/standalone ./
COPY --from=builder --chown=nodejs:nodejs /app/apps/web/.next/static ./apps/web/.next/static
COPY --from=builder --chown=nodejs:nodejs /app/apps/web/public ./apps/web/public

USER nodejs

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD node -e "require('http').get('http://localhost:3000', (r) => {if (r.statusCode !== 200) throw new Error(r.statusCode)})"

CMD ["node", "apps/web/server.js"]