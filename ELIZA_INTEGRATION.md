# Eliza Agent Integration with MidnightOS

## Overview
The Eliza agent has been fully integrated with MidnightOS to provide AI-powered blockchain operations through natural language interactions.

## Components Created

### 1. Midnight Character (`midnight-character.ts`)
- Specialized character for blockchain operations
- Configured with MCP tools integration
- Handles wallet, DAO, treasury, and contract operations
- Supports multiple platforms (Discord, Telegram, etc.)

### 2. Midnight Plugin (`midnight-plugin.ts`)
- Implements MCP tool actions as Eliza actions
- Connects to MCP server for blockchain operations
- Includes actions for:
  - Wallet balance checking
  - Token transfers (shielded/transparent)
  - DAO proposal creation and voting
  - Treasury management
  - Smart contract deployment
  - Zero-knowledge proof generation

### 3. Configuration
- `.env.example` with all required settings
- Support for multiple AI models (OpenAI, Anthropic, Ollama)
- Platform credentials configuration
- Midnight blockchain endpoints

## Available Commands

### Wallet Operations
- "Check my balance" - Shows transparent and shielded balances
- "Send 100 tokens to Alice" - Transfer tokens
- "Shield 50 tokens" - Convert to shielded tokens
- "Unshield tokens" - Convert back to transparent

### DAO Operations
- "Create proposal for 10000 tokens for project funding" - Create funding proposal
- "Vote yes on proposal 5" - Cast vote
- "Check treasury status" - View treasury balance and proposals

### Contract Operations
- "Deploy treasury contract" - Deploy DAO treasury
- "Deploy token contract" - Create new token
- "Deploy DAO voting contract" - Set up governance

## Starting the Bot

### Quick Start
```bash
cd services/eliza-agent
./start-midnight-bot.sh
```

### Manual Start
1. Start MCP server:
```bash
cd services/midnight-mcp
npm run start
```

2. Start Eliza agent:
```bash
cd services/eliza-agent/Eliza-Base-Agent
BOT_TYPE=midnight npm run dev
```

## Environment Setup

Create `.env` from `.env.example`:
```bash
cp .env.example .env
```

Required settings:
- `BOT_TYPE=midnight` - Activates blockchain features
- `MCP_SERVER_URL=http://localhost:3456` - MCP server endpoint
- Platform tokens (Discord/Telegram)
- AI model API key (at least one)

## Architecture

```
Eliza Agent
├── Character (midnight-character.ts)
│   └── Defines bot personality and capabilities
├── Plugin (midnight-plugin.ts)
│   └── Implements MCP tool actions
└── MCP Client
    └── Connects to MCP server for blockchain ops
```

## Message Flow

1. User sends message to bot (Discord/Telegram)
2. Eliza processes with AI model
3. Plugin validates and handles blockchain actions
4. MCP server executes on Midnight blockchain
5. Results returned to user

## Testing

### Local Testing
```bash
cd services/eliza-agent/Eliza-Base-Agent
npm test
```

### Integration Testing
1. Start both MCP and Eliza services
2. Send test commands through Discord/Telegram
3. Verify blockchain operations complete

## Troubleshooting

### MCP Connection Failed
- Ensure MCP server is running on port 3456
- Check `MCP_SERVER_URL` in .env
- Verify network connectivity

### Bot Not Responding
- Check AI model API key is valid
- Ensure platform tokens are correct
- Review logs for errors

### Blockchain Operations Failing
- Verify Midnight node connectivity
- Check wallet has sufficient balance
- Ensure proof server is accessible

## Security Notes

- Never commit .env files
- Keep wallet seeds encrypted
- Use shielded transactions for privacy
- Validate all user inputs
- Implement rate limiting for operations

## Next Steps

1. Add more sophisticated NLP for complex operations
2. Implement multi-signature wallet support
3. Add automated trading strategies
4. Create governance automation
5. Build treasury management AI

## Support

For issues or questions:
- Check logs in `logs/` directory
- Review MCP server status
- Verify blockchain connectivity
- Contact support through platform dashboard