#!/bin/bash

# Docker Build Script with Environment Sync
# This script syncs environment variables and builds Docker images

set -e  # Exit on any error

echo "🔨 Building MidnightOS Docker Images..."
echo ""

# Step 1: Sync environment variables (if Node.js is available)
echo "📋 Syncing environment variables..."
if command -v node >/dev/null 2>&1; then
    node scripts/sync-env.js
    if [ $? -ne 0 ]; then
        echo "❌ Environment sync failed!"
        exit 1
    fi
    echo "✅ Environment sync complete!"
else
    echo "⚠️  Node.js not found, skipping environment sync"
    echo "   Make sure .env files are manually configured for deployment"
fi
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
