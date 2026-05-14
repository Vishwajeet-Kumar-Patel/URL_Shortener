# Docker Setup Guide

This guide provides instructions for running the Link Shortener application using Docker.

## Prerequisites

- Docker Desktop (or Docker Engine)
- Docker Compose version 3.8+
- Git

## Project Structure

```
linkshort/
├── apps/
│   ├── api/
│   │   └── Dockerfile          # API service Docker image
│   └── web/
│       └── Dockerfile          # Web service Docker image
├── docker-compose.yml          # Main compose file
├── docker-compose.dev.yml      # Development overrides
├── docker-compose.prod.yml     # Production overrides
├── .dockerignore                # Docker build context exclusions
├── .env.example                 # Environment variables template
└── Dockerfile.api              # Alternative root-level API Dockerfile
```

## Quick Start

### 1. Clone and Setup

```bash
git clone <repository-url>
cd linkshort
```

### 2. Configure Environment Variables

```bash
# Copy the example environment file
cp .env.example .env

# Edit .env with your actual values
# Required variables:
# - MONGO_USER, MONGO_PASSWORD
# - SMTP_HOST, SMTP_USER, SMTP_PASS, SMTP_FROM_EMAIL
# - SESSION_SECRET (min 32 characters)
# - GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_CALLBACK_URL
# - JWT_ACCESS_SECRET, JWT_REFRESH_SECRET (min 32 characters each)

nano .env
```

### 3. Start Services

#### Development Mode
```bash
docker-compose -f docker-compose.yml -f docker-compose.dev.yml up

# With hot reload enabled
# Logs will stream to console
```

#### Production Mode
```bash
# Create production environment file
cp .env.example .env.production
nano .env.production

# Start services
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose -f docker-compose.yml -f docker-compose.prod.yml down
```

## Environment Configuration

### Development (.env)
```env
MONGO_USER=root
MONGO_PASSWORD=root
MONGO_DB=linkshort
NODE_ENV=development
```

### Production (.env.production)
Must include:
- Strong `MONGO_PASSWORD` (use secrets manager in production)
- All OAuth and JWT secrets
- Valid email configuration
- Proper CORS origins
- Database URI with authentication

## Services

### MongoDB (Database)
- **Port**: 27017
- **Container**: linkshort-mongodb
- **Health Check**: Enabled (15s intervals)
- **Volumes**: 
  - `mongodb_data` - Database files
  - `mongodb_config` - Configuration

### API Service
- **Port**: 5000
- **Container**: linkshort-api
- **Health Check**: Enabled (30s intervals)
- **Dependencies**: MongoDB
- **Environment**: Loaded from `.env`

### Web Service (Next.js)
- **Port**: 3000
- **Container**: linkshort-web
- **Health Check**: Enabled (30s intervals)
- **Dependencies**: API service

## Building Images

### Build All Services
```bash
docker-compose build
```

### Build Specific Service
```bash
# Build API
docker-compose build api

# Build Web
docker-compose build web

# Build MongoDB
docker-compose build mongodb
```

### Build with No Cache
```bash
docker-compose build --no-cache
```

## Container Management

### Start Services
```bash
docker-compose up -d
```

### Stop Services
```bash
docker-compose down
```

### View Logs
```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f api
docker-compose logs -f web
docker-compose logs -f mongodb
```

### Check Service Status
```bash
docker-compose ps
```

### Execute Command in Container
```bash
# In API container
docker-compose exec api node dist/server.js

# In Web container
docker-compose exec web npm list

# In MongoDB container
docker-compose exec mongodb mongosh -u root -p
```

## Database Management

### Access MongoDB Shell
```bash
docker-compose exec mongodb mongosh -u root -p
```

### Backup Database
```bash
docker-compose exec mongodb mongodump --username root --password changeme --out /data/backup
```

### Restore Database
```bash
docker-compose exec mongodb mongorestore --username root --password changeme /data/backup
```

## Networking

Services are connected via bridge network `linkshort-network`:
- **API URL** (from web): `http://api:5000`
- **MongoDB URL** (from api): `mongodb://root:password@mongodb:27017/linkshort`
- **Web URL** (external): `http://localhost:3000`
- **API URL** (external): `http://localhost:5000`

## Resource Limits (Production Only)

Production compose includes CPU and memory limits:
- **API**: 1 CPU, 512MB RAM (limit), 0.5 CPU, 256MB RAM (reserved)
- **Web**: 1 CPU, 512MB RAM (limit), 0.5 CPU, 256MB RAM (reserved)
- **MongoDB**: No limits (adjust as needed)

## Health Checks

All services include health checks:
- **Interval**: 30 seconds
- **Timeout**: 10 seconds
- **Retries**: 3-5
- **Start Period**: 15-30 seconds

Services will automatically restart if health check fails.

## Troubleshooting

### Port Already in Use
```bash
# Find process using port
netstat -ano | findstr :5000

# Kill process
taskkill /PID <PID> /F
```

### MongoDB Connection Failed
```bash
# Check MongoDB status
docker-compose exec mongodb mongosh -u root -p

# Verify network
docker network inspect linkshort_linkshort-network
```

### API Service Won't Start
```bash
# Check logs
docker-compose logs api

# Verify environment variables
docker-compose config
```

### Build Failures
```bash
# Clean build
docker-compose down -v
docker system prune -a
docker-compose build --no-cache
```

## Production Deployment

### Using Docker Swarm
```bash
docker swarm init
docker stack deploy -c docker-compose.yml linkshort
```

### Using Kubernetes
Convert compose file using:
```bash
kompose convert -f docker-compose.yml -o k8s/
```

### Using a Reverse Proxy (Nginx)

Create `nginx.conf`:
```nginx
upstream api {
    server api:5000;
}

upstream web {
    server web:3000;
}

server {
    listen 80;
    server_name yourdomain.com;

    location /api {
        proxy_pass http://api;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location / {
        proxy_pass http://web;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

## Performance Optimization

### Image Size Optimization
- API Dockerfile uses multi-stage build (builder + runtime)
- Web Dockerfile uses multi-stage build
- Alpine Linux base images (~40MB vs 900MB+ standard)
- Production dependencies only in runtime

### Caching Strategies
- Layer ordering optimized for Docker cache
- Dependencies cached separately from code
- Avoid `RUN npm install` after code copy

### Security Best Practices
- Non-root user (nodejs:1001)
- Read-only root filesystem (optional)
- Health checks enabled
- No secrets in images (use environment variables)
- Regular image scanning

## Cleanup

### Remove Unused Images
```bash
docker image prune -a
```

### Remove Unused Containers
```bash
docker container prune
```

### Remove Unused Volumes
```bash
docker volume prune
```

### Complete Cleanup
```bash
docker system prune -a --volumes
```

## Additional Resources

- [Docker Official Documentation](https://docs.docker.com/)
- [Docker Compose Reference](https://docs.docker.com/compose/compose-file/)
- [Node.js Docker Best Practices](https://github.com/nodejs/docker-node/blob/main/docs/BestPractices.md)
- [Next.js Docker](https://nextjs.org/docs/deployment/docker)
