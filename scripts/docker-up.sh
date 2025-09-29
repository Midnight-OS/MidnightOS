#!/bin/bash

# Docker Up Script with Environment Sync
# This script ensures environment variables are synced before starting Docker Compose

set -e  # Exit on any error

echo "🚀 Starting MidnightOS Docker Environment..."
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

# Step 2: Start Docker Compose
echo "🐳 Building and starting Docker Compose..."
cd docker
docker compose up -d --build

if [ $? -eq 0 ]; then
    echo ""
    echo "🎉 MidnightOS is now running!"
    echo ""
    echo "Services available at:"
    echo "  • Frontend: http://localhost:3003"
    echo "  • Orchestrator API: http://localhost:3002"
    echo "  • Midnight MCP: http://localhost:3001"
    echo "  • Eliza Agent: http://localhost:3000"
    echo "  • Proof Server: http://localhost:6300"
    echo ""
    echo "To view logs: docker compose logs -f"
    echo "To stop: docker compose down"
else
    echo "❌ Docker Compose failed to start!"
    exit 1
fi
