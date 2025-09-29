# Environment Variable Management System

## Overview

MidnightOS uses a centralized environment variable management system that synchronizes configuration across all services, both for local development and Docker deployments.

## How It Works

### 1. Source of Truth
The root `.env` file serves as the single source of truth for all environment variables.

### 2. Automatic Synchronization
The `scripts/sync-env.js` script automatically:
- Reads variables from the root `.env`
- Transforms and maps them to each service
- Validates required vs optional variables
- Creates service-specific `.env` files

### 3. Service Mappings
Each service receives only the variables it needs:
- **Orchestrator**: Database, JWT, API keys
- **Frontend**: Public API URLs, Supabase config
- **Midnight MCP**: Database, Midnight Network config
- **Eliza Agent**: AI keys, MCP URL, model configs
- **Docker**: All variables for docker-compose

## Docker Integration

### Build Time
During Docker builds:
1. Dockerfiles copy the `scripts` directory
2. `pnpm install` runs the postinstall script
3. `sync-env.js --check` validates environments

### Runtime
For Docker runtime:
1. `docker/.env` is created with all necessary variables
2. `docker-compose.yml` uses `env_file: - .env` to load variables
3. Services receive both file-based and inline environment variables

### Docker Workflow
```bash
# 1. Edit root .env file
vim .env

# 2. Sync to all services including Docker
pnpm env:sync

# 3. Build Docker images (they'll have correct env)
docker compose -f docker/docker-compose.yml build

# 4. Run with Docker (uses docker/.env)
docker compose -f docker/docker-compose.yml up
```

## Commands

### Sync environments
```bash
pnpm env:sync
```

### Dry run (preview changes)
```bash
pnpm env:check
```

### Validate configuration
```bash
pnpm env:validate
```

### Verbose output
```bash
pnpm env:sync:verbose
```

## Environment Files Structure

```
MidnightOS/
├── .env                           # Root - source of truth
├── docker/
│   └── .env                      # Docker compose variables
├── platform/
│   ├── orchestrator/
│   │   └── .env                  # Orchestrator service
│   └── frontend/
│       └── .env                  # Frontend service
└── services/
    ├── eliza-agent/
    │   └── .env                  # Eliza AI agent
    └── midnight-mcp/
        └── .env                  # Midnight blockchain service
```

## Docker Compose Usage

The `docker-compose.yml` file uses environment variables in two ways:

1. **File-based** (`env_file`): Loads all variables from `docker/.env`
2. **Inline** (`environment`): Overrides or adds specific variables

Example:
```yaml
services:
  orchestrator:
    env_file:
      - .env  # Loads docker/.env
    environment:
      - NODE_ENV=production  # Override
      - DATABASE_URL=${DATABASE_URL:-default}  # Use from .env or default
```

## Benefits

1. **Single Source of Truth**: Edit one file, update everywhere
2. **Consistency**: All services use the same values
3. **Security**: Services only get variables they need
4. **Docker Support**: Seamless integration with containerization
5. **Validation**: Checks for missing required variables
6. **Flexibility**: Different configs for local vs Docker

## Adding New Variables

To add a new environment variable:

1. Add to root `.env`:
```env
MY_NEW_VAR=value
```

2. Update `scripts/sync-env.js` to map it:
```javascript
'platform/orchestrator/.env': {
  transform: (rootEnv) => ({
    // ... existing mappings
    MY_NEW_VAR: rootEnv.MY_NEW_VAR || 'default',
  })
}
```

3. Run sync:
```bash
pnpm env:sync
```

4. For Docker, also update the docker mapping:
```javascript
'docker/.env': {
  transform: (rootEnv) => ({
    // ... existing mappings
    MY_NEW_VAR: rootEnv.MY_NEW_VAR || 'default',
  })
}
```

## Troubleshooting

### Docker builds failing with "MODULE_NOT_FOUND"
Ensure Dockerfiles copy the scripts directory:
```dockerfile
COPY scripts ./scripts/
```

### Variables not appearing in Docker containers
1. Run `pnpm env:sync` to update `docker/.env`
2. Ensure service has `env_file: - .env` in docker-compose.yml
3. Rebuild containers: `docker compose build --no-cache`

### Validation errors
Run `pnpm env:validate` to check which variables are missing