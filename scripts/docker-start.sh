#!/bin/bash

# Docker Start Script
# This script starts the pre-built Docker containers

set -e  # Exit on any error

echo "🚀 Starting MidnightOS Docker Environment..."
echo ""

# Start Docker Compose
echo "🐳 Starting Docker Compose..."
cd docker
docker compose up -d

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
    echo "To stop: pnpm docker:stop"
else
    echo "❌ Docker Compose failed to start!"
    exit 1
fi
