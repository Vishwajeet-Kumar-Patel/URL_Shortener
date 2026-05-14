# Docker Build Error Fix - Next.js Environment Variables

## Problem
```
#30 25.65 Export encountered an error on /admin/links/page: /admin/links, exiting the build.
#30 25.65 Error occurred prerendering page "/dashboard/links". 
#30 25.65 Error: Missing required environment variable: NEXT_PUBLIC_API_BASE_URL
```

## Root Cause
During Docker's build phase, Next.js requires `NEXT_PUBLIC_*` environment variables to be available. These variables:
- Must be defined at **build time** (not runtime)
- Are baked into the JavaScript bundles
- Are needed even for client-side components that import from modules using them

## Solution Applied

### 1. **Dockerfile Changes**
Added build arguments to pass environment variables during the build phase:

```dockerfile
ARG NEXT_PUBLIC_API_BASE_URL=http://localhost:5000
ARG NEXT_PUBLIC_APP_URL=http://localhost:3000
ARG NODE_ENV=production

# Pass as environment variables during build
RUN NODE_ENV=$NODE_ENV \
    NEXT_PUBLIC_API_BASE_URL=$NEXT_PUBLIC_API_BASE_URL \
    NEXT_PUBLIC_APP_URL=$NEXT_PUBLIC_APP_URL \
    npm run build --workspace @link-shortener/web
```

### 2. **Docker Compose Changes**
Added build args section to docker-compose.yml:

```yaml
web:
  build:
    context: .
    dockerfile: apps/web/Dockerfile
    args:
      NEXT_PUBLIC_API_BASE_URL: ${NEXT_PUBLIC_API_BASE_URL:-http://api:5000}
      NEXT_PUBLIC_APP_URL: ${NEXT_PUBLIC_APP_URL:-http://localhost:3000}
      NODE_ENV: production
  environment:
    NEXT_PUBLIC_API_BASE_URL: ${NEXT_PUBLIC_API_BASE_URL:-http://api:5000}
    NEXT_PUBLIC_APP_URL: ${NEXT_PUBLIC_APP_URL:-http://localhost:3000}
```

### 3. **Environment Configuration**
Updated .env.example and created .env.production with correct variables:

```env
NEXT_PUBLIC_API_BASE_URL=http://localhost:5000
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

## How to Use

### Development
```bash
cp .env.example .env
docker-compose -f docker-compose.yml -f docker-compose.dev.yml up
```

### Production
```bash
cp .env.example .env.production
# Edit .env.production with real URLs
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d
```

## Build Arguments vs Environment Variables

| When | Type | How | Used For |
|------|------|-----|----------|
| **Build time** | `ARG` | `docker build --build-arg` | Compiling code, bundling, prerendering |
| **Runtime** | `ENV` | Environment variables | Running application |

For `NEXT_PUBLIC_*` variables, you need **both**:
- `ARG` in Dockerfile (for build)
- `environment` in docker-compose (for runtime)

## Environment Variable Requirements

### Required for Docker Build
- `NEXT_PUBLIC_API_BASE_URL` - Base URL for API calls
- `NEXT_PUBLIC_APP_URL` - Your application's public URL
- `NODE_ENV` - Should be `production` in Docker

### Optional (from .env.example)
- All MongoDB, SMTP, JWT, OAuth variables (for API, not web)

## Troubleshooting

### Build Still Fails
1. Verify .env file exists: `ls .env`
2. Check variables are set: `cat .env`
3. Rebuild without cache: `docker-compose build --no-cache web`
4. Check full logs: `docker-compose up --build 2>&1 | grep -A 5 -B 5 "ERROR"`

### Wrong API URL in Built App
If the app is calling the wrong API:
1. Check .env has correct `NEXT_PUBLIC_API_BASE_URL`
2. Rebuild: `docker-compose build --no-cache web`
3. Restart: `docker-compose down && docker-compose up -d`

### Missing Environment Variable Error
If you see "Missing required environment variable: X":
1. Add variable to .env file
2. Rebuild with `docker-compose build --no-cache`
3. Variable must be `NEXT_PUBLIC_*` to be available in browser

## Development vs Production URLs

### Development (.env)
```env
NEXT_PUBLIC_API_BASE_URL=http://api:5000
NEXT_PUBLIC_APP_URL=http://localhost:3000
```
- Uses internal Docker network name (`api`)
- Localhost for browser access

### Production (.env.production)
```env
NEXT_PUBLIC_API_BASE_URL=https://yourdomain.com
NEXT_PUBLIC_APP_URL=https://yourdomain.com
```
- Uses real domain names
- Both should use https in production

## Related Files Modified
- `apps/web/Dockerfile` - Added build args
- `docker-compose.yml` - Added build args section
- `.env.example` - Corrected variable names
- `.env.production` - Created with production values
- `apps/web/next.config.ts` - Enhanced configuration

## Next.js Prerendering
Client-side pages marked with `"use client"` still need these variables available because:
1. The page shell is prerendered on the server
2. Imported modules might reference the variables
3. Next.js needs to trace dependencies during build

If you want to completely skip prerendering for certain pages:
```typescript
// app/admin/links/page.tsx
export const dynamic = 'force-dynamic';

export default function AdminLinksPage() {
  // ... client-side code
}
```

---

**Last Updated**: 2026-05-14
