/**
 * Contract Deployer for Platform Integration
 * Automatically deploys DAO contracts when users deploy bots
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as crypto from 'crypto';

const execAsync = promisify(exec);

interface DeploymentResult {
  fundingToken: string;
  voteToken: string;
  daoVoting: string;
  marketplace: string;
  seed: string;
  address: string;
}

export class PlatformContractDeployer {
  private basePath: string;
  private mcpServicePath: string;

  constructor(basePath: string = process.env.USER_DATA_PATH || './user-data') {
    this.basePath = basePath;
    // Use relative path from orchestrator to midnight-mcp service
    // In production, use MCP_SERVICE_PATH env var or calculate from current working directory
    this.mcpServicePath = process.env.MCP_SERVICE_PATH || 
      path.resolve(process.cwd(), '../../services/midnight-mcp');
  }

  /**
   * Deploy contracts for a new tenant/bot
   */
  async deployContractsForTenant(
    tenantId: string,
    networkId: 'TestNet' | 'MainNet' | 'DevNet' = 'TestNet'
  ): Promise<DeploymentResult> {
    console.log(`Deploying contracts for tenant ${tenantId}...`);

    try {
      // Generate seed for tenant
      const seed = await this.generateSeed();
      
      // Save seed to tenant storage
      const seedPath = path.join(this.basePath, tenantId, 'storage/seeds', tenantId, 'seed');
      await fs.mkdir(path.dirname(seedPath), { recursive: true });
      await fs.writeFile(seedPath, seed, { mode: 0o600 });

      // Run auto-deploy script
      const command = `cd ${this.mcpServicePath} && bun run auto-deploy -a ${tenantId} -n ${networkId} -s ${seed}`;
      const { stdout, stderr } = await execAsync(command, {
        env: {
          ...process.env,
          AGENT_ID: tenantId,
          NETWORK_ID: networkId,
          USE_EXTERNAL_PROOF_SERVER: 'true',
          PROOF_SERVER: this.getProofServer(networkId),
          INDEXER: this.getIndexer(networkId),
          INDEXER_WS: this.getIndexerWS(networkId),
          MN_NODE: this.getMnNode(networkId)
        }
      });

      if (stderr && !stderr.includes('warning')) {
        console.error('Deployment stderr:', stderr);
      }

      // Parse deployment result
      const result = await this.parseDeploymentResult(stdout, tenantId);
      
      // Save deployment info to tenant config
      await this.saveDeploymentConfig(tenantId, result);

      console.log(`Contracts deployed successfully for tenant ${tenantId}`);
      return result;

    } catch (error) {
      console.error(`Failed to deploy contracts for tenant ${tenantId}:`, error);
      throw error;
    }
  }

  /**
   * Check if contracts are already deployed for a tenant
   */
  async hasDeployedContracts(tenantId: string): Promise<boolean> {
    try {
      const configPath = path.join(this.basePath, tenantId, 'config/contracts.json');
      await fs.access(configPath);
      const config = JSON.parse(await fs.readFile(configPath, 'utf-8'));
      return !!(config.fundingToken && config.voteToken && config.daoVoting);
    } catch {
      return false;
    }
  }

  /**
   * Get deployed contracts for a tenant
   */
  async getDeployedContracts(tenantId: string): Promise<DeploymentResult | null> {
    try {
      const configPath = path.join(this.basePath, tenantId, 'config/contracts.json');
      const config = JSON.parse(await fs.readFile(configPath, 'utf-8'));
      return config;
    } catch {
      return null;
    }
  }

  /**
   * Generate DAO configuration string for environment variable
   */
  async generateDaoConfig(tenantId: string): Promise<string | null> {
    const contracts = await this.getDeployedContracts(tenantId);
    if (!contracts) return null;

    // Format: CONTRACT_ADDRESS:VOTE_COIN_COLOR:VOTE_COIN_VALUE:FUND_COIN_COLOR:FUND_COIN_VALUE:DESCRIPTION
    // Using default coin colors and values for now
    const daoConfig = `${contracts.daoVoting}:0:1000000:1:1000000:DAO for ${tenantId}`;
    return daoConfig;
  }

  /**
   * Update tenant's environment with contract addresses
   */
  async updateTenantEnvironment(tenantId: string): Promise<void> {
    const contracts = await this.getDeployedContracts(tenantId);
    if (!contracts) {
      throw new Error(`No contracts found for tenant ${tenantId}`);
    }

    const envPath = path.join(this.basePath, tenantId, '.env');
    
    // Read existing env or create new
    let envContent = '';
    try {
      envContent = await fs.readFile(envPath, 'utf-8');
    } catch {
      // File doesn't exist, will create
    }

    // Add/update contract addresses
    const updates = {
      FUNDING_TOKEN_ADDRESS: contracts.fundingToken,
      DAO_VOTE_TOKEN_ADDRESS: contracts.voteToken,
      DAO_VOTING_ADDRESS: contracts.daoVoting,
      MARKETPLACE_ADDRESS: contracts.marketplace,
      DAO: await this.generateDaoConfig(tenantId)
    };

    for (const [key, value] of Object.entries(updates)) {
      if (value) {
        const regex = new RegExp(`^${key}=.*$`, 'm');
        if (regex.test(envContent)) {
          envContent = envContent.replace(regex, `${key}=${value}`);
        } else {
          envContent += `\n${key}=${value}`;
        }
      }
    }

    await fs.writeFile(envPath, envContent);
    console.log(`Updated environment for tenant ${tenantId} with contract addresses`);
  }

  // Helper methods

  private async generateSeed(): Promise<string> {
    return crypto.randomBytes(32).toString('hex');
  }

  private getProofServer(networkId: string): string {
    switch (networkId) {
      case 'TestNet':
        return 'https://rpc-proof-devnet.midnight.network:8443';
      case 'MainNet':
        return 'https://rpc-proof-mainnet.midnight.network:8443';
      default:
        return 'http://localhost:8443';
    }
  }

  private getIndexer(networkId: string): string {
    switch (networkId) {
      case 'TestNet':
        return 'https://indexer.testnet-02.midnight.network/api/v1/graphql';
      case 'MainNet':
        return 'https://indexer.mainnet.midnight.network/api/v1/graphql';
      default:
        return 'http://localhost:8080/api/v1/graphql';
    }
  }

  private getIndexerWS(networkId: string): string {
    switch (networkId) {
      case 'TestNet':
        return 'wss://indexer.testnet-02.midnight.network/api/v1/graphql/ws';
      case 'MainNet':
        return 'wss://indexer.mainnet.midnight.network/api/v1/graphql/ws';
      default:
        return 'ws://localhost:8080/api/v1/graphql/ws';
    }
  }

  private getMnNode(networkId: string): string {
    switch (networkId) {
      case 'TestNet':
        return 'https://rpc.testnet-02.midnight.network';
      case 'MainNet':
        return 'https://rpc.mainnet.midnight.network';
      default:
        return 'http://localhost:3000';
    }
  }

  private async parseDeploymentResult(output: string, tenantId: string): Promise<DeploymentResult> {
    // Parse the deployment output to extract contract addresses
    const fundingTokenMatch = output.match(/Funding Token:\s+(\w+)/);
    const voteTokenMatch = output.match(/Vote Token:\s+(\w+)/);
    const daoVotingMatch = output.match(/DAO Voting:\s+(\w+)/);
    const marketplaceMatch = output.match(/Marketplace:\s+(\w+)/);

    if (!fundingTokenMatch || !voteTokenMatch || !daoVotingMatch || !marketplaceMatch) {
      // If parsing fails, check the deployment record file
      const recordPath = path.join(this.mcpServicePath, `.storage/deployments/${tenantId}.json`);
      try {
        const record = JSON.parse(await fs.readFile(recordPath, 'utf-8'));
        return {
          fundingToken: record.contracts.fundingToken,
          voteToken: record.contracts.voteToken,
          daoVoting: record.contracts.daoVoting,
          marketplace: record.contracts.marketplace,
          seed: await this.getSeedForTenant(tenantId),
          address: '' // Will be filled later from wallet
        };
      } catch (error) {
        throw new Error('Failed to parse deployment result');
      }
    }

    return {
      fundingToken: fundingTokenMatch[1],
      voteToken: voteTokenMatch[1],
      daoVoting: daoVotingMatch[1],
      marketplace: marketplaceMatch[1],
      seed: await this.getSeedForTenant(tenantId),
      address: '' // Will be filled later from wallet
    };
  }

  private async getSeedForTenant(tenantId: string): Promise<string> {
    const seedPath = path.join(this.basePath, tenantId, 'storage/seeds', tenantId, 'seed');
    return await fs.readFile(seedPath, 'utf-8');
  }

  private async saveDeploymentConfig(tenantId: string, result: DeploymentResult): Promise<void> {
    const configPath = path.join(this.basePath, tenantId, 'config/contracts.json');
    await fs.mkdir(path.dirname(configPath), { recursive: true });
    
    const config = {
      ...result,
      deployedAt: new Date().toISOString(),
      tenantId
    };
    
    await fs.writeFile(configPath, JSON.stringify(config, null, 2));
  }
}

// Export for use in containerManager
export default PlatformContractDeployer;