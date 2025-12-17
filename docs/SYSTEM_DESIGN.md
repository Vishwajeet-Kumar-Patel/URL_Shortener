# System Design Documentation

## Overview

This document details the architectural decisions, trade-offs, and design considerations for the Distributed URL Shortener system.

## Table of Contents

1. [System Requirements](#system-requirements)
2. [Architecture](#architecture)
3. [Data Model](#data-model)
4. [Short Code Generation](#short-code-generation)
5. [Caching Strategy](#caching-strategy)
6. [Rate Limiting](#rate-limiting)
7. [Scalability](#scalability)
8. [Consistency and Availability](#consistency-and-availability)
9. [Performance Optimization](#performance-optimization)

## System Requirements

### Functional Requirements

- Shorten long URLs to unique short codes
- Redirect short URLs to original URLs
- Track analytics (clicks, unique visitors)
- Support URL expiration
- Provide analytics dashboard

### Non-Functional Requirements

- **Availability**: 99.9% uptime
- **Latency**: <10ms for redirects
- **Scalability**: Support 10,000+ requests/second
- **Reliability**: No data loss
- **Security**: Prevent abuse and malicious URLs

## Architecture

### Read-Heavy System Design

URL shorteners are inherently read-heavy (90%+ reads):

```
Writes (URL Creation):     ~100/second
Reads (Redirects):       ~10,000/second
```

**Design Decision**: Optimize for read performance with aggressive caching.

### Three-Tier Architecture

```
┌──────────────────────────────────────────┐
│          Load Balancer (AWS ALB)         │
└────────────────┬─────────────────────────┘
                 │
        ┌────────┴────────┐
        │                 │
┌───────▼────────┐ ┌─────▼──────────┐
│  Backend API   │ │  Backend API   │  (Stateless)
│   Instance 1   │ │   Instance 2   │
└───────┬────────┘ └─────┬──────────┘
        │                │
        └────────┬────────┘
                 │
        ┌────────┴────────┐
        │                 │
┌───────▼────────┐ ┌─────▼──────────┐
│  Redis Cache   │ │   PostgreSQL   │
│  (Read Cache)  │ │   (Persistent) │
└────────────────┘ └────────────────┘
```

## Data Model

### URLs Table

```sql
CREATE TABLE urls (
    id BIGSERIAL PRIMARY KEY,              -- Auto-incrementing ID
    short_code VARCHAR(10) UNIQUE NOT NULL, -- Unique short code
    original_url TEXT NOT NULL,             -- Original long URL
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP,                   -- Optional expiration
    click_count BIGINT DEFAULT 0,           -- Total clicks
    last_accessed TIMESTAMP,                -- Last redirect time
    creator_ip VARCHAR(45),                 -- Creator's IP
    is_active BOOLEAN DEFAULT TRUE          -- Soft delete flag
);

-- Indexes for performance
CREATE INDEX idx_short_code ON urls(short_code) WHERE is_active = TRUE;
CREATE INDEX idx_original_url ON urls(original_url);
CREATE INDEX idx_created_at ON urls(created_at DESC);
```

**Index Rationale**:
- `idx_short_code`: Primary lookup for redirects (most frequent query)
- `idx_original_url`: Check for existing short URLs
- `idx_created_at`: Analytics and cleanup queries

### Analytics Table

```sql
CREATE TABLE url_analytics (
    id BIGSERIAL PRIMARY KEY,
    url_id BIGINT REFERENCES urls(id) ON DELETE CASCADE,
    accessed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    ip_address VARCHAR(45),
    user_agent TEXT,
    referer TEXT,
    country VARCHAR(2),
    city VARCHAR(100)
);
```

**Design Decision**: Separate analytics table to:
- Avoid locking main URLs table on high-traffic redirects
- Enable efficient bulk inserts
- Support complex analytics queries without impacting redirects

## Short Code Generation

### Algorithm: Nanoid

**Choice**: Nanoid over Base62 encoding or UUID

**Rationale**:
1. **Security**: Cryptographically strong random generation
2. **Collision Resistance**: 3.5 trillion combinations with 7 characters
3. **URL-Safe**: No special characters, no encoding needed
4. **Compact**: Shorter than UUID, longer than sequential IDs

### Collision Handling

```javascript
async function generateUniqueShortCode(maxAttempts = 5) {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const shortCode = nanoid(7);
    
    // Check database for collision
    if (!await existsInDatabase(shortCode)) {
      return shortCode;
    }
  }
  
  // Fallback: Use longer code
  return nanoid(10);
}
```

**Trade-off**: 
- Retry mechanism adds latency (~1-2ms per retry)
- Collision probability: ~0.001% at 1 billion URLs

### Sequential IDs vs. Random IDs

| Approach | Pros | Cons |
|----------|------|------|
| Sequential | Shorter, predictable order | Enumeration attacks, exposes traffic volume |
| Random (Nanoid) | Secure, no enumeration | Slightly longer, requires collision check |

**Decision**: Random IDs for security and privacy.

## Caching Strategy

### Redis as Cache Layer

**Purpose**: Reduce database load and improve redirect latency

### Cache-Aside Pattern

```javascript
async function getUrl(shortCode) {
  // 1. Check cache
  let url = await redis.get(`short:${shortCode}`);
  
  if (url) {
    return url; // Cache hit
  }
  
  // 2. Cache miss: Query database
  url = await db.query('SELECT * FROM urls WHERE short_code = ?', [shortCode]);
  
  // 3. Update cache
  if (url) {
    await redis.setex(`short:${shortCode}`, 86400, JSON.stringify(url));
  }
  
  return url;
}
```

### Cache Key Design

```
short:{shortCode}        → URL data
url:{originalUrl}        → Existing short code
ratelimit:{ip}           → Rate limit counter
abuse:{ip}               → Abuse detection counter
blocked:{ip}             → Blocked IP data
```

### TTL Strategy

- **Short URLs**: 24 hours (balances memory and hit rate)
- **Rate limits**: 15 minutes (sliding window)
- **Abuse counters**: 1 hour (temporary blocking)

**Trade-off**:
- Longer TTL = Better hit rate, but stale data risk
- Shorter TTL = Fresher data, but more database queries

**Decision**: 24-hour TTL with manual invalidation on deletion.

### Cache Invalidation

```javascript
async function deleteUrl(shortCode) {
  const url = await db.query('UPDATE urls SET is_active = FALSE WHERE short_code = ?', [shortCode]);
  
  // Invalidate cache
  await redis.del(`short:${shortCode}`);
  await redis.del(`url:${url.original_url}`);
}
```

## Rate Limiting

### Multi-Layer Approach

```
Global Rate Limit     → 100 requests / 15 min / IP
Create URL Limit      → 10 URLs / 15 min / IP
Abuse Detection       → Block after 50 suspicious actions
```

### Distributed Rate Limiting with Redis

```javascript
async function checkRateLimit(ip, limit, window) {
  const key = `ratelimit:${ip}`;
  const count = await redis.incr(key);
  
  if (count === 1) {
    await redis.expire(key, window);
  }
  
  return count <= limit;
}
```

**Why Redis?**
- Atomic operations (INCR is thread-safe)
- Shared state across multiple servers
- Automatic expiration (no cleanup needed)

### Abuse Prevention

**Patterns Detected**:
- Malware/phishing URLs
- Double shortening (bit.ly/tinyurl)
- Executable files (.exe, .scr)
- Excessive requests from single IP

**Action**: Temporary IP blocking (1 hour)

## Scalability

### Horizontal Scaling

**Stateless Backend**:
- No session data stored in memory
- All state in Redis/PostgreSQL
- Can add/remove instances dynamically

**Load Balancing**:
- Round-robin or least connections
- Health checks on `/api/health`
- Auto-scaling based on CPU/memory

### Database Scaling

**Current**: Single PostgreSQL instance (good for <10M URLs)

**Future Scaling Options**:

1. **Read Replicas**
   - Route analytics queries to replicas
   - Master for writes, replicas for reads

2. **Sharding**
   - Shard by short code prefix (A-M, N-Z)
   - Consistent hashing for distribution

3. **Partitioning**
   - Partition by creation date
   - Archive old URLs to cold storage

### Redis Scaling

**Current**: Single Redis instance

**Future Scaling**:
- Redis Cluster for horizontal scaling
- Redis Sentinel for high availability
- Separate caches for URLs vs. rate limiting

## Consistency and Availability

### CAP Theorem Trade-off

**Decision**: Availability over Consistency (AP system)

**Rationale**:
- Read-heavy workload tolerates eventual consistency
- Redirect errors are worse than slightly stale analytics
- Cache invalidation handles consistency

### Consistency Levels

| Operation | Consistency | Rationale |
|-----------|-------------|-----------|
| URL Creation | Strong | Must be unique, check DB |
| Redirect | Eventual | Cache may be slightly stale |
| Analytics | Eventual | Exact counts less critical |
| Deletion | Strong | Must invalidate cache |

### Failure Scenarios

**Redis Failure**:
- System continues operating
- All requests hit database (slower, but functional)
- Cache rebuilds on recovery

**Database Failure**:
- System becomes read-only from cache
- No new URLs created
- Existing URLs continue redirecting (until cache expires)

**Both Fail**:
- System unavailable
- Return 503 Service Unavailable

## Performance Optimization

### Redirect Latency Breakdown

```
Total: ~8ms
├─ Cache lookup:      2ms
├─ (Cache miss: DB):  15ms
├─ Analytics async:   0ms (background)
└─ HTTP redirect:     1ms
```

**Optimizations**:
1. Redis in-memory cache (~2ms)
2. Database connection pooling (reuse connections)
3. Asynchronous analytics (don't block redirect)
4. Indexed database queries

### Analytics Asynchronously

```javascript
// Don't wait for analytics
res.redirect(301, url.original_url);

// Record analytics in background
setImmediate(() => {
  recordAnalytics(url.id, req.ip, req.headers);
});
```

**Trade-off**: Potential analytics loss if server crashes, but much faster redirects.

### Database Connection Pooling

```javascript
const pool = new Pool({
  max: 20,                    // Max connections
  idleTimeoutMillis: 30000,   // Close idle connections
  connectionTimeoutMillis: 2000
});
```

**Benefit**: Reuse connections, avoid connection overhead (~10-50ms).

## Security Considerations

### Input Validation

- URL format validation
- Maximum length (2048 characters)
- Protocol whitelist (http, https)

### SQL Injection Prevention

- Parameterized queries (no string concatenation)
- ORM with prepared statements

### Rate Limiting

- Prevent DDoS
- Limit abuse of service
- Protect infrastructure

### Abuse Detection

- Pattern-based blocking
- IP blacklisting
- Manual review queue (future)

## Monitoring and Observability

### Key Metrics

1. **Performance**
   - P50, P95, P99 latency
   - Request throughput
   - Error rate

2. **Cache**
   - Hit rate (target: >95%)
   - Eviction rate
   - Memory usage

3. **Database**
   - Query latency
   - Connection pool usage
   - Slow query log

4. **Business**
   - URLs created per day
   - Click-through rate
   - Top URLs by traffic

### Logging

- HTTP access logs (Morgan)
- Application errors
- Audit logs (URL creation/deletion)

### Alerting

- API error rate >1%
- Cache hit rate <90%
- Database latency >100ms
- Disk space <20%

## Cost Analysis

### AWS Infrastructure (Estimated)

| Service | Tier | Monthly Cost |
|---------|------|--------------|
| ECS (2 tasks) | Fargate | ~$30 |
| RDS (PostgreSQL) | db.t3.micro | ~$15 |
| ElastiCache (Redis) | cache.t3.micro | ~$12 |
| ALB | Standard | ~$20 |
| **Total** | | **~$77/month** |

### Optimization Opportunities

- Use reserved instances (save 30-40%)
- Auto-scaling (scale down during low traffic)
- S3 for cold storage (archive old URLs)

## Future Enhancements

1. **Custom Short Codes**: Allow users to choose vanity URLs
2. **QR Code Generation**: Generate QR codes for short URLs
3. **Link Rotation**: A/B testing with multiple destinations
4. **Geolocation**: Redirect based on visitor's country
5. **API Keys**: Authentication for programmatic access
6. **Webhooks**: Notify on certain click thresholds
7. **Browser Extensions**: Quick URL shortening

## Conclusion

This system design prioritizes:
- **Performance**: <10ms redirects with Redis caching
- **Scalability**: Stateless architecture for horizontal scaling
- **Reliability**: 99.9% uptime with proper monitoring
- **Security**: Rate limiting and abuse prevention

The architecture balances trade-offs between consistency, availability, and performance to meet the requirements of a production-ready URL shortener.
