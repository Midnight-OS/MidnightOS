# MidnightOS Project Structure

## Clean Architecture

```
MidnightOS/
├── services/                    # Core Services
│   ├── midnight-mcp/            # Blockchain wallet & treasury management
│   │   ├── src/                 # Source code
│   │   ├── dist/                # Built JavaScript (generated)
│   │   └── package.json         # Dependencies
│   │
│   └── eliza-agent/             # AI agent framework
│       ├── src/                 # Agent code
│       └── package.json         # Dependencies
│
├── platform/                    # Platform Components
│   ├── orchestrator/            # API & Container Management (THIS IS THE API!)
│   │   ├── src/                 # TypeScript source
│   │   ├── dist/                # Built API (generated)
│   │   └── package.json         # Dependencies
│   │
│   └── frontend/                # React Dashboard
│       ├── src/                 # React components
│       ├── dist/                # Built app (generated)
│       └── package.json         # Dependencies
│
├── docker/                      # Container Configuration
│   ├── docker-compose.yml       # Main compose file
│   ├── Dockerfile.orchestrator  # API container
│   ├── Dockerfile.frontend      # Frontend container
│   └── nginx.conf              # Reverse proxy config
│
├── data/                        # Application Data (git-ignored)
│   └── .gitkeep                 # Placeholder
│
├── logs/                        # Application Logs (git-ignored)
│   └── .gitkeep                 # Placeholder
│
├── user-data/                   # User Files (git-ignored)
│   └── .gitkeep                 # Placeholder
│
├── temp/                        # Temporary Files (git-ignored)
│   └── .gitkeep                 # Placeholder
│
├── .env.example                 # Environment template
├── .gitignore                   # Git ignore rules
├── package.json                 # Root package with scripts
├── README.md                    # Quick start guide
├── INTEGRATION_STATUS.md        # Full feature documentation
└── start.sh                     # Startup script
```

## What Each Directory Does

### `/services`
Core functionality that runs in containers:
- **midnight-mcp**: Handles all blockchain operations, wallet management, DAO treasury
- **eliza-agent**: AI agent that uses MCP tools to interact with blockchain

### `/platform` 
The management layer:
- **orchestrator**: REST API that manages user containers and proxies requests (THE API!)
- **frontend**: React dashboard for user interface

### `/docker`
Container configuration for production deployment

### Data Directories (Git-Ignored)
- **data/**: SQLite databases, persistent storage
- **logs/**: Application logs from all services
- **user-data/**: User-specific files and configurations
- **temp/**: Temporary processing files

## Important Notes

1. **NO `platform/api` directory** - The orchestrator IS the API
2. **All services use npm** - No mixed package managers
3. **Clean separation** - Each service is independent
4. **Git-ignored data** - User data never committed

## Common Commands

```bash
# Install everything
npm run install:all

# Build all services
npm run build:all

# Start development
npm run dev

# Start production
npm run start:orchestrator
npm run start:mcp

# Clean everything
npm run clean
npm run clean:build
```