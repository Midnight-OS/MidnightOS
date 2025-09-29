#!/bin/bash

# Docker Down Script
echo "🛑 Stopping MidnightOS Docker Environment..."

cd docker
docker compose down

echo "✅ MidnightOS Docker environment stopped!"
