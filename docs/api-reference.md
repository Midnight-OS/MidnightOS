# MidnightOS API Reference

## Overview

MidnightOS provides RESTful APIs for programmatic access to the platform's features. This reference documents all available endpoints, request/response formats, and usage examples.

## Base URLs

- **Orchestrator API**: `http://localhost:3002/api`
- **MCP Server**: `http://localhost:3001`
- **Frontend**: `http://localhost:3003`

## Authentication

All API requests require authentication using JWT tokens.

### Obtaining a Token

```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "your-password"
}
```

Response:
```json
{
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "id": "user-123",
    "email": "user@example.com",
    "name": "John Doe"
  }
}
```

### Using the Token

Include the token in the Authorization header:
```http
Authorization: Bearer eyJhbGciOiJIUzI1NiIs...
```

## Orchestrator API

### Authentication Endpoints

#### Register User
```http
POST /api/auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "secure-password",
  "name": "John Doe"
}
```

#### Login
```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "secure-password"
}
```

#### Logout
```http
POST /api/auth/logout
Authorization: Bearer <token>
```

#### Get Current User
```http
GET /api/auth/me
Authorization: Bearer <token>
```

### Bot Management Endpoints

#### List Bots
```http
GET /api/bots
Authorization: Bearer <token>
```

Response:
```json
{
  "bots": [
    {
      "id": "bot-123",
      "name": "Treasury Manager",
      "status": "running",
      "model": "openai",
      "platform": "discord",
      "createdAt": "2025-01-20T10:00:00Z"
    }
  ]
}
```

#### Create Bot
```http
POST /api/bots
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "Treasury Manager",
  "model": "openai",
  "platform": "discord",
  "config": {
    "openaiApiKey": "sk-...",
    "discordToken": "..."
  }
}
```

#### Get Bot Details
```http
GET /api/bots/:id
Authorization: Bearer <token>
```

#### Update Bot
```http
PUT /api/bots/:id
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "Updated Bot Name",
  "config": {
    "setting": "value"
  }
}
```

#### Delete Bot
```http
DELETE /api/bots/:id
Authorization: Bearer <token>
```

#### Start Bot
```http
POST /api/bots/:id/start
Authorization: Bearer <token>
```

#### Stop Bot
```http
POST /api/bots/:id/stop
Authorization: Bearer <token>
```

### Chat Endpoints

#### Send Message
```http
POST /api/chat
Authorization: Bearer <token>
Content-Type: application/json

{
  "botId": "bot-123",
  "message": "Check wallet balance",
  "sessionId": "session-456"
}
```

Response:
```json
{
  "response": "Your wallet balance is 1000 DUST tokens",
  "sessionId": "session-456",
  "timestamp": "2025-01-20T10:00:00Z"
}
```

#### Get Conversation History
```http
GET /api/chat/:sessionId
Authorization: Bearer <token>
```

## MCP Server Tools

The MCP server provides blockchain operations through a tools interface. These are accessed via the ElizaOS agent.

### Available Tools

```mermaid
graph LR
    subgraph Wallet
        WS[wallet_status]
        WA[wallet_address]
        WB[wallet_balance]
        WT[wallet_send]
    end
    
    subgraph DAO
        DP[dao_proposal_create]
        DV[dao_vote]
        DL[dao_proposals]
        DS[dao_state]
    end
    
    subgraph Treasury
        TB[treasury_balance]
        TF[treasury_fund]
        TP[treasury_payout]
        TA[treasury_analytics]
    end
    
    subgraph Contracts
        CD[contract_deploy]
        CI[contract_interact]
        CV[contract_verify]
    end
    
    subgraph Tokens
        TM[token_mint]
        TBurn[token_burn]
        TTrans[token_transfer]
        TReg[token_register]
    end
```

### Tool Usage Examples

#### Wallet Status
```javascript
{
  "tool": "wallet_status",
  "parameters": {}
}
```

Response:
```javascript
{
  "status": "synced",
  "blockHeight": 12345,
  "network": "testnet-02"
}
```

#### Create DAO Proposal
```javascript
{
  "tool": "dao_proposal_create",
  "parameters": {
    "title": "Fund Marketing Campaign",
    "description": "Allocate 5000 tokens for Q1 marketing",
    "amount": 5000,
    "recipient": "0x..."
  }
}
```

#### Cast Vote
```javascript
{
  "tool": "dao_vote",
  "parameters": {
    "proposalId": "42",
    "vote": "yes"
  }
}
```

## WebSocket Events

### Connecting to WebSocket
```javascript
const ws = new WebSocket('ws://localhost:3002/ws');

ws.on('open', () => {
  ws.send(JSON.stringify({
    type: 'auth',
    token: 'your-jwt-token'
  }));
});
```

### Event Types

#### Bot Status Update
```javascript
{
  "type": "bot_status",
  "data": {
    "botId": "bot-123",
    "status": "running",
    "timestamp": "2025-01-20T10:00:00Z"
  }
}
```

#### Transaction Update
```javascript
{
  "type": "transaction",
  "data": {
    "txHash": "0x...",
    "status": "confirmed",
    "blockNumber": 12345
  }
}
```

#### Proposal Update
```javascript
{
  "type": "proposal",
  "data": {
    "proposalId": "42",
    "status": "executed",
    "votes": {
      "yes": 150,
      "no": 30
    }
  }
}
```

## Error Handling

All API errors follow a consistent format:

```json
{
  "error": {
    "code": "INVALID_REQUEST",
    "message": "Description of the error",
    "details": {
      "field": "Additional information"
    }
  }
}
```

### Common Error Codes

| Code | Description | HTTP Status |
|------|-------------|-------------|
| `UNAUTHORIZED` | Missing or invalid authentication | 401 |
| `FORBIDDEN` | Insufficient permissions | 403 |
| `NOT_FOUND` | Resource not found | 404 |
| `INVALID_REQUEST` | Invalid request parameters | 400 |
| `RATE_LIMITED` | Too many requests | 429 |
| `INTERNAL_ERROR` | Server error | 500 |

## Rate Limiting

API requests are rate limited to prevent abuse:

- **Authentication endpoints**: 5 requests per minute
- **Bot management**: 30 requests per minute
- **Chat endpoints**: 60 requests per minute
- **Blockchain operations**: 10 requests per minute

Rate limit headers:
```http
X-RateLimit-Limit: 60
X-RateLimit-Remaining: 45
X-RateLimit-Reset: 1642694400
```

## Pagination

List endpoints support pagination:

```http
GET /api/bots?page=1&limit=20
```

Response includes pagination metadata:
```json
{
  "data": [...],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 45,
    "pages": 3
  }
}
```

## SDK Examples

### JavaScript/TypeScript
```typescript
import { MidnightOS } from '@midnight-os/sdk';

const client = new MidnightOS({
  apiKey: 'your-api-key',
  baseUrl: 'http://localhost:3002'
});

// Create a bot
const bot = await client.bots.create({
  name: 'Treasury Bot',
  model: 'openai',
  platform: 'discord'
});

// Send a message
const response = await client.chat.send({
  botId: bot.id,
  message: 'Check treasury balance'
});
```

### Python
```python
from midnight_os import MidnightOS

client = MidnightOS(
    api_key='your-api-key',
    base_url='http://localhost:3002'
)

# Create a bot
bot = client.bots.create(
    name='Treasury Bot',
    model='openai',
    platform='discord'
)

# Send a message
response = client.chat.send(
    bot_id=bot.id,
    message='Check treasury balance'
)
```

## Testing

### Using cURL
```bash
# Login
curl -X POST http://localhost:3002/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"password"}'

# List bots
curl -X GET http://localhost:3002/api/bots \
  -H "Authorization: Bearer <token>"

# Send chat message
curl -X POST http://localhost:3002/api/chat \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"botId":"bot-123","message":"Check balance"}'
```

### Using Postman

Import the Postman collection from:
```
/docs/postman-collection.json
```

## Support

For API support:
- GitHub Issues: [https://github.com/Midnight-OS/MidnightOS/issues](https://github.com/Midnight-OS/MidnightOS/issues)
- Documentation: [https://github.com/Midnight-OS/MidnightOS#readme](https://github.com/Midnight-OS/MidnightOS#readme)