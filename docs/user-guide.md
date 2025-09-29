# MidnightOS User Guide

## Introduction

Welcome to MidnightOS, an AI-powered platform for DAO treasury management on the Midnight blockchain. This guide will help you get started with using the platform effectively.

## Getting Started

### Prerequisites
- Node.js v20+ installed
- pnpm package manager v10.15.0+
- Modern web browser (Chrome, Firefox, Safari, Edge)
- Stable internet connection

### Installation

1. Clone the repository:
```bash
git clone https://github.com/Midnight-OS/MidnightOS.git
cd MidnightOS
```

2. Install dependencies:
```bash
pnpm install
```

3. Configure environment variables by copying the example files and filling in your values:
```bash
cp .env.example .env
```

4. Start the platform:
```bash
pnpm dev
```

## Using the Platform

### Accessing the Web Interface

1. Open your browser and navigate to `http://localhost:3003`
2. Create an account or log in with existing credentials
3. You'll be presented with the main dashboard

### Creating Your First Bot

1. Click "Create New Bot" on the dashboard
2. Configure your bot:
   - **Name**: Give your bot a descriptive name
   - **Model**: Select the AI model (OpenAI, Anthropic, or Ollama)
   - **Platform**: Choose where your bot will operate (Discord, Telegram, or Direct Chat)
   - **API Keys**: Provide necessary API keys for your chosen model and platform

3. Click "Create Bot" to deploy your AI agent

### Interacting with Your Bot

#### Via Web Interface
1. Select your bot from the dashboard
2. Click "Chat" to open the conversation interface
3. Type natural language commands to interact with blockchain operations

#### Example Commands
- "Check my wallet balance"
- "Create a DAO proposal to fund the marketing team with 1000 tokens"
- "Show me the current treasury status"
- "Deploy a new token contract with symbol XYZ"
- "Vote yes on proposal #42"

### Managing Your Wallet

1. Navigate to the Wallet section
2. Your wallet address will be displayed
3. Available operations:
   - View balance
   - Send transactions
   - View transaction history
   - Export wallet data

### DAO Operations

#### Creating Proposals
1. Use natural language: "Create a proposal to [your proposal details]"
2. The bot will guide you through the process
3. Confirm the proposal details before submission

#### Voting
1. View active proposals: "Show me active proposals"
2. Cast your vote: "Vote [yes/no] on proposal [ID]"
3. Check voting results: "What's the status of proposal [ID]?"

#### Treasury Management
1. Check treasury balance: "What's our treasury balance?"
2. Fund treasury: "Fund the treasury with [amount] tokens"
3. Process payouts: "Process payout of [amount] to [address]"
4. View analytics: "Show treasury analytics for the last month"

## Advanced Features

### Privacy-Preserving Transactions

MidnightOS uses zero-knowledge proofs for private transactions:

1. Enable shielded mode: "Enable private transactions"
2. All subsequent operations will use ZK-proofs
3. Transactions remain private while maintaining verifiability

### Multi-Agent Deployment

Deploy multiple specialized bots for different roles:

1. Create bots with specific purposes:
   - Treasury Manager Bot
   - Governance Coordinator Bot
   - Community Engagement Bot
2. Each bot can have different permissions and capabilities
3. Bots can work together for complex operations

### Custom Workflows

Create automated workflows using natural language:

1. "Every Monday, generate a treasury report"
2. "When treasury balance exceeds 10000, notify the team"
3. "Automatically vote yes on proposals from trusted members"

## Troubleshooting

### Common Issues

#### Bot Not Responding
- Check if all services are running
- Verify API keys are correct
- Ensure network connectivity

#### Transaction Failures
- Verify wallet has sufficient balance
- Check network status
- Ensure correct permissions

#### Connection Issues
- Verify Midnight network endpoints are accessible
- Check firewall settings
- Ensure ports 3000-3003 are available

### Getting Help

- Check the [Troubleshooting Guide](./troubleshooting.md)
- Report issues on [GitHub](https://github.com/Midnight-OS/MidnightOS/issues)
- Join our community discussions

## Best Practices

### Security
- Never share your private keys or seed phrases
- Use environment variables for sensitive data
- Enable two-factor authentication when available
- Regularly update dependencies

### Performance
- Start with one bot and scale as needed
- Monitor resource usage
- Use appropriate AI models for your needs
- Cache frequently accessed data

### Governance
- Test proposals in development environment first
- Set appropriate voting periods
- Document proposal rationale clearly
- Monitor voting participation

## Next Steps

- Explore the [API Reference](./api-reference.md) for programmatic access
- Read the [Architecture Guide](./architecture.md) for technical details
- Join our community to share experiences and get support

---

For more information, visit our [main documentation](https://github.com/Midnight-OS/MidnightOS#readme)