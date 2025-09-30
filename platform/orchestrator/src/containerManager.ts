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

interface DeploymentProgress {
  status: 'deploying' | 'completed' | 'failed';
  stage: string;
  error?: string;
  tenantId?: string;
  walletAddress?: string;
  elizaPort?: number;
  startedAt: Date;
  completedAt?: Date;
}

export class ContainerManager {
  private baseDir = process.env.USER_DATA_PATH || path.join(process.cwd(), '../../user-data');
  private portAllocator: PortAllocator;
  private activeContainers: Map<string, ContainerInfo> = new Map();
  private contractDeployer: PlatformContractDeployer;
  private deploymentProgress: Map<string, DeploymentProgress> = new Map();

  constructor() {
    const portStart = parseInt(process.env.PORT_RANGE_START || '4000');
    const portEnd = parseInt(process.env.PORT_RANGE_END || '5000');
    console.log(`ContainerManager initialized with port range: ${portStart}-${portEnd}`);
    this.portAllocator = new PortAllocator(portStart, portEnd);
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
    this.createUserContainer(config, deploymentId)
      .then((containerInfo) => {
        // Update progress on success
        const finalProgress: DeploymentProgress = {
          status: 'completed',
          stage: 'completed',
          tenantId: containerInfo.tenantId,
          walletAddress: containerInfo.walletAddress,
          elizaPort: containerInfo.elizaPort,
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
   * Create a new user container with Eliza agent (connects to shared MCP)
   */
  async createUserContainer(config: UserConfig, deploymentId?: string): Promise<ContainerInfo> {
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
    const elizaPort = await this.portAllocator.allocatePort(tenantId);
    
    // 1. Create user directories
    updateProgress('creating_directories');
    await this.createUserDirectories(tenantId);
    
    // 2. Generate wallet seed
    updateProgress('generating_wallet');
    const walletSeed = await this.generateWalletSeed(tenantId);
    
    // 3. Skip DAO contracts deployment for immediate bot functionality
    // DAO contracts will be deployed in background after bot is running
    console.log(`Skipping DAO deployment for immediate bot availability: ${tenantId}`);
    
    // Start DAO deployment in background if needed (non-blocking)
    if (config.tier === 'premium' || config.tier === 'enterprise' || config.features?.dao) {
      console.log(`Scheduling background DAO deployment for ${tenantId}...`);
      this.deployDAOInBackground(tenantId).catch(error => {
        console.error(`Background DAO deployment failed for ${tenantId}:`, error);
      });
    }
    
    // 4. Create Docker Compose file from template (only Eliza agent)
    updateProgress('creating_docker_config');
    const dockerComposeFile = await this.generateDockerCompose(tenantId, config, elizaPort);
    
    // 5. Start the Eliza agent container
    updateProgress('starting_container');
    await this.startContainers(tenantId, dockerComposeFile);
    
    // 6. Store container info
    updateProgress('finalizing');
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
      // Ensure Docker network exists
      await this.ensureDockerNetwork();
      
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
   * Ensure the midnightos-network Docker network exists
   */
  private async ensureDockerNetwork(): Promise<void> {
    try {
      // Check if network exists
      const { stdout } = await execAsync('docker network ls --format "{{.Name}}"');
      if (!stdout.includes('midnightos-network')) {
        console.log('Creating midnightos-network...');
        await execAsync('docker network create midnightos-network');
        console.log('✅ Docker network midnightos-network created');
      }
    } catch (error) {
      console.error('Failed to ensure Docker network:', error);
      // Network might already exist, continue
    }
  }

  /**
   * Wait for Eliza agent container to be healthy
   */
  private async waitForHealthy(tenantId: string, maxRetries = 60): Promise<void> {
    console.log(`⏳ Waiting for container ${tenantId} to become healthy...`);
    
    for (let i = 0; i < maxRetries; i++) {
      try {
        const { stdout } = await execAsync(
          `docker inspect eliza-agent-${tenantId} --format='{{.State.Status}}'`
        );
        
        if (stdout.trim() === 'running') {
          // Check if Eliza agent is responding
          const elizaPort = this.activeContainers.get(tenantId)?.elizaPort;
          if (elizaPort) {
            try {
              const controller = new AbortController();
              const timeout = setTimeout(() => controller.abort(), 5000); // 5 second timeout
              
              // Try both potential ports since Eliza might be running on 3000 instead of 3003
              let response;
              try {
                response = await fetch(`http://localhost:${elizaPort}/health`, {
                  signal: controller.signal
                });
              } catch (healthError) {
                // If /health fails, try just the root endpoint to see if service is responding
                response = await fetch(`http://localhost:${elizaPort}/`, {
                  signal: controller.signal
                });
              }
              
              clearTimeout(timeout);
              
              if (response.ok) {
                console.log(`✅ Container ${tenantId} is healthy after ${(i + 1) * 2} seconds`);
                return;
              }
            } catch (fetchError) {
              // Health endpoint not ready yet
              if (i % 10 === 0 && i > 0) {
                console.log(`⏳ Still waiting for ${tenantId}... (${i * 2}/${maxRetries * 2} seconds)`);
              }
            }
          }
        }
      } catch (error) {
        // Container not ready yet - this is expected during startup
      }
      
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
    
    console.error(`❌ Container ${tenantId} failed to become healthy after ${maxRetries * 2} seconds`);
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
          
          // Mark the port as used in the allocator
          if (info.elizaPort) {
            this.portAllocator.markPortAsUsed(info.elizaPort);
          }
        } catch (error) {
          // Skip if no info file
        }
      }
      
      console.log(`Loaded ${this.activeContainers.size} active containers`);
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
    console.log(`Allocating port for ${tenantId}. Used ports: ${this.usedPorts.size}, Range: ${this.startPort}-${this.endPort}`);
    
    for (let port = this.startPort; port <= this.endPort; port++) {
      if (!this.usedPorts.has(port)) {
        const available = await this.isPortAvailable(port);
        if (available) {
          this.usedPorts.add(port);
          console.log(`Allocated port ${port} for ${tenantId}`);
          return port;
        }
      }
    }
    
    console.error(`No available ports! Used: ${Array.from(this.usedPorts).join(', ')}`);
    throw new Error('No available ports');
  }
  
  releasePort(port: number): void {
    this.usedPorts.delete(port);
    console.log(`Released port ${port}. Used ports: ${this.usedPorts.size}`);
  }
  
  markPortAsUsed(port: number): void {
    this.usedPorts.add(port);
    console.log(`Marked port ${port} as used. Total used: ${this.usedPorts.size}`);
  }
  
  private async isPortAvailable(port: number): Promise<boolean> {
    try {
      // First check if Docker is using the port
      try {
        const { stdout } = await execAsync(`docker ps --format "{{.Ports}}" | grep -c "0.0.0.0:${port}->"`);
        if (stdout.trim() !== '0') {
          console.log(`Port ${port} is in use by Docker container`);
          return false;
        }
      } catch (grepError) {
        // grep returns exit code 1 when no matches found, which is what we want
        // Port is not used by Docker, continue to network check
      }

      // Try to bind to the port - if binding fails, port is in use
      const net = await import('net');
      
      return new Promise((resolve) => {
        const server = net.createServer();
        
        server.once('error', (err: any) => {
          if (err.code === 'EADDRINUSE') {
            // Port is in use
            console.log(`Port ${port} is in use by another process`);
            resolve(false);
          } else {
            // Other error, assume port is available
            resolve(true);
          }
        });
        
        server.once('listening', () => {
          // Port is available, close and return true
          server.close();
          resolve(true);
        });
        
        server.listen(port, '0.0.0.0');
      });
    } catch (error) {
      console.error(`Error checking port ${port}:`, error);
      // On error, assume port is NOT available to prevent conflicts
      return false;
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