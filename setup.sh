#!/bin/bash

# Social Monitor - Setup Script

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

print_header() {
    echo ""
    echo -e "${CYAN}============================================${NC}"
    echo -e "${CYAN}       Social Monitor - Setup${NC}"
    echo -e "${CYAN}============================================${NC}"
    echo ""
}

print_step() {
    echo -e "${BLUE}[*]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[+]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[!]${NC} $1"
}

print_error() {
    echo -e "${RED}[x]${NC} $1"
}

print_header

# -------------------------------------------------------------------
# 1. Check prerequisites
# -------------------------------------------------------------------
print_step "Checking prerequisites..."

if ! command -v docker &> /dev/null; then
    print_error "Docker is not installed. Please install Docker first: https://docs.docker.com/get-docker/"
    exit 1
fi
print_success "Docker found."

if ! docker compose version &> /dev/null; then
    print_error "Docker Compose is not available. Please install Docker Compose: https://docs.docker.com/compose/install/"
    exit 1
fi
print_success "Docker Compose found."

# -------------------------------------------------------------------
# 2. Environment file
# -------------------------------------------------------------------
print_step "Configuring environment..."

if [ ! -f .env ]; then
    if [ ! -f .env.example ]; then
        print_error ".env.example not found. Cannot create .env file."
        exit 1
    fi
    cp .env.example .env
    print_success "Created .env from .env.example"
else
    print_warning ".env already exists, updating with your values."
fi

# -------------------------------------------------------------------
# 3. Prompt for configuration values
# -------------------------------------------------------------------
echo ""
echo -e "${CYAN}--- Configuration ---${NC}"
echo ""

read -rp "$(echo -e "${BLUE}Enter your Apify API token${NC} [leave blank to skip]: ")" APIFY_API_TOKEN
if [ -n "$APIFY_API_TOKEN" ]; then
    sed -i.bak "s|^APIFY_API_TOKEN=.*|APIFY_API_TOKEN=${APIFY_API_TOKEN}|" .env
    rm -f .env.bak
    print_success "APIFY_API_TOKEN set."
else
    print_warning "Skipping APIFY_API_TOKEN. You can set it later in the .env file."
fi

DEFAULT_ARCHIVE_PATH="$(pwd)/archive"
read -rp "$(echo -e "${BLUE}Enter archive host path${NC} [${DEFAULT_ARCHIVE_PATH}]: ")" ARCHIVE_HOST_PATH
ARCHIVE_HOST_PATH="${ARCHIVE_HOST_PATH:-$DEFAULT_ARCHIVE_PATH}"
sed -i.bak "s|^ARCHIVE_HOST_PATH=.*|ARCHIVE_HOST_PATH=${ARCHIVE_HOST_PATH}|" .env
rm -f .env.bak
print_success "ARCHIVE_HOST_PATH set to ${ARCHIVE_HOST_PATH}"

# -------------------------------------------------------------------
# 4. Create archive directory
# -------------------------------------------------------------------
if [ ! -d "$ARCHIVE_HOST_PATH" ]; then
    mkdir -p "$ARCHIVE_HOST_PATH"
    print_success "Created archive directory: ${ARCHIVE_HOST_PATH}"
else
    print_success "Archive directory already exists: ${ARCHIVE_HOST_PATH}"
fi

# -------------------------------------------------------------------
# 5. Build and start containers
# -------------------------------------------------------------------
echo ""
print_step "Building and starting containers..."
docker compose up --build -d

# -------------------------------------------------------------------
# 6. Wait for services to be healthy
# -------------------------------------------------------------------
print_step "Waiting for services to be healthy..."

MAX_RETRIES=30
RETRY_COUNT=0

while [ $RETRY_COUNT -lt $MAX_RETRIES ]; do
    HEALTH=$(docker compose ps --format json 2>/dev/null | grep -c '"Health":"healthy"' || true)
    RUNNING=$(docker compose ps --status running --format json 2>/dev/null | wc -l | tr -d ' ')

    if [ "$RUNNING" -gt 0 ]; then
        # Check if db is ready
        if docker compose exec db pg_isready -U social_monitor > /dev/null 2>&1; then
            print_success "All services are up and database is ready."
            break
        fi
    fi

    RETRY_COUNT=$((RETRY_COUNT + 1))
    if [ $RETRY_COUNT -eq $MAX_RETRIES ]; then
        print_error "Timed out waiting for services to be healthy."
        print_warning "Check service status with: docker compose ps"
        print_warning "Check logs with: docker compose logs"
        exit 1
    fi

    echo -ne "\r  Waiting... (${RETRY_COUNT}/${MAX_RETRIES})"
    sleep 2
done

# -------------------------------------------------------------------
# 7. Run database migrations
# -------------------------------------------------------------------
echo ""
print_step "Running database migrations..."
docker compose exec api alembic upgrade head
print_success "Migrations applied."

# -------------------------------------------------------------------
# 8. Done
# -------------------------------------------------------------------
echo ""
echo -e "${GREEN}============================================${NC}"
echo -e "${GREEN}       Setup Complete!${NC}"
echo -e "${GREEN}============================================${NC}"
echo ""
echo -e "  Access the application at: ${CYAN}http://localhost:3000${NC}"
echo ""
echo -e "  Useful commands:"
echo -e "    ${YELLOW}make logs${NC}       - View all logs"
echo -e "    ${YELLOW}make status${NC}     - Check service status"
echo -e "    ${YELLOW}make stop${NC}       - Stop all services"
echo -e "    ${YELLOW}make restart${NC}    - Restart all services"
echo ""
