#!/bin/bash

# Docker Build Script for Deployment
# This script builds Docker images without requiring Node.js
# Use this for deployment environments where Node.js might not be available

set -e  # Exit on any error

echo "🔨 Building MidnightOS Docker Images for Deployment..."
echo ""

# Check if .env files exist, warn if they don't
echo "📋 Checking environment files..."
missing_envs=()

if [ ! -f "platform/orchestrator/.env" ]; then
    missing_envs+=("platform/orchestrator/.env")
fi

if [ ! -f "services/midnight-mcp/.env" ]; then
    missing_envs+=("services/midnight-mcp/.env")
fi

if [ ! -f "platform/frontend/.env" ]; then
    missing_envs+=("platform/frontend/.env")
fi

if [ ! -f "services/eliza-agent/.env" ]; then
    missing_envs+=("services/eliza-agent/.env")
fi

if [ ${#missing_envs[@]} -gt 0 ]; then
    echo "⚠️  Missing environment files:"
    for env in "${missing_envs[@]}"; do
        echo "   - $env"
    done
    echo ""
    echo "   Please ensure these files exist before deployment."
    echo "   You can run 'node scripts/sync-env.js' locally to generate them."
    echo ""
    read -p "Continue anyway? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "❌ Build cancelled"
        exit 1
    fi
else
    echo "✅ All required .env files found"
fi

echo ""

# Build Docker images
echo "🐳 Building Docker images..."
cd docker
docker compose build

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Docker images built successfully!"
    echo ""
    echo "Images ready for deployment:"
    echo "  • midnightos-orchestrator"
    echo "  • midnightos-mcp"
    echo "  • midnightos-frontend"
    echo "  • midnightos-eliza-agent"
    echo ""
    echo "To start: docker compose up -d"
else
    echo "❌ Docker build failed!"
    exit 1
fi
