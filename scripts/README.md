# Scripts Reference

This directory contains utility scripts for managing MidnightOS deployment, configuration, and operations.

## Overview

The scripts are organized into three categories:

1. **Docker Management** - Build, deploy, and manage Docker containers
2. **Network Configuration** - Switch between Midnight network modes
3. **Environment Management** - Sync and validate environment variables

## Docker Management Scripts

### docker-up.sh

**Purpose**: Start the complete MidnightOS platform using Docker Compose with environment synchronization.

**Usage**:
```bash
./scripts/docker-up.sh
```

**What it does**:
1. Syncs environment variables to all services
2. Builds Docker images for all services
3. Starts all containers in detached mode
4. Displays service URLs and status

**Services started**:
- Frontend (port 3000)
- Orchestrator API (port 3002)
- Midnight MCP (port 3001)
- Eliza Agent (port 3004)
- Proof Server (port 6300)

**Common issues**:
- If containers fail to start, check logs: `docker compose logs -f`
- Ensure ports are not in use by other applications
- Verify .env file exists and is properly configured

---

### docker-down.sh

**Purpose**: Stop and remove all MidnightOS Docker containers.

**Usage**:
```bash
./scripts/docker-down.sh
```

**What it does**:
1. Stops all running containers
2. Removes containers (data volumes are preserved)
3. Cleans up networks

**Options**:
- Add `--volumes` flag to also remove data volumes (destructive)

---

### docker-build.sh

**Purpose**: Build Docker images for all services without starting them.

**Usage**:
```bash
./scripts/docker-build.sh
```

**What it does**:
1. Syncs environment variables
2. Builds all service images
3. Tags images with latest version

**Use cases**:
- Pre-build images before deployment
- Verify builds succeed before starting services
- Update images after code changes

---

### docker-deploy.sh

**Purpose**: Deploy updated services to running Docker environment.

**Usage**:
```bash
./scripts/docker-deploy.sh [service-name]
```

**Examples**:
```bash
# Deploy all services
./scripts/docker-deploy.sh

# Deploy specific service
./scripts/docker-deploy.sh orchestrator
./scripts/docker-deploy.sh frontend
```

**What it does**:
1. Rebuilds specified service images
2. Recreates and restarts containers
3. Preserves data and configuration

---

### docker-start.sh

**Purpose**: Start previously built containers without rebuilding.

**Usage**:
```bash
./scripts/docker-start.sh
```

**What it does**:
- Starts existing containers in detached mode
- Faster than `docker-up.sh` since it skips building

**Use case**: Restart services after using `docker-down.sh`

---

### docker-build-deploy.sh

**Purpose**: Combined build and deployment in one command.

**Usage**:
```bash
./scripts/docker-build-deploy.sh
```

**What it does**:
1. Syncs environment
2. Builds images
3. Deploys to Docker
4. Verifies services are running

**Use case**: Complete deployment pipeline in CI/CD or production updates

---

## Network Configuration Scripts

### switch-to-testnet.sh

**Purpose**: Configure MidnightOS to use Midnight TestNet.

**Usage**:
```bash
./scripts/switch-to-testnet.sh
```

**What it does**:
1. Updates NETWORK_ID to "TestNet"
2. Sets TestNet RPC endpoints:
   - Indexer: `https://indexer.testnet-02.midnight.network`
   - Node: `https://rpc.testnet-02.midnight.network`
3. Updates admin address for TestNet
4. Syncs configuration to all services

**Requirements**:
- TestNet proof server access (contact Midnight Labs)
- Valid TestNet wallet address
- Network connectivity to TestNet endpoints

**Important notes**:
- Default Docker proof server runs in "Undeployed" mode
- May encounter "Bad Request" errors without TestNet proof server
- Consider using standalone mode for development

---

### switch-to-standalone.sh

**Purpose**: Configure MidnightOS for self-hosted standalone deployment.

**Usage**:
```bash
./scripts/switch-to-standalone.sh
```

**What it does**:
1. Sets NETWORK_ID to "Undeployed"
2. Configures local proof server (port 6300)
3. Sets up local indexer and node endpoints
4. Syncs configuration

**Use cases**:
- Local development and testing
- Air-gapped deployments
- Private infrastructure deployment

**Advantages**:
- No external dependencies
- Full control over infrastructure
- Faster iteration during development

---

## Environment Management Scripts

### sync-env.js

**Purpose**: Synchronize environment variables from root .env to all service-specific .env files.

**Usage**:
```bash
# Sync all services
node scripts/sync-env.js

# Dry run (show changes without applying)
node scripts/sync-env.js --check

# Verbose output
node scripts/sync-env.js --verbose
```

**What it does**:
1. Reads root .env file
2. Identifies required variables for each service
3. Updates service-specific .env files
4. Validates variable formats and values
5. Reports changes and errors

**Service configurations**:
- `platform/orchestrator/.env` - API and database settings
- `platform/frontend/.env` - Frontend configuration
- `services/eliza-agent/.env` - AI service settings
- `services/midnight-mcp/.env` - Blockchain settings

**Environment variable categories**:

**Database**:
- `DATABASE_URL` - PostgreSQL connection string
- `DIRECT_URL` - Direct database connection

**API Keys**:
- `OPENAI_API_KEY` - OpenAI API access
- `ANTHROPIC_API_KEY` - Anthropic API access

**Midnight Network**:
- `NETWORK_ID` - Network mode (Undeployed/TestNet)
- `INDEXER` - Blockchain indexer endpoint
- `INDEXER_WS` - WebSocket indexer endpoint
- `MN_NODE` - Midnight node RPC endpoint
- `MIDNIGHT_PROOF_SERVER_URL` - Proof server location

**Security**:
- `JWT_SECRET` - Authentication token signing key
- `ADMIN_SEED` - Admin wallet seed (keep secure)
- `ADMIN_ADDRESS` - Admin wallet address

**Common issues**:
- Missing required variables: Add to root .env
- Invalid formats: Check documentation for correct format
- Sync failures: Ensure file permissions allow writing

---

## Script Execution Order

### Initial Setup
```bash
1. Configure root .env file
2. ./scripts/sync-env.js
3. ./scripts/docker-up.sh
```

### Development Workflow
```bash
# Make code changes
1. ./scripts/docker-build.sh
2. ./scripts/docker-deploy.sh [service]
3. docker compose logs -f [service]
```

### Network Switching
```bash
# Switch to TestNet
1. ./scripts/switch-to-testnet.sh
2. ./scripts/docker-down.sh
3. ./scripts/docker-up.sh

# Switch back to standalone
1. ./scripts/switch-to-standalone.sh
2. ./scripts/docker-down.sh
3. ./scripts/docker-up.sh
```

### Production Deployment
```bash
1. Configure production .env
2. ./scripts/sync-env.js --check
3. ./scripts/sync-env.js
4. ./scripts/docker-build-deploy.sh
5. Verify services are healthy
```

---

## Troubleshooting

### Script fails with permission error
```bash
# Make scripts executable
chmod +x scripts/*.sh
```

### Environment sync fails
```bash
# Check root .env exists
ls -la .env

# Run in verbose mode to see errors
node scripts/sync-env.js --verbose
```

### Docker commands fail
```bash
# Ensure Docker daemon is running
docker ps

# Check Docker Compose is installed
docker compose version

# Verify docker directory exists
ls -la docker/
```

### Services won't start after sync
```bash
# Check for syntax errors in .env files
cat platform/orchestrator/.env

# Verify all required variables are set
node scripts/sync-env.js --check

# Check Docker logs for startup errors
docker compose logs
```

---

## Best Practices

1. **Always sync environment before deployment**
   ```bash
   node scripts/sync-env.js && ./scripts/docker-up.sh
   ```

2. **Use check mode before production changes**
   ```bash
   node scripts/sync-env.js --check
   ```

3. **Keep backups of .env files**
   ```bash
   cp .env .env.backup
   ```

4. **Use version control for script changes**
   - All scripts are tracked in git
   - Document changes in commit messages

5. **Test network switches in development first**
   - Verify connectivity before switching production

## Advanced Usage

### Custom Docker Compose Files

Scripts support custom compose files via COMPOSE_FILE environment variable:

```bash
export COMPOSE_FILE=docker/docker-compose.custom.yml
./scripts/docker-up.sh
```

### Partial Service Deployment

Deploy specific services without restarting others:

```bash
# Only rebuild and restart orchestrator
cd docker && docker compose up -d --build --no-deps orchestrator
```

### Environment Variable Override

Override specific variables without modifying .env:

```bash
export NETWORK_ID=TestNet
./scripts/docker-up.sh
```

---

## Related Documentation

- [Environment Sync Documentation](../docs/ENVIRONMENT_SYNC.md)
- [Deployment Guide](../docs/deployment.md)
- [Troubleshooting Guide](../docs/troubleshooting.md)
- [Architecture Overview](../docs/architecture.md)

---

**Maintained by**: MidnightOS Development Team  
**Last Updated**: September 2025  
**Script Version**: 1.0.0


