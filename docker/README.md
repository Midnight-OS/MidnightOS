# MidnightOS Docker Deployment

## Quick Start

### Build All Services
```bash
# Build all services
docker compose -f docker/docker-compose.yml build

# Or build specific services
docker compose -f docker/docker-compose.yml build orchestrator
docker compose -f docker/docker-compose.yml build midnight-mcp
docker compose -f docker/docker-compose.yml build frontend
```

### Run Platform Services
```bash
# Start all platform services
docker compose -f docker/docker-compose.yml up

# Or start specific services
docker compose -f docker/docker-compose.yml up orchestrator midnight-mcp frontend proof-server
```

## Architecture

The platform consists of:
- **Orchestrator** (Port 3002): Manages user bot instances
- **Midnight MCP** (Port 3001): Blockchain wallet and DAO operations
- **Frontend** (Port 3000): Next.js web interface
- **Proof Server** (Port 6300): Required for Midnight blockchain operations
- **Eliza Agents**: Created per-user by the orchestrator

## User Bot Instances

Each user gets their own Eliza agent container:
- Isolated environment with own seed/wallet
- Connected to shared MCP service for blockchain operations
- Managed by the orchestrator service

### Create User Bot
```bash
# The orchestrator will automatically create containers when users register
# Container naming: eliza-agent-{userId}
```

## Environment Variables

Required environment variables:
```env
# Database
DATABASE_URL=your_database_url

# JWT Secret
JWT_SECRET=your_jwt_secret

# Supabase (for authentication)
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_supabase_anon_key

# Midnight Network
NETWORK_ID=TestNet
INDEXER=https://indexer.testnet-02.midnight.network/api/v1/graphql
INDEXER_WS=wss://indexer.testnet-02.midnight.network/api/v1/graphql/ws
MN_NODE=https://rpc.testnet-02.midnight.network
```

## Development Mode

For local development while Docker images are building:
```bash
# Start only the proof server in Docker
docker compose -f docker/docker-compose.yml up proof-server

# Run other services locally
cd services/midnight-mcp && bun run dev
cd platform/orchestrator && bun run dev
cd platform/frontend && bun run dev
```

## Troubleshooting

### Build Issues
- Ensure bun.lockb exists: `bun install`
- Clear Docker cache: `docker compose -f docker/docker-compose.yml build --no-cache`

### Runtime Issues
- Check logs: `docker compose -f docker/docker-compose.yml logs [service-name]`
- Verify network: `docker network ls | grep midnightos`
- Check volumes: `docker volume ls | grep midnightos`

## Resource Configuration

Default resource limits per user bot:
- CPU: 0.5 cores
- Memory: 512MB
- Can be adjusted via RESOURCE_TIER environment variable