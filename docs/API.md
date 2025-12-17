# API Reference

Complete API documentation for the Distributed URL Shortener.

## Base URL

```
Development: http://localhost:3000
Production:  https://your-domain.com
```

## Authentication

Currently, the API is open and rate-limited. Future versions may include API key authentication.

## Rate Limits

- **Global**: 100 requests per 15 minutes per IP
- **URL Creation**: 10 URLs per 15 minutes per IP
- **Abuse Detection**: Automatic blocking after suspicious activity

Rate limit headers are included in responses:
```
RateLimit-Limit: 100
RateLimit-Remaining: 95
RateLimit-Reset: 1640000000
```

## Endpoints

### 1. Create Short URL

Create a new shortened URL.

**Endpoint**: `POST /api/shorten`

**Request Body**:
```json
{
  "url": "https://example.com/very-long-url",
  "expiresIn": 86400  // Optional: seconds until expiration
}
```

**Response** (201 Created):
```json
{
  "success": true,
  "data": {
    "shortUrl": "http://localhost:3000/abc1234",
    "shortCode": "abc1234",
    "originalUrl": "https://example.com/very-long-url",
    "expiresAt": "2025-12-19T00:00:00.000Z",
    "createdAt": "2025-12-18T00:00:00.000Z"
  }
}
```

**Response** (200 OK - Existing URL):
```json
{
  "success": true,
  "data": {
    "shortUrl": "http://localhost:3000/abc1234",
    "shortCode": "abc1234",
    "originalUrl": "https://example.com/very-long-url",
    "existing": true
  }
}
```

**Errors**:
- `400 Bad Request`: Invalid URL format
- `429 Too Many Requests`: Rate limit exceeded

**Example**:
```bash
curl -X POST http://localhost:3000/api/shorten \
  -H "Content-Type: application/json" \
  -d '{"url": "https://example.com/long-url"}'
```

---

### 2. Redirect to Original URL

Redirect a short URL to its original destination.

**Endpoint**: `GET /:shortCode`

**Parameters**:
- `shortCode` (path): The short code (e.g., "abc1234")

**Response**: `301 Moved Permanently` (redirect to original URL)

**Errors**:
- `404 Not Found`: URL not found or expired

**Example**:
```bash
curl -L http://localhost:3000/abc1234
```

**Note**: This endpoint records analytics asynchronously.

---

### 3. Get Analytics

Retrieve analytics for a short URL.

**Endpoint**: `GET /api/analytics/:shortCode`

**Parameters**:
- `shortCode` (path): The short code (e.g., "abc1234")

**Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "shortCode": "abc1234",
    "originalUrl": "https://example.com/very-long-url",
    "createdAt": "2025-12-18T00:00:00.000Z",
    "clickCount": 150,
    "totalClicks": 150,
    "uniqueVisitors": 75,
    "lastAccessed": "2025-12-18T12:00:00.000Z"
  }
}
```

**Errors**:
- `404 Not Found`: URL not found

**Example**:
```bash
curl http://localhost:3000/api/analytics/abc1234
```

---

### 4. Delete Short URL

Soft delete a short URL (sets `is_active` to false).

**Endpoint**: `DELETE /api/:shortCode`

**Parameters**:
- `shortCode` (path): The short code (e.g., "abc1234")

**Response** (200 OK):
```json
{
  "success": true,
  "message": "URL deleted successfully"
}
```

**Errors**:
- `404 Not Found`: URL not found

**Example**:
```bash
curl -X DELETE http://localhost:3000/api/abc1234
```

**Note**: This endpoint should be protected in production (authentication required).

---

### 5. Health Check

Check the health status of the API.

**Endpoint**: `GET /api/health`

**Response** (200 OK):
```json
{
  "status": "healthy",
  "timestamp": "2025-12-18T00:00:00.000Z"
}
```

**Example**:
```bash
curl http://localhost:3000/api/health
```

---

## Error Responses

All errors follow this format:

```json
{
  "error": "Error message describing what went wrong"
}
```

### Common HTTP Status Codes

| Code | Meaning | Description |
|------|---------|-------------|
| 200 | OK | Request successful |
| 201 | Created | Resource created successfully |
| 301 | Moved Permanently | Redirect to original URL |
| 400 | Bad Request | Invalid request data |
| 404 | Not Found | Resource not found |
| 429 | Too Many Requests | Rate limit exceeded |
| 500 | Internal Server Error | Server error |

---

## Validation Rules

### URL Validation

- **Required**: Yes
- **Format**: Must be a valid URL with protocol
- **Protocols**: http, https only
- **Max Length**: 2048 characters

### Expiration Validation

- **Required**: No
- **Type**: Integer (seconds)
- **Min**: 60 seconds
- **Max**: 31,536,000 seconds (1 year)

---

## Rate Limiting

### Global Rate Limit

- **Window**: 15 minutes
- **Limit**: 100 requests

### URL Creation Rate Limit

- **Window**: 15 minutes
- **Limit**: 10 URLs

### Rate Limit Response

When rate limited:
```json
{
  "error": "Too many requests from this IP, please try again later."
}
```

---

## Caching

The API uses Redis caching with the following behavior:

- **Cache TTL**: 24 hours
- **Cache Key Format**: `short:{shortCode}`
- **Cache Invalidation**: Automatic on deletion

### Cache Headers

Cache status is not exposed in response headers but can be monitored server-side.

---

## Analytics

### Tracked Data

For each redirect, the following is recorded:
- IP address
- User agent
- Referrer
- Timestamp

### Privacy

- IP addresses are stored for analytics only
- No personally identifiable information (PII) is collected
- Analytics data is retained for 90 days (configurable)

---

## Code Examples

### JavaScript (Node.js)

```javascript
const axios = require('axios');

// Create short URL
async function createShortUrl(url) {
  try {
    const response = await axios.post('http://localhost:3000/api/shorten', {
      url: url
    });
    return response.data.data.shortUrl;
  } catch (error) {
    console.error('Error:', error.response.data);
  }
}

// Get analytics
async function getAnalytics(shortCode) {
  try {
    const response = await axios.get(`http://localhost:3000/api/analytics/${shortCode}`);
    return response.data.data;
  } catch (error) {
    console.error('Error:', error.response.data);
  }
}
```

### Python

```python
import requests

# Create short URL
def create_short_url(url):
    response = requests.post('http://localhost:3000/api/shorten', json={'url': url})
    if response.status_code == 201:
        return response.json()['data']['shortUrl']
    else:
        print('Error:', response.json())

# Get analytics
def get_analytics(short_code):
    response = requests.get(f'http://localhost:3000/api/analytics/{short_code}')
    if response.status_code == 200:
        return response.json()['data']
    else:
        print('Error:', response.json())
```

### cURL

```bash
# Create short URL
curl -X POST http://localhost:3000/api/shorten \
  -H "Content-Type: application/json" \
  -d '{"url": "https://example.com/long-url"}'

# Get analytics
curl http://localhost:3000/api/analytics/abc1234

# Delete URL
curl -X DELETE http://localhost:3000/api/abc1234

# Health check
curl http://localhost:3000/api/health
```

---

## WebSocket Support

Currently not supported. Future versions may include real-time analytics updates via WebSocket.

---

## Versioning

API version is not currently included in the URL. Breaking changes will be announced with migration guides.

---

## Support

For API issues or questions:
- Open an issue on GitHub
- Check the documentation
- Review system design docs

---

**Last Updated**: December 18, 2025
