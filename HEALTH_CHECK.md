# Health Check Endpoints Implementation Guide

The Docker health checks in the Dockerfiles expect health check endpoints. Here's how to implement them in your API:

## API Health Check (Express)

Add this to your API routes (e.g., in `src/routes/api.routes.ts`):

```typescript
// Simple health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Detailed health check with database
app.get('/api/health/detailed', async (req, res) => {
  try {
    // Check database connection
    const mongoHealth = await mongoose.connection.db?.admin?.ping();
    
    res.status(200).json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      database: mongoHealth ? 'connected' : 'disconnected',
      version: process.env.npm_package_version
    });
  } catch (error) {
    res.status(503).json({
      status: 'error',
      timestamp: new Date().toISOString(),
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});
```

## Web Health Check (Next.js)

Add this to your Next.js API routes (e.g., in `src/app/api/health/route.ts`):

```typescript
export async function GET() {
  try {
    return new Response(
      JSON.stringify({
        status: 'ok',
        timestamp: new Date().toISOString(),
        service: 'web'
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown error'
      }),
      {
        status: 503,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}
```

## Testing Health Checks

### Locally (without Docker)
```bash
# API
curl http://localhost:5000/health

# Web
curl http://localhost:3000/api/health
```

### With Docker Compose
```bash
# Check container health status
docker-compose ps

# Test health endpoint from host
curl http://localhost:5000/health
curl http://localhost:3000
```

### Inside Container
```bash
# Test API health from web container
docker-compose exec web curl http://api:5000/health

# Test web from API container
docker-compose exec api curl http://web:3000
```

## Docker Health Check Configuration

The Dockerfiles use:

```dockerfile
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD node -e "require('http').get('http://localhost:5000/health', (r) => {if (r.statusCode !== 200) throw new Error(r.statusCode)})"
```

This means:
- **Interval**: Every 30 seconds
- **Timeout**: 10 seconds to respond
- **Start Period**: Wait 5 seconds before starting checks
- **Retries**: 3 consecutive failures = unhealthy

## Monitoring Health Status

```bash
# Watch health status in real-time
docker-compose ps --no-trunc

# Get detailed health info
docker inspect --format='{{.State.Health}}' linkshort-api

# View recent health check logs
docker inspect linkshort-api | grep -A 20 '"Health"'
```

## Production Considerations

1. **Database Health**: Check actual database connectivity
2. **Dependencies**: Verify downstream services are accessible
3. **Resource Checks**: Monitor memory/CPU usage
4. **Request Validation**: Ensure request handling is operational
5. **External Services**: Verify critical integrations (SMTP, OAuth, payments)

Example production-ready health check:

```typescript
app.get('/health', async (req, res) => {
  const checks = {
    status: 'ok' as const,
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    database: 'disconnected' as const
  };

  try {
    // Check MongoDB
    await mongoose.connection.db?.admin?.ping();
    checks.database = 'connected';
  } catch (error) {
    checks.status = 'degraded';
    console.error('Database health check failed:', error);
  }

  const statusCode = checks.status === 'ok' ? 200 : 503;
  res.status(statusCode).json(checks);
});
```
