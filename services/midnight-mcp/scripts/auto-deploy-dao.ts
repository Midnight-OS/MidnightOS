#!/usr/bin/env node

/**
 * Automated DAO Deployment Script
 * Deploys all necessary contracts for a fully functional DAO treasury system
 */

import { ContractDeploymentService } from '../src/integrations/contract-deployment-service.js';
import { createLogger } from '../src/logger/index.js';
import { config } from 'dotenv';
import * as fs from 'fs/promises';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

config();

interface DeploymentConfig {
  agentId: string;
  networkId: 'TestNet' | 'MainNet' | 'DevNet';
  seedPhrase?: string;
  autoFund?: boolean;
  fundAmount?: bigint;
}

class AutoDeploymentManager {
  private logger = createLogger('auto-deploy');
  private deploymentService?: ContractDeploymentService;
  private config: DeploymentConfig;
  private envPath: string;

  constructor(config: DeploymentConfig) {
    this.config = config;
    this.envPath = path.join(__dirname, '..', '.env');
  }

  async initialize() {
    this.logger.info('Initializing deployment manager...');
    
    // Ensure agent directories exist
    await this.setupAgentDirectories();
    
    // Generate or use provided seed
    const seed = await this.ensureSeed();
    
    // Initialize deployment service
    await this.initializeDeploymentService(seed);
    
    this.logger.info('Deployment manager initialized successfully');
  }

  private async setupAgentDirectories() {
    const dirs = [
      `.storage/seeds/${this.config.agentId}`,
      `.storage/wallet-backups/${this.config.agentId}`,
      `.storage/logs`,
      `.storage/transaction-db/${this.config.agentId}`
    ];

    for (const dir of dirs) {
      const fullPath = path.join(__dirname, '..', dir);
      await fs.mkdir(fullPath, { recursive: true });
      this.logger.info(`Created directory: ${dir}`);
    }
  }

  private async ensureSeed(): Promise<string> {
    const seedPath = path.join(__dirname, '..', `.storage/seeds/${this.config.agentId}/seed`);
    
    if (this.config.seedPhrase) {
      // Use provided seed
      await fs.writeFile(seedPath, this.config.seedPhrase, { mode: 0o600 });
      this.logger.info('Using provided seed phrase');
      return this.config.seedPhrase;
    }
    
    // Check if seed already exists
    try {
      const existingSeed = await fs.readFile(seedPath, 'utf-8');
      this.logger.info('Using existing seed for agent');
      return existingSeed;
    } catch {
      // Generate new seed (64 char hex for Midnight)
      const crypto = await import('crypto');
      const seed = crypto.randomBytes(32).toString('hex');
      await fs.writeFile(seedPath, seed, { mode: 0o600 });
      this.logger.info(`Generated new seed for agent: ${seed.substring(0, 8)}...`);
      return seed;
    }
  }

  private async initializeDeploymentService(seed: string) {
    // Set up environment
    process.env.AGENT_ID = this.config.agentId;
    process.env.NETWORK_ID = this.config.networkId;
    process.env.USE_EXTERNAL_PROOF_SERVER = 'true';
    
    // Set network endpoints based on networkId
    if (this.config.networkId === 'TestNet') {
      process.env.PROOF_SERVER = 'https://rpc-proof-devnet.midnight.network:8443';
      process.env.INDEXER = 'https://indexer.testnet-02.midnight.network/api/v1/graphql';
      process.env.INDEXER_WS = 'wss://indexer.testnet-02.midnight.network/api/v1/graphql/ws';
      process.env.MN_NODE = 'https://rpc.testnet-02.midnight.network';
    }
    
    // Initialize deployment service
    this.deploymentService = new ContractDeploymentService(this.logger);
    await this.deploymentService.initialize(seed);
    this.logger.info('Contract deployment service initialized');
  }

  async deployContracts() {
    if (!this.deploymentService) {
      throw new Error('Deployment service not initialized');
    }

    this.logger.info('Starting automated contract deployment...');
    
    try {
      // Step 1: Deploy token contracts in parallel
      this.logger.info('Step 1: Deploying token contracts...');
      const [fundingToken, voteToken] = await Promise.all([
        this.deployFundingToken(),
        this.deployVoteToken()
      ]);

      this.logger.info(`Funding Token deployed: ${fundingToken}`);
      this.logger.info(`Vote Token deployed: ${voteToken}`);

      // Step 2: Deploy DAO voting contract
      this.logger.info('Step 2: Deploying DAO voting contract...');
      const daoVoting = await this.deployDaoVoting(fundingToken, voteToken);
      this.logger.info(`DAO Voting contract deployed: ${daoVoting}`);

      // Step 3: Deploy marketplace (optional, independent)
      this.logger.info('Step 3: Deploying marketplace registry...');
      const marketplace = await this.deployMarketplace();
      this.logger.info(`Marketplace deployed: ${marketplace}`);

      // Step 4: Save deployment configuration
      await this.saveDeploymentConfig({
        fundingToken,
        voteToken,
        daoVoting,
        marketplace
      });

      // Step 5: Optional - Fund the treasury
      if (this.config.autoFund && this.config.fundAmount) {
        await this.fundTreasury(daoVoting, this.config.fundAmount);
      }

      this.logger.info('All contracts deployed successfully!');
      
      return {
        fundingToken,
        voteToken,
        daoVoting,
        marketplace
      };
    } catch (error) {
      this.logger.error('Contract deployment failed:', error);
      throw error;
    }
  }

  private async deployFundingToken(): Promise<string> {
    const tx = await this.deploymentService!.deployFundingShieldToken({
      initNonce: BigInt(Date.now())
    });
    return tx.contractAddress;
  }

  private async deployVoteToken(): Promise<string> {
    const tx = await this.deploymentService!.deployDaoShieldedToken({
      initNonce: BigInt(Date.now() + 1000)
    });
    return tx.contractAddress;
  }

  private async deployDaoVoting(fundingToken: string, voteToken: string): Promise<string> {
    const tx = await this.deploymentService!.deployDaoVotingContract({
      fundingTokenAddress: fundingToken,
      daoVoteTokenAddress: voteToken
    });
    return tx.contractAddress;
  }

  private async deployMarketplace(): Promise<string> {
    const tx = await this.deploymentService!.deployMarketplaceRegistry();
    return tx.contractAddress;
  }

  private async fundTreasury(daoAddress: string, amount: bigint) {
    this.logger.info(`Funding treasury with ${amount} tokens...`);
    // This would require having tokens to fund with
    // Implementation depends on token minting capabilities
    this.logger.info('Treasury funding not implemented in this version');
  }

  private async saveDeploymentConfig(addresses: any) {
    // Update .env file with deployed addresses
    const envContent = await fs.readFile(this.envPath, 'utf-8').catch(() => '');
    
    const updates = [
      `FUNDING_TOKEN_ADDRESS=${addresses.fundingToken}`,
      `DAO_VOTE_TOKEN_ADDRESS=${addresses.voteToken}`,
      `DAO_VOTING_ADDRESS=${addresses.daoVoting}`,
      `MARKETPLACE_ADDRESS=${addresses.marketplace}`,
      `# Deployed on ${new Date().toISOString()} for agent ${this.config.agentId}`
    ];
    
    const newEnvContent = envContent + '\n\n# Auto-deployed contracts\n' + updates.join('\n');
    await fs.writeFile(this.envPath, newEnvContent);
    
    // Also save to a deployment record file
    const deploymentRecord = {
      agentId: this.config.agentId,
      networkId: this.config.networkId,
      timestamp: new Date().toISOString(),
      contracts: addresses
    };
    
    const recordPath = path.join(__dirname, '..', `.storage/deployments/${this.config.agentId}.json`);
    await fs.mkdir(path.dirname(recordPath), { recursive: true });
    await fs.writeFile(recordPath, JSON.stringify(deploymentRecord, null, 2));
    
    this.logger.info(`Deployment configuration saved to .env and ${recordPath}`);
  }

  async cleanup() {
    if (this.deploymentService) {
      await this.deploymentService.cleanup();
    }
  }
}

// CLI interface
async function main() {
  const args = process.argv.slice(2);
  
  // Parse command line arguments
  const config: DeploymentConfig = {
    agentId: process.env.AGENT_ID || 'auto-deploy-' + Date.now(),
    networkId: 'TestNet',
    autoFund: false
  };
  
  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--agent-id':
      case '-a':
        config.agentId = args[++i];
        break;
      case '--network':
      case '-n':
        config.networkId = args[++i] as any;
        break;
      case '--seed':
      case '-s':
        config.seedPhrase = args[++i];
        break;
      case '--fund':
      case '-f':
        config.autoFund = true;
        config.fundAmount = BigInt(args[++i] || 1000000);
        break;
      case '--help':
      case '-h':
        console.log(`
Automated DAO Deployment Script

Usage: bun run auto-deploy [options]

Options:
  -a, --agent-id <id>     Agent ID (default: auto-deploy-timestamp)
  -n, --network <network>  Network: TestNet, MainNet, DevNet (default: TestNet)
  -s, --seed <seed>       64-char hex seed (optional, will generate if not provided)
  -f, --fund <amount>     Auto-fund treasury with amount (optional)
  -h, --help             Show help

Example:
  bun run auto-deploy -a my-dao -n TestNet
  bun run auto-deploy -a my-dao -s b4d040c5080f0f123b9cb879fedf9f513eb9f50292380c7f0897c94a5ee79b94
        `);
        process.exit(0);
    }
  }
  
  console.log(`
╔════════════════════════════════════════╗
║   Automated DAO Deployment Script      ║
╠════════════════════════════════════════╣
║ Agent ID:  ${config.agentId.padEnd(28)} ║
║ Network:   ${config.networkId.padEnd(28)} ║
║ Auto-fund: ${(config.autoFund ? 'Yes' : 'No').padEnd(28)} ║
╚════════════════════════════════════════╝
  `);
  
  const manager = new AutoDeploymentManager(config);
  
  try {
    await manager.initialize();
    const contracts = await manager.deployContracts();
    
    console.log(`
╔════════════════════════════════════════════════════════════════════╗
║                    DEPLOYMENT SUCCESSFUL!                          ║
╠════════════════════════════════════════════════════════════════════╣
║ Funding Token:  ${contracts.fundingToken.padEnd(50)} ║
║ Vote Token:     ${contracts.voteToken.padEnd(50)} ║
║ DAO Voting:     ${contracts.daoVoting.padEnd(50)} ║
║ Marketplace:    ${contracts.marketplace.padEnd(50)} ║
╚════════════════════════════════════════════════════════════════════╝

✅ All contracts deployed and configured!
✅ Environment variables updated in .env
✅ Deployment record saved to .storage/deployments/${config.agentId}.json

Next steps:
1. Start the service: bun run dev
2. Register tokens: bun run register-tokens
3. Create proposals through the API
    `);
    
  } catch (error) {
    console.error('❌ Deployment failed:', error);
    process.exit(1);
  } finally {
    await manager.cleanup();
  }
}

// Run if called directly
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch(console.error);
}

export { AutoDeploymentManager, DeploymentConfig };