#!/bin/bash
# Quick start script for Link Shortener Docker setup

set -e

echo "=========================================="
echo "Link Shortener - Docker Setup"
echo "=========================================="
echo ""

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed. Please install Docker first."
    exit 1
fi

echo "✓ Docker found: $(docker --version)"

# Check if Docker Compose is installed
if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose is not installed. Please install Docker Compose first."
    exit 1
fi

echo "✓ Docker Compose found: $(docker-compose --version)"
echo ""

# Check if .env exists
if [ ! -f .env ]; then
    echo "📝 Creating .env file from .env.example..."
    cp .env.example .env
    echo "✓ .env created"
    echo ""
    echo "⚠️  Please edit .env with your actual configuration:"
    echo "   - MONGO_PASSWORD"
    echo "   - SMTP_HOST, SMTP_USER, SMTP_PASS, SMTP_FROM_EMAIL"
    echo "   - SESSION_SECRET, JWT_ACCESS_SECRET, JWT_REFRESH_SECRET"
    echo "   - GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_CALLBACK_URL"
    echo "   - Other OAuth and service credentials"
    echo ""
    read -p "Press Enter after updating .env..."
fi

# Validate docker-compose file
echo "🔍 Validating docker-compose configuration..."
if docker-compose config > /dev/null 2>&1; then
    echo "✓ Configuration is valid"
else
    echo "❌ Configuration is invalid"
    exit 1
fi
echo ""

# Ask for environment
echo "Select environment:"
echo "1) Development (with hot reload)"
echo "2) Production (optimized)"
read -p "Enter choice (1 or 2): " env_choice

case $env_choice in
    1)
        echo ""
        echo "🚀 Starting development environment..."
        echo "This will enable hot reload for code changes"
        echo ""
        docker-compose -f docker-compose.yml -f docker-compose.dev.yml up
        ;;
    2)
        echo ""
        echo "🚀 Starting production environment..."
        docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d
        echo ""
        echo "✓ Services started in background"
        echo ""
        echo "View logs with:"
        echo "  docker-compose logs -f"
        echo ""
        echo "Stop services with:"
        echo "  docker-compose down"
        ;;
    *)
        echo "❌ Invalid choice"
        exit 1
        ;;
esac

echo ""
echo "=========================================="
echo "Setup Complete!"
echo "=========================================="
