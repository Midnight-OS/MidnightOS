import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as crypto from 'crypto';
import { PlatformContractDeployer } from './contractDeployer';

const execAsync = promisify(exec);

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

export class ContainerManager {
  private baseDir = process.env.USER_DATA_PATH || path.join(process.cwd(), '../../user-data');
  private portAllocator: PortAllocator;
  private activeContainers: Map<string, ContainerInfo> = new Map();
  private contractDeployer: PlatformContractDeployer;

  constructor() {
    const portStart = parseInt(process.env.PORT_RANGE_START || '4000');
    const portEnd = parseInt(process.env.PORT_RANGE_END || '5000');
    this.portAllocator = new PortAllocator(portStart, portEnd);
    this.contractDeployer = new PlatformContractDeployer(this.baseDir);
  }

  /**
   * Create a new user container with Eliza agent (connects to shared MCP)
   */
  async createUserContainer(config: UserConfig): Promise<ContainerInfo> {
    const tenantId = this.generateTenantId(config.userId);
    const elizaPort = await this.portAllocator.allocatePort(tenantId);
    
    // 1. Create user directories
    await this.createUserDirectories(tenantId);
    
    // 2. Generate wallet seed
    const walletSeed = await this.generateWalletSeed(tenantId);
    
    // 3. Deploy DAO contracts if tier includes it
    let contractAddresses = null;
    if (config.tier === 'premium' || config.tier === 'enterprise' || config.features?.dao) {
      console.log(`Deploying DAO contracts for ${tenantId}...`);
      try {
        contractAddresses = await this.contractDeployer.deployContractsForTenant(tenantId, 'TestNet');
        await this.contractDeployer.updateTenantEnvironment(tenantId);
        console.log(`DAO contracts deployed successfully for ${tenantId}`);
      } catch (error) {
        console.error(`Failed to deploy contracts for ${tenantId}, continuing without DAO:`, error);
        // Continue without DAO features if deployment fails
      }
    }
    
    // 4. Create Docker Compose file from template (only Eliza agent)
    const dockerComposeFile = await this.generateDockerCompose(tenantId, config, elizaPort);
    
    // 5. Start the Eliza agent container
    await this.startContainers(tenantId, dockerComposeFile);
    
    // 6. Store container info
    const containerInfo: ContainerInfo = {
      tenantId,
      userId: config.userId,
      elizaPort,
      walletAddress: await this.getWalletAddress(tenantId),
      status: 'running',
      createdAt: new Date(),
      features: config.features,
      tier: config.tier
    };
    
    this.activeContainers.set(tenantId, containerInfo);
    await this.saveContainerInfo(containerInfo);
    
    return containerInfo;
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
   * Get resource limits based on tier
   */
  private getResourceLimits(tier: 'basic' | 'premium' | 'enterprise') {
    switch (tier) {
      case 'basic':
        return {
          memory: process.env.TIER_BASIC_MEMORY || '256M',
          cpu: process.env.TIER_BASIC_CPU || '0.25',
          memoryReservation: '128M',
          cpuReservation: '0.1'
        };
      case 'premium':
        return {
          memory: process.env.TIER_PREMIUM_MEMORY || '512M',
          cpu: process.env.TIER_PREMIUM_CPU || '0.5',
          memoryReservation: '256M',
          cpuReservation: '0.25'
        };
      case 'enterprise':
        return {
          memory: process.env.TIER_ENTERPRISE_MEMORY || '1024M',
          cpu: process.env.TIER_ENTERPRISE_CPU || '1.0',
          memoryReservation: '512M',
          cpuReservation: '0.5'
        };
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
   * Generate Docker Compose file for user's Eliza agent
   */
  private async generateDockerCompose(
    tenantId: string, 
    config: UserConfig, 
    elizaPort: number
  ): Promise<string> {
    const templatePath = path.join(__dirname, '../../../docker/docker-compose.template.yml');
    const template = await fs.readFile(templatePath, 'utf-8');
    
    // Set resource limits based on tier
    const limits = this.getResourceLimits(config.tier);
    
    // Get project root directory
    const projectRoot = path.resolve(__dirname, '../../..');
    
    const dockerCompose = template
      .replace(/{{PROJECT_ROOT}}/g, projectRoot)
      .replace(/{{TENANT_ID}}/g, tenantId)
      .replace(/{{ELIZA_PORT}}/g, elizaPort.toString())
      .replace(/{{CREATED_AT}}/g, new Date().toISOString())
      .replace(/{{TIER}}/g, config.tier)
      .replace(/{{DISCORD_TOKEN}}/g, config.platforms.discord?.token || '')
      .replace(/{{TELEGRAM_TOKEN}}/g, config.platforms.telegram?.token || '')
      .replace(/{{TWITTER_API_KEY}}/g, config.platforms.twitter?.apiKey || '')
      .replace(/{{TWITTER_API_SECRET}}/g, config.platforms.twitter?.apiSecret || '')
      .replace(/{{OPENAI_API_KEY}}/g, process.env.OPENAI_API_KEY || '')
      .replace(/{{ANTHROPIC_API_KEY}}/g, process.env.ANTHROPIC_API_KEY || '')
      .replace(/{{DATABASE_URL}}/g, process.env.DATABASE_URL || '')
      .replace(/{{LOG_LEVEL}}/g, process.env.LOG_LEVEL || 'info')
      .replace(/{{MEMORY_LIMIT}}/g, limits.memory)
      .replace(/{{CPU_LIMIT}}/g, limits.cpu)
      .replace(/{{MEMORY_RESERVATION}}/g, limits.memoryReservation)
      .replace(/{{CPU_RESERVATION}}/g, limits.cpuReservation);
    
    const dockerComposeFile = `${this.baseDir}/${tenantId}/docker-compose.yml`;
    await fs.writeFile(dockerComposeFile, dockerCompose);
    
    return dockerComposeFile;
  }

  /**
   * Start Docker containers for user
   */
  private async startContainers(tenantId: string, dockerComposeFile: string): Promise<void> {
    const dir = path.dirname(dockerComposeFile);
    
    try {
      // Start containers in detached mode
      await execAsync(`docker compose up -d`, { cwd: dir });
      
      // Wait for containers to be healthy
      await this.waitForHealthy(tenantId);
    } catch (error) {
      console.error(`Failed to start containers for ${tenantId}:`, error);
      throw new Error('Container startup failed');
    }
  }

  /**
   * Wait for Eliza agent container to be healthy
   */
  private async waitForHealthy(tenantId: string, maxRetries = 30): Promise<void> {
    for (let i = 0; i < maxRetries; i++) {
      try {
        const { stdout } = await execAsync(
          `docker inspect eliza-agent-${tenantId} --format='{{.State.Status}}'`
        );
        
        if (stdout.trim() === 'running') {
          // Check if Eliza agent is responding
          const elizaPort = this.activeContainers.get(tenantId)?.elizaPort;
          if (elizaPort) {
            const response = await fetch(`http://localhost:${elizaPort}/health`);
            if (response.ok) return;
          }
        }
      } catch (error) {
        // Container not ready yet
      }
      
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
    
    throw new Error('Container failed to become healthy');
  }

  /**
   * Get wallet address for user from shared MCP service
   */
  private async getWalletAddress(tenantId: string): Promise<string> {
    // Connect to shared MCP service on port 3001
    const mcpPort = process.env.MCP_PORT || '3001';
    
    try {
      // First, register the tenant with MCP service if needed
      await this.registerTenantWithMCP(tenantId);
      
      // Then get the wallet address
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
   * Stop user container
   */
  async stopUserContainer(tenantId: string): Promise<void> {
    const containerInfo = this.activeContainers.get(tenantId);
    if (!containerInfo) throw new Error('Container not found');
    
    const dockerComposeFile = `${this.baseDir}/${tenantId}/docker-compose.yml`;
    const dir = path.dirname(dockerComposeFile);
    
    try {
      await execAsync(`docker compose down`, { cwd: dir });
      
      containerInfo.status = 'stopped';
      await this.saveContainerInfo(containerInfo);
      
      // Release port
      this.portAllocator.releasePort(containerInfo.elizaPort);
    } catch (error) {
      console.error(`Failed to stop containers for ${tenantId}:`, error);
      throw error;
    }
  }

  /**
   * Delete user container and all data
   */
  async deleteUserContainer(tenantId: string): Promise<void> {
    await this.stopUserContainer(tenantId);
    
    // Remove all user data
    const userDir = `${this.baseDir}/${tenantId}`;
    await fs.rm(userDir, { recursive: true, force: true });
    
    this.activeContainers.delete(tenantId);
  }

  /**
   * Get container logs
   */
  async getContainerLogs(tenantId: string, lines = 100): Promise<string> {
    try {
      const { stdout } = await execAsync(
        `docker logs eliza-agent-${tenantId} --tail ${lines}`
      );
      return stdout;
    } catch (error) {
      console.error(`Failed to get logs for ${tenantId}:`, error);
      return 'Error retrieving logs';
    }
  }

  /**
   * Save container info to database
   */
  private async saveContainerInfo(info: ContainerInfo): Promise<void> {
    const infoFile = `${this.baseDir}/${info.tenantId}/container-info.json`;
    await fs.writeFile(infoFile, JSON.stringify(info, null, 2));
  }

  /**
   * Load all active containers on startup
   */
  async loadActiveContainers(): Promise<void> {
    try {
      const userDirs = await fs.readdir(this.baseDir);
      
      for (const dir of userDirs) {
        const infoFile = `${this.baseDir}/${dir}/container-info.json`;
        try {
          const data = await fs.readFile(infoFile, 'utf-8');
          const info = JSON.parse(data) as ContainerInfo;
          this.activeContainers.set(info.tenantId, info);
        } catch (error) {
          // Skip if no info file
        }
      }
    } catch (error) {
      console.error('Failed to load active containers:', error);
    }
  }

  /**
   * Start user container
   */
  async startUserContainer(tenantId: string): Promise<void> {
    const containerInfo = this.activeContainers.get(tenantId);
    if (!containerInfo) throw new Error('Container not found');
    
    const dockerComposeFile = `${this.baseDir}/${tenantId}/docker-compose.yml`;
    const dir = path.dirname(dockerComposeFile);
    
    try {
      await execAsync(`docker compose up -d`, { cwd: dir });
      await this.waitForHealthy(tenantId);
      
      containerInfo.status = 'running';
      await this.saveContainerInfo(containerInfo);
    } catch (error) {
      console.error(`Failed to start containers for ${tenantId}:`, error);
      throw error;
    }
  }

  /**
   * Pause Eliza agent container
   */
  async pauseBotContainer(tenantId: string): Promise<void> {
    const dir = `${this.baseDir}/${tenantId}`;
    
    try {
      // Stop only the Eliza agent container
      await execAsync(`docker compose stop eliza-agent-${tenantId}`, { cwd: dir });
      
      const containerInfo = this.activeContainers.get(tenantId);
      if (containerInfo) {
        containerInfo.status = 'stopped';
        await this.saveContainerInfo(containerInfo);
      }
    } catch (error) {
      console.error(`Failed to pause bot container for ${tenantId}:`, error);
      throw error;
    }
  }

  /**
   * Resume Eliza agent container
   */
  async resumeBotContainer(tenantId: string): Promise<void> {
    const dir = `${this.baseDir}/${tenantId}`;
    
    try {
      // Start only the Eliza agent container
      await execAsync(`docker compose start eliza-agent-${tenantId}`, { cwd: dir });
      
      const containerInfo = this.activeContainers.get(tenantId);
      if (containerInfo) {
        containerInfo.status = 'running';
        await this.saveContainerInfo(containerInfo);
      }
    } catch (error) {
      console.error(`Failed to resume bot container for ${tenantId}:`, error);
      throw error;
    }
  }

  /**
   * Get container status
   */
  async getContainerStatus(tenantId: string): Promise<any> {
    try {
      const { stdout: elizaStatus } = await execAsync(
        `docker inspect eliza-agent-${tenantId} --format='{{.State.Status}}'`
      );
      
      // Check shared MCP service status
      const mcpPort = process.env.MCP_PORT || '3001';
      let mcpStatus = 'unknown';
      try {
        const response = await fetch(`http://localhost:${mcpPort}/health`);
        mcpStatus = response.ok ? 'running' : 'error';
      } catch {
        mcpStatus = 'offline';
      }
      
      return {
        eliza: elizaStatus.trim(),
        mcp: mcpStatus
      };
    } catch (error) {
      return {
        wallet: 'unknown',
        bot: 'unknown'
      };
    }
  }

  /**
   * Update user container configuration and restart
   */
  async updateUserContainer(tenantId: string, config: UserConfig): Promise<void> {
    const containerInfo = this.activeContainers.get(tenantId);
    if (!containerInfo) throw new Error('Container not found');
    
    // 1. Stop current containers
    await this.stopUserContainer(tenantId);
    
    // 2. Regenerate docker-compose with new config
    const dockerComposeFile = await this.generateDockerCompose(
      tenantId, 
      config, 
      containerInfo.elizaPort
    );
    
    // 3. Start containers with new configuration
    await this.startContainers(tenantId, dockerComposeFile);
    
    // 4. Update container info
    containerInfo.features = config.features;
    containerInfo.status = 'running';
    await this.saveContainerInfo(containerInfo);
    
    // 5. Re-add to active containers
    this.activeContainers.set(tenantId, containerInfo);
  }
}

/**
 * Port allocator for user containers
 */
class PortAllocator {
  private usedPorts: Set<number> = new Set();
  
  constructor(
    private startPort: number, 
    private endPort: number
  ) {}
  
  async allocatePort(tenantId: string): Promise<number> {
    for (let port = this.startPort; port <= this.endPort; port++) {
      if (!this.usedPorts.has(port) && await this.isPortAvailable(port)) {
        this.usedPorts.add(port);
        return port;
      }
    }
    throw new Error('No available ports');
  }
  
  releasePort(port: number): void {
    this.usedPorts.delete(port);
  }
  
  private async isPortAvailable(port: number): Promise<boolean> {
    try {
      const { stdout } = await execAsync(`lsof -i :${port}`);
      return stdout.trim() === '';
    } catch {
      return true; // Port is available
    }
  }
}

interface ContainerInfo {
  tenantId: string;
  userId: string;
  elizaPort: number;
  walletAddress: string;
  status: 'running' | 'stopped' | 'error';
  createdAt: Date;
  features: {
    wallet: boolean;
    dao: boolean;
    marketplace: boolean;
  };
  tier: 'basic' | 'premium' | 'enterprise';
}