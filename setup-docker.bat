@echo off
REM Quick start script for Link Shortener Docker setup (Windows)

setlocal enabledelayedexpansion

echo.
echo ==========================================
echo Link Shortener - Docker Setup
echo ==========================================
echo.

REM Check if Docker is installed
where docker >nul 2>nul
if %errorlevel% neq 0 (
    echo ❌ Docker is not installed. Please install Docker Desktop first.
    echo    Download from: https://www.docker.com/products/docker-desktop
    exit /b 1
)

REM Get Docker version
for /f "tokens=*" %%i in ('docker --version') do set DOCKER_VERSION=%%i
echo ✓ %DOCKER_VERSION%

REM Check if Docker Compose is installed
where docker-compose >nul 2>nul
if %errorlevel% neq 0 (
    echo ❌ Docker Compose is not installed. Please install it first.
    exit /b 1
)

for /f "tokens=*" %%i in ('docker-compose --version') do set COMPOSE_VERSION=%%i
echo ✓ %COMPOSE_VERSION%
echo.

REM Check if .env exists
if not exist ".env" (
    echo 📝 Creating .env file from .env.example...
    copy .env.example .env
    echo ✓ .env created
    echo.
    echo ⚠️  Please edit .env with your actual configuration:
    echo    - MONGO_PASSWORD
    echo    - SMTP_HOST, SMTP_USER, SMTP_PASS, SMTP_FROM_EMAIL
    echo    - SESSION_SECRET, JWT_ACCESS_SECRET, JWT_REFRESH_SECRET
    echo    - GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_CALLBACK_URL
    echo    - Other OAuth and service credentials
    echo.
    pause
)

REM Validate docker-compose file
echo 🔍 Validating docker-compose configuration...
docker-compose config >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Configuration is invalid
    exit /b 1
)
echo ✓ Configuration is valid
echo.

REM Ask for environment
echo Select environment:
echo 1) Development (with hot reload)
echo 2) Production (optimized)
set /p env_choice="Enter choice (1 or 2): "

if "%env_choice%"=="1" (
    echo.
    echo 🚀 Starting development environment...
    echo This will enable hot reload for code changes
    echo.
    docker-compose -f docker-compose.yml -f docker-compose.dev.yml up
) else if "%env_choice%"=="2" (
    echo.
    echo 🚀 Starting production environment...
    docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d
    echo.
    echo ✓ Services started in background
    echo.
    echo View logs with:
    echo   docker-compose logs -f
    echo.
    echo Stop services with:
    echo   docker-compose down
) else (
    echo ❌ Invalid choice
    exit /b 1
)

echo.
echo ==========================================
echo Setup Complete!
echo ==========================================
