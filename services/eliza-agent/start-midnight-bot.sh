#!/bin/bash

# Start script for Midnight-enabled Eliza bot
# This ensures MCP server is running before starting the bot

echo "Starting Midnight Bot with MCP integration..."

# Check if MCP server is running
if ! curl -s http://localhost:3456/health > /dev/null 2>&1; then
    echo "MCP server not running. Starting it now..."
    cd ../midnight-mcp
    pnpm start &
    MCP_PID=$!
    
    # Wait for MCP server to be ready
    echo "Waiting for MCP server to start..."
    for i in {1..30}; do
        if curl -s http://localhost:3456/health > /dev/null 2>&1; then
            echo "MCP server is ready!"
            break
        fi
        sleep 1
    done
fi

# Set environment for Midnight bot
export BOT_TYPE=midnight

# Start the Eliza agent
cd Eliza-Base-Agent
pnpm dev

# If we started MCP, stop it on exit
if [ ! -z "$MCP_PID" ]; then
    kill $MCP_PID
fi