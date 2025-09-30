# MidnightOS Architecture Documentation

Comprehensive technical documentation of MidnightOS system architecture, component interactions, and design patterns.

## System Overview

MidnightOS is a multi-tenant platform for deploying AI agents on the Midnight blockchain with zero-knowledge privacy capabilities. The architecture follows microservices patterns with clear separation of concerns.

## High-Level Architecture

```mermaid
graph TB
    subgraph "Client Layer"
        WEB["Web Dashboard<br/>React/Next.js"]
        API_CLIENT["API Clients<br/>REST/GraphQL"]
        CLI["CLI Tools<br/>Management"]
    end
    
    subgraph "Gateway Layer"
        LB["Load Balancer<br/>NGINX/HAProxy"]
        AUTH["Authentication<br/>JWT/OAuth"]
        RATE["Rate Limiting<br/>Redis-based"]
    end
    
    subgraph "Application Layer"
        ORCHESTRATOR["Orchestrator API<br/>Express.js"]
        FRONTEND["Frontend Server<br/>Next.js SSR"]
    end
    
    subgraph "AI Layer"
        ELIZA["Shared Eliza Service<br/>ElizaOS Framework"]
        TENANTS["Tenant Manager<br/>Multi-tenant Isolation"]
        PLUGINS["Plugin System<br/>Extensible Capabilities"]
    end
    
    subgraph "Blockchain Layer"
        MCP["Midnight MCP Server<br/>Model Context Protocol"]
        WALLET["Wallet Service<br/>Key Management"]
        PROOF["Proof Service<br/>ZK Operations"]
    end
    
    subgraph "Data Layer"
        PRIMARY[(Primary Database<br/>PostgreSQL)]
        REPLICA[(Read Replica<br/>PostgreSQL)]
        CACHE[(Cache Layer<br/>Redis)]
        SEARCH[(Search Index<br/>Elasticsearch)]
    end
    
    subgraph "External Services"
        MIDNIGHT["Midnight Blockchain<br/>Testnet/Mainnet"]
        INDEXER["Blockchain Indexer<br/>GraphQL API"]
        NOTIFICATIONS["Notification Services<br/>Discord/Telegram"]
    end
    
    subgraph "Infrastructure"
        MONITORING["Monitoring<br/>Prometheus/Grafana"]
        LOGGING["Logging<br/>ELK Stack"]
        BACKUP["Backup Service<br/>S3/GCS"]
    end
    
    WEB --> LB
    API_CLIENT --> LB
    CLI --> LB
    
    LB --> AUTH
    AUTH --> RATE
    RATE --> ORCHESTRATOR
    RATE --> FRONTEND
    
    ORCHESTRATOR --> ELIZA
    ORCHESTRATOR --> PRIMARY
    ORCHESTRATOR --> CACHE
    
    ELIZA --> TENANTS
    ELIZA --> PLUGINS
    ELIZA --> MCP
    
    MCP --> WALLET
    MCP --> PROOF
    MCP --> MIDNIGHT
    MCP --> INDEXER
    
    PRIMARY --> REPLICA
    ORCHESTRATOR --> SEARCH
    
    ELIZA --> NOTIFICATIONS
    
    MONITORING --> ORCHESTRATOR
    MONITORING --> ELIZA
    MONITORING --> MCP
    LOGGING --> ORCHESTRATOR
    LOGGING --> ELIZA
    LOGGING --> MCP
    
    style WEB fill:#e1f5fe
    style ORCHESTRATOR fill:#e8f5e9
    style ELIZA fill:#fff3e0
    style MCP fill:#f3e5f5
    style MIDNIGHT fill:#e0f2f1
```

## Component Architecture

### Frontend Architecture

```mermaid
graph TB
    subgraph "Next.js Frontend"
        PAGES["Pages<br/>- Dashboard<br/>- Bot Management<br/>- Chat Interface"]
        
        COMPONENTS["Components<br/>- Reusable UI<br/>- Bot Cards<br/>- Chat Widgets"]
        
        HOOKS["Custom Hooks<br/>- API Calls<br/>- State Management<br/>- WebSocket"]
        
        SERVICES["Services<br/>- API Client<br/>- Authentication<br/>- Error Handling"]
        
        STATE["State Management<br/>- Context API<br/>- Local Storage<br/>- Session State"]
        
        PAGES --> COMPONENTS
        COMPONENTS --> HOOKS
        HOOKS --> SERVICES
        COMPONENTS --> STATE
    end
    
    subgraph "Build & Deploy"
        BUILD["Build Process<br/>- TypeScript<br/>- Tailwind CSS<br/>- Webpack"]
        
        STATIC["Static Assets<br/>- Images<br/>- Fonts<br/>- Icons"]
        
        CDN["CDN Distribution<br/>- CloudFront<br/>- CloudFlare<br/>- Static Hosting"]
        
        BUILD --> STATIC
        STATIC --> CDN
    end
    
    SERVICES --> API_LAYER["API Layer"]
    
    style PAGES fill:#e1f5fe
    style COMPONENTS fill:#e8f5e9
    style SERVICES fill:#fff3e0
```

### API Architecture

```mermaid
graph TB
    subgraph "Express.js API"
        ROUTES["Route Handlers<br/>- Authentication<br/>- Bot Management<br/>- Chat Endpoints"]
        
        MIDDLEWARE["Middleware Stack<br/>- CORS<br/>- Authentication<br/>- Rate Limiting<br/>- Logging"]
        
        CONTROLLERS["Controllers<br/>- Bot Controller<br/>- Chat Controller<br/>- Wallet Controller"]
        
        SERVICES_API["Business Services<br/>- Bot Service<br/>- Tenant Service<br/>- Wallet Service"]
        
        MODELS["Data Models<br/>- Prisma ORM<br/>- Database Schemas<br/>- Validation"]
        
        ROUTES --> MIDDLEWARE
        MIDDLEWARE --> CONTROLLERS
        CONTROLLERS --> SERVICES_API
        SERVICES_API --> MODELS
    end
    
    subgraph "External Integrations"
        ELIZA_CLIENT["Eliza Client<br/>- HTTP Requests<br/>- Tenant Routing<br/>- Load Balancing"]
        
        MCP_CLIENT["MCP Client<br/>- Protocol Handler<br/>- Wallet Operations<br/>- Blockchain Queries"]
        
        DB_CLIENT["Database Client<br/>- Connection Pool<br/>- Transaction Management<br/>- Query Optimization"]
        
        CACHE_CLIENT["Cache Client<br/>- Redis Operations<br/>- Session Management<br/>- Rate Limiting"]
        
        SERVICES_API --> ELIZA_CLIENT
        SERVICES_API --> MCP_CLIENT
        SERVICES_API --> DB_CLIENT
        SERVICES_API --> CACHE_CLIENT
    end
    
    style ROUTES fill:#e1f5fe
    style CONTROLLERS fill:#e8f5e9
    style SERVICES_API fill:#fff3e0
```

### Eliza AI Architecture

```mermaid
graph TB
    subgraph "ElizaOS Core"
        RUNTIME["Runtime Engine<br/>- Message Processing<br/>- Decision Making<br/>- Action Execution"]
        
        MEMORY["Memory System<br/>- Conversation History<br/>- Context Management<br/>- Long-term Learning"]
        
        PERSONALITY["Personality Engine<br/>- Character Definition<br/>- Response Patterns<br/>- Behavior Rules"]
        
        ACTIONS["Action System<br/>- Built-in Actions<br/>- Custom Actions<br/>- Plugin Actions"]
        
        RUNTIME --> MEMORY
        RUNTIME --> PERSONALITY
        RUNTIME --> ACTIONS
    end
    
    subgraph "Multi-tenant Management"
        TENANT_ROUTER["Tenant Router<br/>- Request Routing<br/>- Isolation<br/>- Load Balancing"]
        
        TENANT_MANAGER["Tenant Manager<br/>- Bot Registration<br/>- Configuration<br/>- Lifecycle"]
        
        RESOURCE_POOL["Resource Pool<br/>- Memory Allocation<br/>- CPU Scheduling<br/>- I/O Management"]
        
        TENANT_ROUTER --> TENANT_MANAGER
        TENANT_MANAGER --> RESOURCE_POOL
        RESOURCE_POOL --> RUNTIME
    end
    
    subgraph "Plugin Architecture"
        PLUGIN_LOADER["Plugin Loader<br/>- Dynamic Loading<br/>- Dependency Resolution<br/>- Lifecycle Management"]
        
        CORE_PLUGINS["Core Plugins<br/>- Wallet Operations<br/>- Blockchain Queries<br/>- Discord Integration"]
        
        CUSTOM_PLUGINS["Custom Plugins<br/>- DAO Management<br/>- DeFi Operations<br/>- Community Tools"]
        
        PLUGIN_API["Plugin API<br/>- Standard Interface<br/>- Event System<br/>- State Management"]
        
        PLUGIN_LOADER --> CORE_PLUGINS
        PLUGIN_LOADER --> CUSTOM_PLUGINS
        CORE_PLUGINS --> PLUGIN_API
        CUSTOM_PLUGINS --> PLUGIN_API
        
        ACTIONS --> PLUGIN_API
    end
    
    style RUNTIME fill:#e1f5fe
    style TENANT_ROUTER fill:#e8f5e9
    style PLUGIN_LOADER fill:#fff3e0
```

### MCP Architecture

```mermaid
graph TB
    subgraph "MCP Server Core"
        MCP_SERVER["MCP Server<br/>- Protocol Handler<br/>- Message Routing<br/>- Session Management"]
        
        TOOL_REGISTRY["Tool Registry<br/>- Available Tools<br/>- Capabilities<br/>- Permissions"]
        
        RESOURCE_MANAGER["Resource Manager<br/>- URI Handling<br/>- Resource Access<br/>- Caching"]
        
        MCP_SERVER --> TOOL_REGISTRY
        MCP_SERVER --> RESOURCE_MANAGER
    end
    
    subgraph "Wallet Management"
        WALLET_FACTORY["Wallet Factory<br/>- Wallet Creation<br/>- Key Generation<br/>- Address Derivation"]
        
        KEY_STORE["Key Store<br/>- Secure Storage<br/>- Encryption<br/>- Access Control"]
        
        SIGNER["Transaction Signer<br/>- Digital Signatures<br/>- Multi-sig Support<br/>- Hardware Security"]
        
        WALLET_FACTORY --> KEY_STORE
        KEY_STORE --> SIGNER
    end
    
    subgraph "Blockchain Interface"
        RPC_CLIENT["RPC Client<br/>- Node Communication<br/>- Connection Pool<br/>- Retry Logic"]
        
        INDEXER_CLIENT["Indexer Client<br/>- GraphQL Queries<br/>- Data Fetching<br/>- Caching"]
        
        TX_BUILDER["Transaction Builder<br/>- Transaction Construction<br/>- Fee Estimation<br/>- Validation"]
        
        ZK_PROVER["ZK Prover<br/>- Proof Generation<br/>- Circuit Management<br/>- Verification"]
        
        RPC_CLIENT --> TX_BUILDER
        INDEXER_CLIENT --> TX_BUILDER
        TX_BUILDER --> ZK_PROVER
        SIGNER --> TX_BUILDER
    end
    
    subgraph "Tools Implementation"
        WALLET_TOOLS["Wallet Tools<br/>- Balance Queries<br/>- Transfers<br/>- History"]
        
        DAO_TOOLS["DAO Tools<br/>- Governance<br/>- Proposals<br/>- Voting"]
        
        DEFI_TOOLS["DeFi Tools<br/>- Staking<br/>- Swapping<br/>- Yield Farming"]
        
        WALLET_TOOLS --> WALLET_FACTORY
        DAO_TOOLS --> INDEXER_CLIENT
        DEFI_TOOLS --> RPC_CLIENT
        
        TOOL_REGISTRY --> WALLET_TOOLS
        TOOL_REGISTRY --> DAO_TOOLS
        TOOL_REGISTRY --> DEFI_TOOLS
    end
    
    style MCP_SERVER fill:#e1f5fe
    style WALLET_FACTORY fill:#e8f5e9
    style RPC_CLIENT fill:#fff3e0
    style WALLET_TOOLS fill:#f3e5f5
```

## Data Flow Architecture

### Bot Creation Flow

```mermaid
sequenceDiagram
    participant User
    participant Frontend
    participant Orchestrator
    participant Database
    participant Eliza
    participant MCP
    participant Blockchain
    
    User->>Frontend: Create Bot Request
    Frontend->>Orchestrator: POST /api/bots
    
    Orchestrator->>Database: Save Bot Config
    Database-->>Orchestrator: Bot ID
    
    Orchestrator->>Eliza: Register Tenant
    Eliza->>Eliza: Allocate Resources
    Eliza-->>Orchestrator: Tenant Registered
    
    Orchestrator->>MCP: Create Wallet
    MCP->>Blockchain: Generate Address
    Blockchain-->>MCP: Wallet Address
    MCP-->>Orchestrator: Wallet Created
    
    Orchestrator->>Database: Update Bot with Wallet
    Database-->>Orchestrator: Updated
    
    Orchestrator-->>Frontend: Bot Created
    Frontend-->>User: Success Response
```

### Chat Message Flow

```mermaid
sequenceDiagram
    participant User
    participant Frontend
    participant Orchestrator
    participant Eliza
    participant MCP
    participant Blockchain
    
    User->>Frontend: Send Message
    Frontend->>Orchestrator: POST /api/bots/{id}/chat
    
    Orchestrator->>Eliza: Route to Tenant
    Eliza->>Eliza: Process Message
    
    alt Blockchain Action Required
        Eliza->>MCP: Execute Tool
        MCP->>Blockchain: Submit Transaction
        Blockchain-->>MCP: Transaction Result
        MCP-->>Eliza: Tool Result
    end
    
    Eliza->>Eliza: Generate Response
    Eliza-->>Orchestrator: Response
    
    Orchestrator-->>Frontend: Chat Response
    Frontend-->>User: Display Response
```

### Transaction Flow

```mermaid
sequenceDiagram
    participant Bot
    participant Eliza
    participant MCP
    participant KeyStore
    participant Blockchain
    participant Indexer
    
    Bot->>Eliza: Transaction Request
    Eliza->>MCP: wallet/send Tool Call
    
    MCP->>MCP: Validate Request
    MCP->>KeyStore: Get Private Key
    KeyStore-->>MCP: Private Key
    
    MCP->>MCP: Build Transaction
    MCP->>MCP: Sign Transaction
    
    MCP->>Blockchain: Submit Transaction
    Blockchain-->>MCP: Transaction Hash
    
    MCP->>Indexer: Monitor Transaction
    Indexer-->>MCP: Confirmation Status
    
    MCP-->>Eliza: Transaction Result
    Eliza-->>Bot: Success/Failure
```

## Database Schema

### Core Entities

```mermaid
erDiagram
    User {
        string id PK
        string email
        string username
        string password_hash
        timestamp created_at
        timestamp updated_at
        boolean is_active
    }
    
    Bot {
        string id PK
        string user_id FK
        string name
        string description
        string type
        json config
        string status
        string tenant_id
        string wallet_address
        timestamp created_at
        timestamp updated_at
    }
    
    Conversation {
        string id PK
        string bot_id FK
        string user_id FK
        timestamp started_at
        timestamp last_message_at
        boolean is_active
    }
    
    Message {
        string id PK
        string conversation_id FK
        string sender_type
        string content
        json metadata
        timestamp created_at
    }
    
    Transaction {
        string id PK
        string bot_id FK
        string tx_hash
        string from_address
        string to_address
        decimal amount
        string status
        json metadata
        timestamp created_at
        timestamp confirmed_at
    }
    
    Wallet {
        string id PK
        string bot_id FK
        string address
        string encrypted_private_key
        string public_key
        decimal balance
        timestamp created_at
        timestamp last_sync_at
    }
    
    User ||--o{ Bot : owns
    Bot ||--o{ Conversation : has
    Conversation ||--o{ Message : contains
    Bot ||--|| Wallet : has
    Bot ||--o{ Transaction : initiates
```

### Configuration Schema

```mermaid
graph TB
    subgraph "Bot Configuration"
        BOT_CONFIG["Bot Config<br/>- Name<br/>- Type<br/>- Description"]
        
        PERSONALITY["Personality<br/>- Traits<br/>- Communication Style<br/>- Background"]
        
        CAPABILITIES["Capabilities<br/>- Enabled Features<br/>- Permissions<br/>- Limits"]
        
        INTEGRATIONS["Integrations<br/>- Discord Config<br/>- Telegram Config<br/>- Webhook URLs"]
        
        BOT_CONFIG --> PERSONALITY
        BOT_CONFIG --> CAPABILITIES
        BOT_CONFIG --> INTEGRATIONS
    end
    
    subgraph "Treasury Configuration"
        TREASURY_CONFIG["Treasury Config<br/>- Multi-sig Settings<br/>- Governance Rules<br/>- Spending Limits"]
        
        SIGNERS["Signers<br/>- Address List<br/>- Roles<br/>- Permissions"]
        
        RULES["Automation Rules<br/>- Conditions<br/>- Actions<br/>- Thresholds"]
        
        TREASURY_CONFIG --> SIGNERS
        TREASURY_CONFIG --> RULES
    end
    
    subgraph "Security Configuration"
        SECURITY_CONFIG["Security Config<br/>- Authentication<br/>- Encryption<br/>- Access Control"]
        
        PERMISSIONS["Permissions<br/>- User Roles<br/>- API Access<br/>- Feature Flags"]
        
        AUDIT["Audit Settings<br/>- Logging Level<br/>- Retention<br/>- Compliance"]
        
        SECURITY_CONFIG --> PERMISSIONS
        SECURITY_CONFIG --> AUDIT
    end
    
    CAPABILITIES --> TREASURY_CONFIG
    CAPABILITIES --> SECURITY_CONFIG
```

## Security Architecture

### Authentication & Authorization

```mermaid
graph TB
    subgraph "Authentication Layer"
        LOGIN["User Login<br/>- Email/Password<br/>- OAuth Providers<br/>- MFA"]
        
        JWT["JWT Tokens<br/>- Access Token<br/>- Refresh Token<br/>- Claims"]
        
        SESSION["Session Management<br/>- Redis Storage<br/>- Expiration<br/>- Revocation"]
        
        LOGIN --> JWT
        JWT --> SESSION
    end
    
    subgraph "Authorization Layer"
        RBAC["Role-Based Access<br/>- User Roles<br/>- Permissions<br/>- Hierarchies"]
        
        API_GUARDS["API Guards<br/>- Route Protection<br/>- Method Restrictions<br/>- Resource Access"]
        
        TENANT_ISOLATION["Tenant Isolation<br/>- Data Segregation<br/>- Resource Limits<br/>- Cross-tenant Prevention"]
        
        RBAC --> API_GUARDS
        API_GUARDS --> TENANT_ISOLATION
    end
    
    subgraph "Wallet Security"
        KEY_ENCRYPTION["Key Encryption<br/>- AES-256<br/>- Key Derivation<br/>- Salt Generation"]
        
        HARDWARE_SECURITY["Hardware Security<br/>- HSM Integration<br/>- Secure Enclaves<br/>- Hardware Wallets"]
        
        MULTI_SIG["Multi-signature<br/>- Threshold Schemes<br/>- Signer Management<br/>- Recovery Procedures"]
        
        KEY_ENCRYPTION --> HARDWARE_SECURITY
        HARDWARE_SECURITY --> MULTI_SIG
    end
    
    SESSION --> RBAC
    TENANT_ISOLATION --> KEY_ENCRYPTION
    
    style LOGIN fill:#e1f5fe
    style RBAC fill:#e8f5e9
    style KEY_ENCRYPTION fill:#fff3e0
```

This comprehensive architecture documentation provides detailed technical insights into MidnightOS system design, component interactions, and infrastructure patterns for developers and system architects.