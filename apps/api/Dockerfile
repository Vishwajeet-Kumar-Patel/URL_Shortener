# Stage 1: Builder
FROM node:20-alpine AS builder

WORKDIR /app

# Copy root and api package.json files
COPY package*.json ./
COPY apps/api/package*.json ./apps/api/
COPY apps/api/tsconfig.json ./apps/api/
COPY tsconfig.base.json ./

# Install dependencies
RUN npm install --prefer-offline --no-audit --no-fund

# Copy source code
COPY apps/api/src ./apps/api/src

# Build the application
RUN npm run build --workspace @link-shortener/api

# Stage 2: Runtime
FROM node:20-alpine

WORKDIR /app

# Set environment to production
ENV NODE_ENV=production

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Copy root and api package.json files
COPY package*.json ./
COPY apps/api/package*.json ./apps/api/

# Install production dependencies only
RUN npm install --prefer-offline --no-audit --no-fund --omit=dev && \
    npm cache clean --force

# Copy built application from builder stage
COPY --from=builder --chown=nodejs:nodejs /app/apps/api/dist ./apps/api/dist

# Change to nodejs user
USER nodejs

# Expose port
EXPOSE 5000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD node -e "require('http').get('http://localhost:5000/api/v1/health', (r) => {if (r.statusCode !== 200) throw new Error(r.statusCode)})"

# Start application
CMD ["node", "apps/api/dist/server.js"]
