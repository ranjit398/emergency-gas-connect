#!/bin/bash

# Emergency Gas Backend - Setup Script
# This script sets up the backend environment and prepares it for development

set -e

echo "=========================================="
echo "Emergency Gas Backend - Setup"
echo "=========================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check Node.js version
echo "Checking Node.js version..."
if ! command -v node &> /dev/null; then
    echo -e "${RED}✗ Node.js is not installed${NC}"
    exit 1
fi

NODE_VERSION=$(node -v)
echo -e "${GREEN}✓ Node.js ${NODE_VERSION}${NC}"

# Check npm version
echo "Checking npm version..."
NPM_VERSION=$(npm -v)
echo -e "${GREEN}✓ npm ${NPM_VERSION}${NC}"

# Install dependencies
echo ""
echo "Installing dependencies..."
npm install

# Setup environment file
if [ ! -f .env ]; then
    echo ""
    echo "Creating .env file from .env.example..."
    cp .env.example .env
    echo -e "${YELLOW}⚠ Please update .env with your configuration${NC}"
else
    echo -e "${GREEN}✓ .env file already exists${NC}"
fi

# Build TypeScript
echo ""
echo "Building TypeScript..."
npm run build
echo -e "${GREEN}✓ Build successful${NC}"

# Run linter
echo ""
echo "Running ESLint..."
npm run lint || true

echo ""
echo "=========================================="
echo "Setup Complete!"
echo "=========================================="
echo ""
echo "Next steps:"
echo "1. Update .env file with your configuration"
echo "2. Ensure MongoDB is running"
echo "3. Run 'npm run dev' to start development server"
echo ""
echo "MongoDB (if using Docker):"
echo "  docker-compose up -d mongodb"
echo ""
echo "Full stack (with Docker):"
echo "  docker-compose up"
echo ""
