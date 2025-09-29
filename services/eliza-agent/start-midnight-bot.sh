#!/bin/bash

# Start script for Midnight-enabled Eliza bot
# This runs inside the Docker container where the app is already built

echo "Starting Midnight Bot with MCP integration..."

# Check if MCP server is accessible (it runs as a separate service)
MCP_URL=${WALLET_MCP_URL:-http://midnight-mcp:3001}
echo "Checking MCP server at $MCP_URL..."

for i in {1..30}; do
    if curl -s ${MCP_URL}/health > /dev/null 2>&1; then
        echo "✅ MCP server is ready!"
        break
    fi
    echo "Waiting for MCP server... (attempt $i/30)"
    sleep 2
done

# Set environment for Midnight bot
export BOT_TYPE=midnight

# The PORT should match what's in docker-compose
PORT=${PORT:-3003}
echo "Starting Eliza agent on port $PORT..."

# We're already in /app/services/eliza-agent (WORKDIR from Dockerfile)
# Start the Eliza agent using npm (elizaos is installed)
exec npm start