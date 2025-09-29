#!/bin/bash

# Docker Build Script with Environment Sync
# This script syncs environment variables and builds Docker images

set -e  # Exit on any error

echo "🔨 Building MidnightOS Docker Images..."
echo ""

# Step 1: Sync environment variables
echo "📋 Syncing environment variables..."
node scripts/sync-env.js

if [ $? -ne 0 ]; then
    echo "❌ Environment sync failed!"
    exit 1
fi

echo "✅ Environment sync complete!"
echo ""

# Step 2: Build Docker images
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
    echo "To start: pnpm docker:start"
    echo "To deploy: pnpm docker:deploy"
else
    echo "❌ Docker build failed!"
    exit 1
fi
