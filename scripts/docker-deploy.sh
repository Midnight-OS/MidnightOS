#!/bin/bash

# Docker Deploy Script
# This script builds and starts everything (for development)
# For production, use docker:build and docker:start separately

set -e  # Exit on any error

echo "🚀 Deploying MidnightOS (Build + Start)..."
echo ""

# Step 1: Build
echo "🔨 Building images..."
./scripts/docker-build.sh

if [ $? -ne 0 ]; then
    echo "❌ Build failed!"
    exit 1
fi

echo ""
echo "✅ Build complete! Starting services..."
echo ""

# Step 2: Start
./scripts/docker-start.sh
