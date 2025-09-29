# MidnightOS Setup Script Architecture Fix

## Overview
This document explains the architectural fixes applied to the MidnightOS setup script to align with the actual platform architecture.

## Architecture Understanding

### Platform Services (Shared Infrastructure)
These are the core services that run as platform infrastructure:

- **Orchestrator API** (port 3002) - Manages user accounts, bot creation, and user container lifecycle
- **Midnight MCP** (port 3001) - Shared blockchain wallet/operations service  
- **Frontend** (port 3000) - Web UI for the platform
- **Proof Server** (port 6300) - Midnight blockchain proofs (Docker only)

### User Services (Dynamic)
These are created dynamically by the orchestrator:

- **Eliza Agent containers** - AI bots with user-specific configuration
- Each user gets isolated storage, logs, and configuration
- Managed entirely by the orchestrator API, not by setup scripts

## Key Fixes Applied

### 1. Environment Strategy
**Before:** Setup script created individual .env files for each service
**After:** Only manages the root .env file used by Docker Compose

- Root .env is for Docker Compose platform services
- User containers get environment injected by orchestrator
- No individual service .env files needed

### 2. Build Process
**Before:** Built all services including Eliza agents
**After:** Only builds platform services (orchestrator, frontend)

- MCP and Eliza are built by Docker when needed
- Removed redundant build steps
- Faster setup process

### 3. Service Startup
**Before:** Tried to start user services directly
**After:** Only starts platform services

- Docker mode: `docker-compose up` for platform services
- Local mode: Runs orchestrator, MCP, and frontend only
- User services managed by orchestrator API, not setup script

### 4. Database Setup
**Before:** Incomplete database initialization
**After:** Proper database setup with:

- Prisma client generation
- Database schema push
- Connection verification

### 5. Dependency Management
**Before:** Installed dependencies for all services unnecessarily
**After:** Strategic dependency installation:

- Always: Root, orchestrator, frontend
- Local mode only: MCP (since Docker builds handle this)
- Never: Eliza (managed by orchestrator)

## Usage

### Local Development
```bash
./setup.sh setup local    # Set up platform services
./setup.sh start local    # Start platform services
```

### Docker Development  
```bash
./setup.sh setup docker   # Set up platform services
./setup.sh start docker   # Start platform services with Docker
./setup.sh stop docker    # Stop Docker services
```

### Package.json Scripts
Updated to align with new architecture:

```bash
npm run setup:local       # Equivalent to ./setup.sh setup local
npm run start:local       # Equivalent to ./setup.sh start local
npm run setup:docker      # Equivalent to ./setup.sh setup docker
npm run start:docker      # Equivalent to ./setup.sh start docker
```

## Benefits

1. **Correct Architecture Understanding**: Setup script now matches actual system design
2. **Faster Setup**: Only builds and manages necessary platform services
3. **Clear Separation**: Platform vs user services are properly distinguished
4. **Better Maintenance**: Reduced complexity and fewer moving parts
5. **Proper Environment Management**: Single source of truth for platform configuration

## User Bot Management

User bots are NOT managed by this setup script. They are:

- Created via the orchestrator API endpoints
- Managed through the web frontend
- Dynamically spawned as Docker containers
- Isolated with user-specific storage and configuration

This separation allows for:
- Multi-tenancy
- Isolated user environments  
- Dynamic scaling
- Proper resource management