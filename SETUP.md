# MidnightOS Setup Guide - PostgreSQL with Prisma

## Overview
MidnightOS has been refactored to use PostgreSQL (Supabase) with Prisma ORM instead of SQLite/better-sqlite3.

## Prerequisites
- Docker and Docker Compose installed
- Node.js 22.15.1 or higher
- pnpm package manager
- PostgreSQL database (using Supabase)

## Database Configuration

The platform is configured to use your Supabase PostgreSQL instance:
- Database URL is configured in `.env` files for each service
- Connection uses PgBouncer for connection pooling
- SSL is enabled for secure connections

## Setup Instructions

### 1. Install Dependencies and Setup Prisma

Run the setup script to install dependencies and configure Prisma:

```bash
./setup-prisma.sh
```

This script will:
- Install Prisma and @prisma/client for both services
- Generate Prisma clients
- Push database schemas to PostgreSQL

### 2. Build Docker Images

Build all Docker images with the provided script:

```bash
./build-docker.sh
```

This will build:
- `midnightos-orchestrator:latest` - Platform orchestrator
- `midnightos-mcp:latest` - Midnight MCP wallet service  
- `midnightos-frontend:latest` - Next.js frontend
- `midnightos-eliza:latest` - Eliza AI agent

### 3. Run Services

#### Using Docker Compose (Recommended)

```bash
docker-compose up -d
```

This starts all services in detached mode with:
- Orchestrator on port 3002
- MCP Service on port 3001
- Frontend on port 3000
- Eliza Agent on port 3003

#### Using Local Development

```bash
./start-all.sh
```

## Database Schemas

### Orchestrator Database (`platform/orchestrator/prisma/schema.prisma`)
- **Users**: User accounts with authentication
- **Bots**: Bot configurations and settings
- **CommandLogs**: Bot command execution logs
- **ApiKeys**: API key management

### MCP Service Database (`services/midnight-mcp/prisma/schema.prisma`)
- **Tokens**: Token registry for Midnight Network

## Environment Variables

### Orchestrator (.env)
```env
DATABASE_URL="postgres://..."
JWT_SECRET="your-secret-key-here"
NODE_ENV="development"
PORT=3002
```

### MCP Service (.env)
```env
DATABASE_URL="postgres://..."
NODE_ENV="development"
PORT=3001
```

## Troubleshooting

### If pnpm install hangs:
```bash
# Clean pnpm store and retry
pnpm store prune
rm -rf node_modules
pnpm install
```

### If Prisma commands fail:
```bash
# Generate Prisma client manually
cd platform/orchestrator
npx prisma generate
npx prisma db push

cd ../../services/midnight-mcp
npx prisma generate  
npx prisma db push
```

### If Docker build fails:
```bash
# Build images individually
docker build -t midnightos-orchestrator:latest -f docker/Dockerfile.orchestrator .
docker build -t midnightos-mcp:latest -f docker/Dockerfile.midnight-mcp .
```

## What Changed

### Removed Dependencies:
- better-sqlite3
- sqlite3
- @types/better-sqlite3

### Added Dependencies:
- @prisma/client
- prisma (dev dependency)

### Modified Files:
- Database services refactored to use Prisma
- Dockerfiles updated to remove SQLite dependencies
- Docker Compose configuration simplified
- Package.json files updated

## Next Steps

After successful setup:
1. Access the frontend at http://localhost:3000
2. The API is available at http://localhost:3002
3. MCP service runs on http://localhost:3001

## Support

For issues or questions, please check the logs:
```bash
# View all service logs
docker-compose logs -f

# View specific service
docker-compose logs -f orchestrator
docker-compose logs -f mcp
```