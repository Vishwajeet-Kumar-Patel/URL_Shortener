# Stage 1: Builder
FROM node:20-alpine AS builder

WORKDIR /app

# Disable corepack to ensure npm is used exclusively
RUN corepack disable

# Build-time arguments for Next.js
ARG NEXT_PUBLIC_API_BASE_URL=http://localhost:5000
ARG NEXT_PUBLIC_APP_URL=http://localhost:3000
ARG NODE_ENV=production

# Convert ARGs to ENV so they're available in RUN commands
ENV NODE_ENV=${NODE_ENV} \
    NEXT_PUBLIC_API_BASE_URL=${NEXT_PUBLIC_API_BASE_URL} \
    NEXT_PUBLIC_APP_URL=${NEXT_PUBLIC_APP_URL}

# Copy root and web package.json files
COPY package*.json ./
COPY .npmrc ./
COPY apps/web/package*.json ./apps/web/
COPY apps/web/tsconfig.json ./apps/web/
COPY apps/web/next.config.ts ./apps/web/
COPY apps/web/tailwind.config.ts ./apps/web/
COPY apps/web/postcss.config.js ./apps/web/
COPY tsconfig.base.json ./

# Install all dependencies including dev (NODE_ENV=production would skip devDeps otherwise)
RUN npm install --include=dev

# Copy source code
COPY apps/web/src ./apps/web/src

# Ensure public dir exists (may be empty)
RUN mkdir -p ./apps/web/public

# Build the application with environment variables passed inline
RUN npm run build --workspace @link-shortener/web

# Stage 2: Runtime
FROM node:20-alpine

WORKDIR /app

# Set environment to production
ENV NODE_ENV=production

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Copy root package.json
COPY package*.json ./
COPY .npmrc ./

# Copy Next.js built files from builder
COPY --from=builder --chown=nodejs:nodejs /app/apps/web/package*.json ./apps/web/
COPY --from=builder --chown=nodejs:nodejs /app/apps/web/.next ./apps/web/.next
COPY --from=builder --chown=nodejs:nodejs /app/apps/web/public ./apps/web/public
COPY --from=builder --chown=nodejs:nodejs /app/apps/web/next.config.ts ./apps/web/

# Install production dependencies only
RUN npm install --prefer-offline --no-audit --no-fund --omit=dev --legacy-peer-deps && \
    npm cache clean --force

# Change to nodejs user
USER nodejs

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD node -e "require('http').get('http://localhost:3000', (r) => {if (r.statusCode !== 200) throw new Error(r.statusCode)})"

# Start application
CMD ["npm", "start", "--workspace", "@link-shortener/web"]
