#!/usr/bin/env node

/**
 * Automated DAO Deployment Script
 * Deploys all necessary contracts for a fully functional DAO treasury system
 */

import { ContractDeploymentService } from '../src/integrations/contract-deployment-service.js';
import { WalletServiceMCP } from '../src/mcp/index.js';
import { TestnetRemoteConfig } from '../src/wallet/index.js';
import { NetworkId } from '@midnight-ntwrk/midnight-js-network-id';
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
  networkId: 'TestNet' | 'MainNet' | 'DevNet' | 'Undeployed';
  seedPhrase?: string;
  autoFund?: boolean;
  fundAmount?: bigint;
  fundWallet?: boolean;
}

class AutoDeploymentManager {
  private logger = createLogger('auto-deploy');
  private deploymentService?: ContractDeploymentService;
  private walletService?: WalletServiceMCP;
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
    
    // Initialize wallet service first
    await this.initializeWalletService(seed);
    
    // Initialize deployment service with wallet provider
    await this.initializeDeploymentService();
    
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
    
    // Use provided seed phrase if available (from orchestrator)
    if (this.config.seedPhrase) {
      await fs.writeFile(seedPath, this.config.seedPhrase, { mode: 0o600 });
      this.logger.info('Using provided seed phrase for wallet');
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

  private async initializeWalletService(seed: string) {
    this.logger.info('Initializing wallet service...');
    
    // Determine network ID
    const networkId = this.config.networkId === 'MainNet' 
      ? NetworkId.MainNet 
      : this.config.networkId === 'DevNet' 
      ? NetworkId.DevNet 
      : this.config.networkId === 'Undeployed'
      ? NetworkId.Undeployed
      : NetworkId.TestNet;
    
    // Create wallet config for external proof server
    const walletConfig = new TestnetRemoteConfig();
    if (this.config.networkId === 'TestNet') {
      walletConfig.indexer = process.env.INDEXER || 'https://indexer.testnet-02.midnight.network/api/v1/graphql';
      walletConfig.indexerWS = process.env.INDEXER_WS || 'wss://indexer.testnet-02.midnight.network/api/v1/graphql/ws';
      walletConfig.node = process.env.MN_NODE || 'https://rpc.testnet-02.midnight.network';
      // Use local proof server or environment variable
      walletConfig.proofServer = process.env.PROOF_SERVER || 'http://localhost:6300';
    } else if (this.config.networkId === 'Undeployed') {
      walletConfig.indexer = process.env.INDEXER || 'http://localhost:8088/api/v1/graphql';
      walletConfig.indexerWS = process.env.INDEXER_WS || 'ws://localhost:8088/api/v1/graphql/ws';
      walletConfig.node = process.env.MN_NODE || 'http://localhost:9944';
      walletConfig.proofServer = process.env.PROOF_SERVER || 'http://localhost:6300';
    }
    
    // Create wallet filename
    const walletFilename = `agent-${this.config.agentId}-wallet`;
    
    // Initialize wallet service
    this.walletService = new WalletServiceMCP(
      networkId,
      seed,
      walletFilename,
      walletConfig
    );
    
    // If wallet funding is enabled, fund the wallet first (but wait for wallet to be ready)
    if (this.config.fundWallet) {
      // Wait for wallet to be ready first
      while (!this.walletService.isReady()) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
      await this.fundWallet();
    }
    
    // Wait for wallet to be ready and funds to arrive
    this.logger.info('Waiting for wallet to sync and receive funds...');
    this.logger.info('This may take 60-120 seconds for blockchain sync and fund confirmation');
    
    // Step 1: Wait for wallet to be synced
    let attempts = 0;
    const maxAttempts = 60; // 120 seconds total
    while (!this.walletService.isReady() && attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 2000));
      attempts++;
      if (attempts % 10 === 0) {
        this.logger.info(`Wallet sync in progress... (${attempts * 2}s elapsed)`);
      }
    }
    
    if (!this.walletService.isReady()) {
      throw new Error(`Wallet failed to sync after ${maxAttempts * 2} seconds`);
    }
    
    this.logger.info('Wallet synced, now waiting for funds to arrive...');
    
    // Step 2: Wait for wallet to actually have funds (balance > 0)
    let fundAttempts = 0;
    const maxFundAttempts = 90; // 180 seconds (3 minutes) to wait for funds - increased for blockchain sync
    let currentBalance = '0';
    
    while (fundAttempts < maxFundAttempts) {
      try {
        const balanceInfo = this.walletService.getBalance();
        currentBalance = balanceInfo.balance;
        
        // Balance might be a decimal string like "497.166285", convert to float for comparison
        const balanceNum = parseFloat(currentBalance);
        
        if (balanceNum > 0) {
          this.logger.info(`✅ Funds received! Balance: ${currentBalance}`);
          break;
        }
        
        if (fundAttempts % 5 === 0 && fundAttempts > 0) {
          const syncStatus = await this.walletService.getSyncStatus();
          this.logger.info(`Waiting for funds... (${fundAttempts * 2}s elapsed, balance: ${currentBalance})`);
          this.logger.info(`Sync status: synced=${syncStatus.isSynced}, applyGap=${syncStatus.applyGap}, sourceGap=${syncStatus.sourceGap}`);
        }
      } catch (error) {
        // Wallet might not be fully ready yet
      }
      
      await new Promise(resolve => setTimeout(resolve, 2000));
      fundAttempts++;
    }
    
    // Check if we have funds using float comparison
    if (parseFloat(currentBalance) === 0) {
      throw new Error(`Wallet has no funds after ${maxFundAttempts * 2} seconds. Please ensure the wallet was funded before deployment.`);
    }
    
    this.logger.info('Wallet service initialized and ready with sufficient funds');
  }

  private async initializeDeploymentService() {
    // Set up environment
    process.env.AGENT_ID = this.config.agentId;
    process.env.NETWORK_ID = this.config.networkId;
    process.env.USE_EXTERNAL_PROOF_SERVER = 'true';
    
    // Set network endpoints based on networkId
    if (this.config.networkId === 'TestNet') {
      process.env.PROOF_SERVER = 'http://localhost:6300';
      process.env.INDEXER = 'https://indexer.testnet-02.midnight.network/api/v1/graphql';
      process.env.INDEXER_WS = 'wss://indexer.testnet-02.midnight.network/api/v1/graphql/ws';
      process.env.MN_NODE = 'https://rpc.testnet-02.midnight.network';
    } else if (this.config.networkId === 'Undeployed') {
      process.env.PROOF_SERVER = 'http://localhost:6300';
      process.env.INDEXER = 'http://localhost:8088/api/v1/graphql';
      process.env.INDEXER_WS = 'ws://localhost:8088/api/v1/graphql/ws';
      process.env.MN_NODE = 'http://localhost:9944';
    }
    
    // Initialize deployment service with config
    const deploymentConfig = {
      network: this.config.networkId.toLowerCase() as 'testnet' | 'mainnet' | 'local',
      indexerUrl: process.env.INDEXER || 'https://indexer.testnet-02.midnight.network/api/v1/graphql',
      indexerWsUrl: process.env.INDEXER_WS || 'wss://indexer.testnet-02.midnight.network/api/v1/graphql/ws',
      nodeUrl: process.env.MN_NODE || 'https://rpc.testnet-02.midnight.network',
      proofServerUrl: process.env.PROOF_SERVER || 'http://localhost:6300'
    };
    
    this.deploymentService = new ContractDeploymentService(this.logger, deploymentConfig);
    
    // Get wallet provider from wallet service
    const walletProvider = await this.walletService!.getWalletProvider();
    await this.deploymentService.initialize(walletProvider);
    
    this.logger.info('Contract deployment service initialized');
  }

  async deployContracts() {
    if (!this.deploymentService) {
      throw new Error('Deployment service not initialized');
    }

    this.logger.info('Starting automated contract deployment...');
    
    try {
      // Deploy complete DAO with treasury using the public method
      this.logger.info('Deploying complete DAO treasury system...');
      
      const initialFunding = this.config.autoFund && this.config.fundAmount 
        ? this.config.fundAmount 
        : undefined;
      
      const deployment = await this.deploymentService.deployTreasuryDAO(
        undefined, // adminPublicKey - let it default
        initialFunding
      );
      
      this.logger.info(`DAO Voting Contract deployed: ${deployment.daoVotingContract.contractAddress}`);
      this.logger.info(`Funding Token deployed: ${deployment.fundingTokenContract.contractAddress}`);
      this.logger.info(`Vote Token deployed: ${deployment.voteTokenContract.contractAddress}`);
      this.logger.info(`Treasury Address: ${deployment.treasuryAddress}`);
      
      // Save deployment configuration
      await this.saveDeploymentConfig({
        fundingToken: deployment.fundingTokenContract.contractAddress,
        voteToken: deployment.voteTokenContract.contractAddress,
        daoVoting: deployment.daoVotingContract.contractAddress,
        treasuryAddress: deployment.treasuryAddress,
        deploymentInfo: {
          daoVoting: deployment.daoVotingContract,
          fundingToken: deployment.fundingTokenContract,
          voteToken: deployment.voteTokenContract
        }
      });
      
      this.logger.info('All contracts deployed successfully!');
      
      return {
        fundingToken: deployment.fundingTokenContract.contractAddress,
        voteToken: deployment.voteTokenContract.contractAddress,
        daoVoting: deployment.daoVotingContract.contractAddress,
        treasuryAddress: deployment.treasuryAddress
      };
    } catch (error) {
      this.logger.error('Contract deployment failed:', error);
      throw error;
    }
  }

  private async fundTreasury(daoAddress: string, amount: bigint) {
    this.logger.info(`Treasury funding requested for ${amount} tokens`);
    // Initial funding is handled during deployment if specified
    this.logger.info('Treasury funding handled during deployment');
  }

  private async fundWallet() {
    this.logger.info('Auto-funding wallet from genesis wallet...');
    
    try {
      // Get the wallet address
      const walletAddress = this.walletService.getAddress();
      this.logger.info(`Funding wallet ${walletAddress} with 500 NIGHT...`);
      
      // Use the funding script to fund the wallet
      const { exec } = await import('child_process');
      const { promisify } = await import('util');
      const execAsync = promisify(exec);
      
      const fundCommand = `pnpm tsx scripts/fund-from-genesis.ts --address "${walletAddress}" --amount 500`;
      
      const { stdout, stderr } = await execAsync(fundCommand);
      
      if (stderr && !stderr.includes('warning')) {
        this.logger.error('Funding error:', stderr);
        throw new Error(`Failed to fund wallet: ${stderr}`);
      }
      
      this.logger.info('Wallet funding transaction submitted');
      this.logger.info(stdout);
      
    } catch (error: any) {
      this.logger.error('Failed to auto-fund wallet:', error.message);
      throw error;
    }
  }

  private async saveDeploymentConfig(addresses: any) {
    // Update .env file with deployed addresses
    const envContent = await fs.readFile(this.envPath, 'utf-8').catch(() => '');
    
    const updates = [
      `FUNDING_TOKEN_ADDRESS=${addresses.fundingToken}`,
      `DAO_VOTE_TOKEN_ADDRESS=${addresses.voteToken}`,
      `DAO_VOTING_ADDRESS=${addresses.daoVoting}`,
      `TREASURY_ADDRESS=${addresses.treasuryAddress || ''}`,
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
    // Cleanup is handled automatically by the services
    this.logger.info('Cleanup complete');
  }
}

// CLI interface
async function main() {
  const args = process.argv.slice(2);
  
  // Parse command line arguments
  const config: DeploymentConfig = {
    agentId: process.env.AGENT_ID || 'auto-deploy-' + Date.now(),
    networkId: (process.env.NETWORK_ID || 'TestNet') as any,
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
      case '--fund-wallet':
        config.fundWallet = true;
        break;
      case '--help':
      case '-h':
        console.log(`
Automated DAO Deployment Script

Usage: bun run auto-deploy [options]

Options:
  -a, --agent-id <id>     Agent ID (default: auto-deploy-timestamp)
  -n, --network <network>  Network: TestNet, MainNet, DevNet, Undeployed (default: from env or TestNet)
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
║ Treasury:       ${(contracts.treasuryAddress || 'N/A').padEnd(50)} ║
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