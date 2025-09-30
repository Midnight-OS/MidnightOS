# Quick Start Guide

Get MidnightOS running locally in 5 minutes with this comprehensive setup guide.

## Prerequisites

Before starting, ensure you have the following installed:

- **Node.js v20+** - [Download from nodejs.org](https://nodejs.org/)
- **pnpm v10+** - Install with `npm install -g pnpm`
- **Docker & Docker Compose** - [Download from docker.com](https://docker.com/)
- **PostgreSQL** - Required for the orchestrator database
- **Git** - For cloning the repository

## System Architecture Overview

```mermaid
graph TB
    subgraph "Development Environment"
        subgraph "Frontend Layer"
            UI["Web Dashboard<br/>Next.js<br/>Port 3003"]
        end
        
        subgraph "API Layer"
            API["Orchestrator API<br/>Express.js<br/>Port 3002"]
            DB[(PostgreSQL<br/>Database)]
            API --> DB
        end
        
        subgraph "AI Layer"
            ELIZA["Shared Eliza Service<br/>ElizaOS Framework<br/>Port 3004"]
            TENANTS["Multi-tenant<br/>Bot Management"]
            ELIZA --> TENANTS
        end
        
        subgraph "Blockchain Layer"
            MCP["Midnight MCP Server<br/>Port 3001"]
            WALLET["Wallet Management"]
            ZK["Zero-Knowledge<br/>Proofs"]
            MCP --> WALLET
            MCP --> ZK
        end
        
        subgraph "External Services"
            MIDNIGHT["Midnight Blockchain<br/>Testnet"]
            INDEXER["Blockchain Indexer<br/>GraphQL API"]
        end
    end
    
    UI <--> API
    API <--> ELIZA
    ELIZA <--> MCP
    MCP <--> MIDNIGHT
    MCP <--> INDEXER
    
    style UI fill:#e1f5fe
    style API fill:#e8f5e9
    style ELIZA fill:#fff3e0
    style MCP fill:#f3e5f5
    style MIDNIGHT fill:#e0f2f1
```

## Installation Steps

### Step 1: Clone and Setup Repository

```bash
# Clone the repository
git clone https://github.com/your-org/MidnightOS.git
cd MidnightOS

# Install all dependencies
pnpm install
```

### Step 2: Environment Configuration

MidnightOS uses environment synchronization for consistent configuration across services.

```bash
# Copy and sync environment variables
pnpm env:sync
```

This command will:
- Copy `.env.example` files to `.env` in all services
- Generate secure JWT secrets
- Configure database connections
- Set up blockchain network endpoints

#### Manual Environment Setup (Alternative)

If `env:sync` is not available, configure each service manually:

**1. Midnight MCP Service**
```bash
cd services/midnight-mcp
cp .env.example .env
```

Edit `services/midnight-mcp/.env`:
```env
# Midnight Network Configuration
MIDNIGHT_RPC_URL=https://rpc.testnet-02.midnight.network
MIDNIGHT_INDEXER_URL=https://indexer.testnet-02.midnight.network/api/v1/graphql
MCP_SERVER_PORT=3001

# Wallet Configuration
WALLET_SEED_PHRASE="your wallet seed phrase here"
ENABLE_WALLET_CREATION=true

# Logging
LOG_LEVEL=info
```

**2. Orchestrator API**
```bash
cd platform/orchestrator
cp .env.example .env
```

Edit `platform/orchestrator/.env`:
```env
# Database Configuration
DATABASE_URL="postgresql://midnightos:password@localhost:5432/midnightos"

# API Configuration
PORT=3002
JWT_SECRET="your-super-secure-jwt-secret-here"

# External Services
SHARED_ELIZA_URL=http://localhost:3004
MIDNIGHT_MCP_URL=http://localhost:3001

# Development
NODE_ENV=development
```

**3. Frontend Application**
```bash
cd platform/frontend
cp .env.example .env.local
```

Edit `platform/frontend/.env.local`:
```env
# API Configuration
NEXT_PUBLIC_API_URL=http://localhost:3002

# Development
NODE_ENV=development
```

### Step 3: Database Setup

Initialize the PostgreSQL database for the orchestrator:

```bash
# Navigate to orchestrator
cd platform/orchestrator

# Generate Prisma client
pnpm prisma generate

# Run database migrations
pnpm prisma migrate dev --name init

# Seed database with initial data (optional)
pnpm prisma db seed
```

### Step 4: Start Development Services

#### Option A: Start All Services at Once

```bash
# From root directory
pnpm dev
```

This starts all services in parallel using concurrently.

#### Option B: Start Services Individually

For debugging or development purposes, start each service in separate terminals:

**Terminal 1: Midnight MCP Service**
```bash
cd services/midnight-mcp
pnpm start
```

**Terminal 2: Shared Eliza Service**
```bash
cd services/eliza-agent
PORT=3004 WALLET_MCP_URL=http://localhost:3001 pnpm start:server
```

**Terminal 3: Orchestrator API**
```bash
cd platform/orchestrator
PORT=3002 pnpm tsx src/api.ts
```

**Terminal 4: Frontend Dashboard**
```bash
cd platform/frontend
PORT=3003 pnpm dev
```

### Step 5: Verify Installation

Once all services are running, verify the installation:

1. **Frontend Dashboard**: Open http://localhost:3003
2. **API Health Check**: GET http://localhost:3002/health
3. **Eliza Service**: GET http://localhost:3004/health
4. **MCP Service**: Check logs for "MCP server started on port 3001"

## Service Communication Flow

```mermaid
sequenceDiagram
    participant User
    participant Frontend
    participant Orchestrator
    participant Eliza
    participant MCP
    participant Blockchain
    
    User->>Frontend: Create Bot Request
    Frontend->>Orchestrator: POST /api/bots
    Orchestrator->>Eliza: Register Tenant
    Eliza->>MCP: Initialize Wallet
    MCP->>Blockchain: Create Wallet
    Blockchain-->>MCP: Wallet Address
    MCP-->>Eliza: Wallet Ready
    Eliza-->>Orchestrator: Tenant Registered
    Orchestrator-->>Frontend: Bot Created
    Frontend-->>User: Success Response
```

## Port Configuration

| Service | Port | Purpose | Health Check |
|---------|------|---------|--------------|
| Frontend | 3003 | Web Dashboard | http://localhost:3003 |
| Orchestrator | 3002 | API Server | http://localhost:3002/health |
| Shared Eliza | 3004 | AI Agent Service | http://localhost:3004/health |
| Midnight MCP | 3001 | Blockchain Service | Check logs |
| PostgreSQL | 5432 | Database | Connection test |

## Troubleshooting

### Common Issues

**1. Port Already in Use**
```bash
# Kill process on specific port
lsof -ti:3003 | xargs kill -9

# Or use different ports
PORT=3005 pnpm dev
```

**2. Database Connection Failed**
```bash
# Check PostgreSQL status
brew services list | grep postgresql

# Start PostgreSQL
brew services start postgresql

# Create database manually
createdb midnightos
```

**3. Environment Variables Missing**
```bash
# Re-run environment sync
pnpm env:sync

# Or manually check each .env file exists
ls -la services/*/
ls -la platform/*/
```

**4. Dependencies Issues**
```bash
# Clean install
rm -rf node_modules
rm pnpm-lock.yaml
pnpm install
```

**5. Eliza Service Connection Issues**
Check that the MCP service is running and accessible:
```bash
# Test MCP connection
curl http://localhost:3001/health

# Check Eliza logs for MCP connection errors
cd services/eliza-agent && pnpm logs
```

### Development Tips

1. **Hot Reload**: Frontend supports hot reload, but API changes require restart
2. **Database Reset**: Use `pnpm prisma migrate reset` to reset database
3. **Logs**: Each service logs to console, use separate terminals for easier debugging
4. **Environment**: Changes to `.env` files require service restart

## Next Steps

After successful installation:

1. Read the [Bot Builder Tutorial](bot-builder.md) to create your first bot
2. Configure [Treasury Setup](treasury.md) for DAO management
3. Follow the [Deployment Guide](deployment.md) for production deployment

## Development Scripts

```bash
# Development
pnpm dev                    # Start all services
pnpm dev:frontend          # Frontend only
pnpm dev:api               # API only
pnpm dev:eliza             # Eliza service only
pnpm dev:mcp               # MCP service only

# Building
pnpm build                 # Build all services
pnpm build:frontend        # Build frontend
pnpm build:api             # Build API

# Database
pnpm db:migrate            # Run migrations
pnpm db:reset              # Reset database
pnpm db:seed               # Seed database

# Testing
pnpm test                  # Run all tests
pnpm test:unit             # Unit tests only
pnpm test:integration      # Integration tests only

# Utilities
pnpm env:sync              # Sync environment files
pnpm clean                 # Clean build artifacts
pnpm typecheck             # Type checking
```