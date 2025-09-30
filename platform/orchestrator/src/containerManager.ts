import * as fs from 'fs/promises';
import * as path from 'path';
import * as crypto from 'crypto';
import { PlatformContractDeployer } from './contractDeployer';

interface UserConfig {
  userId: string;
  email: string;
  tier: 'basic' | 'premium' | 'enterprise';
  features: {
    wallet: boolean;
    dao: boolean;
    marketplace: boolean;
  };
  platforms: {
    discord?: { token: string; serverId: string };
    telegram?: { token: string };
    slack?: { token: string };
    twitter?: { apiKey: string; apiSecret: string };
  };
}

interface DeploymentProgress {
  status: 'deploying' | 'completed' | 'failed';
  stage: string;
  error?: string;
  tenantId?: string;
  walletAddress?: string;
  startedAt: Date;
  completedAt?: Date;
}

interface BotInfo {
  tenantId: string;
  userId: string;
  walletAddress: string;
  status: 'active' | 'stopped' | 'error';
  createdAt: Date;
  features: {
    wallet: boolean;
    dao: boolean;
    marketplace: boolean;
  };
  tier: 'basic' | 'premium' | 'enterprise';
}

/**
 * Simplified ContainerManager for Multi-Tenant Architecture
 * No Docker containers - all bots share one Eliza server on port 3004
 */
export class ContainerManager {
  private baseDir = process.env.USER_DATA_PATH || path.join(process.cwd(), '../../user-data');
  private activeBots: Map<string, BotInfo> = new Map();
  private contractDeployer: PlatformContractDeployer;
  private deploymentProgress: Map<string, DeploymentProgress> = new Map();
  private sharedElizaUrl = process.env.SHARED_ELIZA_URL || 'http://localhost:3004';
  private sharedElizaPort = 3004; // All bots use the shared server

  constructor() {
    console.log(`ContainerManager initialized (Multi-Tenant Mode)`);
    console.log(`Shared Eliza URL: ${this.sharedElizaUrl}`);
    this.contractDeployer = new PlatformContractDeployer(this.baseDir);
  }

  /**
   * Start async deployment - returns immediately with deployment ID
   */
  async startAsyncDeployment(config: UserConfig, deploymentId: string): Promise<DeploymentProgress> {
    // Initialize deployment progress tracking
    const progress: DeploymentProgress = {
      status: 'deploying',
      stage: 'initializing',
      startedAt: new Date()
    };
    this.deploymentProgress.set(deploymentId, progress);

    // Start deployment in background (don't await)
    this.createUserBot(config, deploymentId)
      .then((botInfo) => {
        // Update progress on success
        const finalProgress: DeploymentProgress = {
          status: 'completed',
          stage: 'completed',
          tenantId: botInfo.tenantId,
          walletAddress: botInfo.walletAddress,
          startedAt: progress.startedAt,
          completedAt: new Date()
        };
        this.deploymentProgress.set(deploymentId, finalProgress);
        console.log(`✅ Async deployment ${deploymentId} completed successfully`);
      })
      .catch((error) => {
        // Update progress on failure
        const failedProgress: DeploymentProgress = {
          status: 'failed',
          stage: 'failed',
          error: error.message,
          startedAt: progress.startedAt,
          completedAt: new Date()
        };
        this.deploymentProgress.set(deploymentId, failedProgress);
        console.error(`❌ Async deployment ${deploymentId} failed:`, error);
      });

    return progress;
  }

  /**
   * Get deployment progress
   */
  getDeploymentProgress(deploymentId: string): DeploymentProgress | null {
    return this.deploymentProgress.get(deploymentId) || null;
  }

  /**
   * Create a new user bot (registers with shared Eliza server)
   */
  async createUserBot(config: UserConfig, deploymentId?: string): Promise<BotInfo> {
    const updateProgress = (stage: string) => {
      if (deploymentId) {
        const current = this.deploymentProgress.get(deploymentId);
        if (current) {
          current.stage = stage;
          this.deploymentProgress.set(deploymentId, current);
        }
      }
    };

    updateProgress('generating_tenant_id');
    const tenantId = this.generateTenantId(config.userId);
    
    // 1. Create user directories
    updateProgress('creating_directories');
    await this.createUserDirectories(tenantId);
    
    // 2. Generate wallet seed
    updateProgress('generating_wallet');
    const walletSeed = await this.generateWalletSeed(tenantId);
    
    // 3. Register wallet with MCP service
    updateProgress('registering_wallet');
    await this.registerTenantWithMCP(tenantId);
    
    // 4. Get wallet address
    updateProgress('fetching_wallet_address');
    const walletAddress = await this.getWalletAddress(tenantId);
    
    // 5. Register bot with shared Eliza service (no container needed!)
    updateProgress('registering_with_shared_eliza');
    await this.registerBotWithSharedEliza(tenantId, config);
    
    // 6. Start DAO deployment in background if needed (non-blocking)
    if (config.tier === 'premium' || config.tier === 'enterprise' || config.features?.dao) {
      console.log(`Scheduling background DAO deployment for ${tenantId}...`);
      this.deployDAOInBackground(tenantId).catch(error => {
        console.error(`Background DAO deployment failed for ${tenantId}:`, error);
      });
    }
    
    // 7. Store bot info
    updateProgress('finalizing');
    const botInfo: BotInfo = {
      tenantId,
      userId: config.userId,
      walletAddress,
      status: 'active',
      createdAt: new Date(),
      features: config.features,
      tier: config.tier
    };
    
    this.activeBots.set(tenantId, botInfo);
    await this.saveBotInfo(botInfo);
    
    console.log(`✅ Bot ${tenantId} ready on shared Eliza service (port ${this.sharedElizaPort})`);
    
    return botInfo;
  }

  /**
   * Generate unique tenant ID
   */
  private generateTenantId(userId: string): string {
    return `user_${userId}_${Date.now()}`;
  }

  /**
   * Create user-specific directories
   */
  private async createUserDirectories(tenantId: string): Promise<void> {
    const dirs = [
      `${this.baseDir}/${tenantId}/storage/seeds`,
      `${this.baseDir}/${tenantId}/storage/wallet-backups`,
      `${this.baseDir}/${tenantId}/storage/transaction-db`,
      `${this.baseDir}/${tenantId}/logs`,
      `${this.baseDir}/${tenantId}/bot-config`
    ];

    for (const dir of dirs) {
      await fs.mkdir(dir, { recursive: true });
    }
  }

  /**
   * Generate wallet seed for user
   * Generates a 64-character hex seed (32 bytes) as required by Midnight
   */
  private async generateWalletSeed(tenantId: string): Promise<string> {
    // Generate 32 bytes = 64 hex characters (matching Midnight requirements)
    const seed = crypto.randomBytes(32).toString('hex');
    const seedPath = `${this.baseDir}/${tenantId}/storage/seeds/${tenantId}/seed`;
    
    await fs.mkdir(path.dirname(seedPath), { recursive: true });
    await fs.writeFile(seedPath, seed, { mode: 0o600 }); // Secure file permissions
    
    console.log(`Generated seed for tenant ${tenantId}: ${seed.substring(0, 8)}... (length: ${seed.length})`);
    return seed;
  }

  /**
   * Register tenant with MCP service for wallet management
   */
  private async registerTenantWithMCP(tenantId: string): Promise<void> {
    const mcpPort = process.env.MCP_PORT || '3001';
    const seedPath = `${this.baseDir}/${tenantId}/storage/seeds/${tenantId}/seed`;
    
    try {
      // Read the seed for this tenant
      const seed = await fs.readFile(seedPath, 'utf-8');
      
      // Register tenant with MCP
      const response = await fetch(`http://localhost:${mcpPort}/api/wallet/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tenantId,
          seed,
          metadata: {
            createdAt: new Date(),
            source: 'orchestrator'
          }
        })
      });
      
      if (!response.ok) {
        const error = await response.text();
        console.error(`Failed to register tenant ${tenantId} with MCP:`, error);
      } else {
        console.log(`✓ Tenant ${tenantId} registered with MCP service`);
      }
    } catch (error) {
      console.error(`Error registering tenant with MCP:`, error);
      // Non-critical - MCP may already have the tenant registered
    }
  }

  /**
   * Get wallet address for user from shared MCP service
   */
  private async getWalletAddress(tenantId: string): Promise<string> {
    const mcpPort = process.env.MCP_PORT || '3001';
    
    try {
      const response = await fetch(`http://localhost:${mcpPort}/api/wallet/${tenantId}/address`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'X-Tenant-ID': tenantId
        }
      });
      
      if (!response.ok) {
        throw new Error(`MCP returned status ${response.status}`);
      }
      
      const data: any = await response.json();
      return data.address || 'pending';
    } catch (error) {
      console.error(`Failed to get wallet address for ${tenantId}:`, error);
      // Return pending - address will be available once MCP initializes the wallet
      return 'pending';
    }
  }

  /**
   * Register bot with shared Eliza service
   */
  private async registerBotWithSharedEliza(tenantId: string, config: UserConfig): Promise<void> {
    try {
      const response = await fetch(`${this.sharedElizaUrl}/tenants/${tenantId}/bot`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-tenant-id': tenantId
        },
        body: JSON.stringify({
          name: `MidnightOS Bot ${tenantId.slice(-8)}`,
          bio: 'MidnightOS AI Assistant for blockchain operations',
          features: config.features,
          platforms: config.platforms,
          tier: config.tier
        })
      });

      if (!response.ok) {
        throw new Error(`Shared Eliza registration failed: ${response.status}`);
      }

      await response.json();
      console.log(`✅ Bot ${tenantId} registered with shared Eliza service`);

    } catch (error) {
      console.error(`❌ Failed to register bot ${tenantId} with shared Eliza:`, error);
      throw error;
    }
  }

  /**
   * Deploy DAO contracts in background (non-blocking)
   */
  private async deployDAOInBackground(tenantId: string): Promise<void> {
    try {
      console.log(`Starting background DAO deployment for ${tenantId}...`);
      
      // Use network ID from environment
      const networkId = process.env.NETWORK_ID === 'Undeployed' ? 'Undeployed' : 'TestNet';
      const contractAddresses = await this.contractDeployer.deployContractsForTenant(tenantId, networkId as any);
      await this.contractDeployer.updateTenantEnvironment(tenantId);
      
      console.log(`✅ Background DAO deployment completed for ${tenantId}`);
      
      // Optionally notify user that DAO features are now available
      // This could be done via websocket or polling endpoint
      
    } catch (error) {
      console.error(`❌ Background DAO deployment failed for ${tenantId}:`, error);
      // DAO features will remain unavailable, but bot continues to work
    }
  }

  /**
   * Stop user bot (just unregister from shared service)
   */
  async stopUserBot(tenantId: string): Promise<void> {
    const botInfo = this.activeBots.get(tenantId);
    if (!botInfo) throw new Error('Bot not found');
    
    botInfo.status = 'stopped';
    await this.saveBotInfo(botInfo);
  }

  /**
   * Delete user bot and all data
   */
  async deleteUserBot(tenantId: string): Promise<void> {
    await this.stopUserBot(tenantId);
    
    // Remove all user data
    const userDir = `${this.baseDir}/${tenantId}`;
    await fs.rm(userDir, { recursive: true, force: true });
    
    this.activeBots.delete(tenantId);
  }

  /**
   * Get bot status
   */
  async getBotStatus(tenantId: string): Promise<any> {
    try {
      // Check shared MCP service status
      const mcpPort = process.env.MCP_PORT || '3001';
      let mcpStatus = 'unknown';
      try {
        const response = await fetch(`http://localhost:${mcpPort}/health`);
        mcpStatus = response.ok ? 'running' : 'error';
      } catch {
        mcpStatus = 'offline';
      }
      
      // Check shared Eliza service status
      let elizaStatus = 'unknown';
      try {
        const response = await fetch(`${this.sharedElizaUrl}/health`);
        elizaStatus = response.ok ? 'running' : 'error';
      } catch {
        elizaStatus = 'offline';
      }
      
      return {
        mcp: mcpStatus,
        eliza: elizaStatus,
        shared: true
      };
    } catch (error) {
      return {
        mcp: 'unknown',
        eliza: 'unknown',
        shared: true
      };
    }
  }

  /**
   * Save bot info to database
   */
  private async saveBotInfo(info: BotInfo): Promise<void> {
    const infoFile = `${this.baseDir}/${info.tenantId}/bot-info.json`;
    await fs.writeFile(infoFile, JSON.stringify(info, null, 2));
  }

  /**
   * Load all active bots on startup
   */
  async loadActiveBots(): Promise<void> {
    try {
      const userDirs = await fs.readdir(this.baseDir);
      
      for (const dir of userDirs) {
        const infoFile = `${this.baseDir}/${dir}/bot-info.json`;
        try {
          const data = await fs.readFile(infoFile, 'utf-8');
          const info = JSON.parse(data) as BotInfo;
          this.activeBots.set(info.tenantId, info);
        } catch (error) {
          // Skip if no info file
        }
      }
      
      console.log(`Loaded ${this.activeBots.size} active bots`);
    } catch (error) {
      console.error('Failed to load active bots:', error);
    }
  }

  /**
   * Update user bot configuration
   */
  async updateUserBot(tenantId: string, config: UserConfig): Promise<void> {
    const botInfo = this.activeBots.get(tenantId);
    if (!botInfo) throw new Error('Bot not found');
    
    // Update bot configuration in shared Eliza
    await this.registerBotWithSharedEliza(tenantId, config);
    
    // Update bot info
    botInfo.features = config.features;
    await this.saveBotInfo(botInfo);
    
    this.activeBots.set(tenantId, botInfo);
  }

  /**
   * Get shared Eliza port (all bots use this)
   */
  getSharedElizaPort(): number {
    return this.sharedElizaPort;
  }

  /**
   * Legacy methods for backward compatibility with API
   */
  async startUserContainer(tenantId: string): Promise<void> {
    // No-op in multi-tenant mode (bot is always "running" on shared server)
    const botInfo = this.activeBots.get(tenantId);
    if (botInfo) {
      botInfo.status = 'active';
      await this.saveBotInfo(botInfo);
    }
  }

  async pauseBotContainer(tenantId: string): Promise<void> {
    // Just mark as stopped in multi-tenant mode
    await this.stopUserBot(tenantId);
  }

  async resumeBotContainer(tenantId: string): Promise<void> {
    // Just mark as active in multi-tenant mode
    await this.startUserContainer(tenantId);
  }

  async getContainerStatus(tenantId: string): Promise<any> {
    return this.getBotStatus(tenantId);
  }

  async getContainerLogs(tenantId: string, lines = 100): Promise<string> {
    // Return logs from shared Eliza service (not per-bot in multi-tenant)
    return `Multi-tenant mode: Check shared Eliza logs at ${this.sharedElizaUrl}/admin/tenants`;
  }

  async deleteUserContainer(tenantId: string): Promise<void> {
    return this.deleteUserBot(tenantId);
  }

  async updateUserContainer(tenantId: string, config: UserConfig): Promise<void> {
    return this.updateUserBot(tenantId, config);
  }

  async loadActiveContainers(): Promise<void> {
    return this.loadActiveBots();
  }
}
