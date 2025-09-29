import { PrismaClient } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';
import bcrypt from 'bcrypt';

export class DatabaseService {
  private prisma: PrismaClient;

  constructor() {
    this.prisma = new PrismaClient();
  }

  /**
   * Initialize database connection and run migrations
   */
  async initialize(): Promise<void> {
    try {
      // Test database connection
      await this.prisma.$connect();
      console.log('✓ Database connected successfully');
    } catch (error) {
      console.error('Failed to initialize database:', error);
      throw new Error('Database initialization failed');
    }
  }

  /**
   * Create a new user
   */
  async createUser(data: { email: string; password: string; tier?: string }): Promise<any> {
    // Check if user already exists
    const existingUser = await this.prisma.user.findUnique({
      where: { email: data.email }
    });
    
    if (existingUser) {
      throw new Error('User with this email already exists');
    }
    
    const hashedPassword = await bcrypt.hash(data.password, 10);
    
    const user = await this.prisma.user.create({
      data: {
        email: data.email,
        password: hashedPassword,
        tier: data.tier || 'basic',
      },
      select: {
        id: true,
        email: true,
        tier: true,
      },
    });
    
    return user;
  }

  /**
   * Authenticate user
   */
  async authenticateUser(email: string, password: string): Promise<any> {
    const user = await this.prisma.user.findUnique({
      where: { email },
    });
    
    if (!user) throw new Error('User not found');
    
    const valid = await bcrypt.compare(password, user.password);
    if (!valid) throw new Error('Invalid password');
    
    return { id: user.id, email: user.email, tier: user.tier };
  }

  /**
   * Get user by ID
   */
  async getUser(userId: string): Promise<any> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        tier: true,
        createdAt: true,
      },
    });
    
    return user;
  }

  /**
   * Create a bot for user
   */
  async createBot(data: any): Promise<any> {
    const bot = await this.prisma.bot.create({
      data: {
        userId: data.userId,
        name: data.name,
        tenantId: data.tenantId,
        walletAddress: data.walletAddress,
        walletPort: data.elizaPort, // Map elizaPort to walletPort for database
        features: data.features,
        platforms: data.platforms,
        status: data.status || 'pending',
      },
    });
    
    return bot;
  }

  /**
   * Get user's bots
   */
  async getUserBots(userId: string): Promise<any[]> {
    try {
      const bots = await this.prisma.bot.findMany({
        where: { userId },
      });
      
      return bots;
    } catch (error: any) {
      // If table doesn't exist, return mock data for development
      if (error.message?.includes('does not exist') && process.env.NODE_ENV === 'development') {
        console.log('Database table not found, returning mock bot data for development');
        return this.getMockBots(userId);
      }
      throw error;
    }
  }

  /**
   * Generate mock bot data for development
   */
  private getMockBots(userId: string): any[] {
    return [
      {
        id: 'bot-001',
        userId,
        name: 'Trading Assistant',
        tenantId: 'tenant-001',
        walletAddress: 'mn1qw2e3r4t5y6u7i8o9p0asdfghjklzxcvbnm123456789',
        walletPort: 3003,
        elizaPort: 3003,
        features: {
          wallet: true,
          dao: true,
          marketplace: false
        },
        platforms: {
          discord: { token: 'mock-discord-token' },
          telegram: { token: 'mock-telegram-token' }
        },
        status: 'active',
        createdAt: new Date('2024-01-15'),
        tier: 'premium'
      },
      {
        id: 'bot-002',
        userId,
        name: 'DAO Governor',
        tenantId: 'tenant-002', 
        walletAddress: 'mn1zyxwvutsrqponmlkjihgfedcba9876543210abcdef',
        walletPort: 3004,
        elizaPort: 3004,
        features: {
          wallet: true,
          dao: true,
          marketplace: true
        },
        platforms: {
          discord: { token: 'mock-discord-token-2' }
        },
        status: 'active',
        createdAt: new Date('2024-02-01'),
        tier: 'enterprise'
      },
      {
        id: 'bot-003',
        userId,
        name: 'NFT Marketplace Bot',
        tenantId: 'tenant-003',
        walletAddress: 'mn1abcdefghijklmnopqrstuvwxyz1234567890abcdef',
        walletPort: 3005,
        elizaPort: 3005,
        features: {
          wallet: true,
          dao: false,
          marketplace: true
        },
        platforms: {
          telegram: { token: 'mock-telegram-token-3' },
          webChat: { enabled: true }
        },
        status: 'paused',
        createdAt: new Date('2024-02-15'),
        tier: 'basic'
      }
    ];
  }

  /**
   * Get specific bot
   */
  async getBot(botId: string): Promise<any> {
    const bot = await this.prisma.bot.findUnique({
      where: { id: botId },
    });
    
    return bot;
  }

  /**
   * Update bot
   */
  async updateBot(botId: string, data: any): Promise<void> {
    const updateData: any = {};
    
    if (data.features !== undefined) {
      updateData.features = data.features;
    }
    
    if (data.platforms !== undefined) {
      updateData.platforms = data.platforms;
    }
    
    if (data.status !== undefined) {
      updateData.status = data.status;
    }
    
    if (Object.keys(updateData).length > 0) {
      await this.prisma.bot.update({
        where: { id: botId },
        data: updateData,
      });
    }
  }

  /**
   * Delete bot
   */
  async deleteBot(botId: string): Promise<void> {
    await this.prisma.bot.delete({
      where: { id: botId },
    });
  }

  /**
   * Log command execution
   */
  async logCommand(data: any): Promise<void> {
    await this.prisma.commandLog.create({
      data: {
        botId: data.botId,
        command: data.command,
        args: data.args,
        result: data.result,
      },
    });
  }

  /**
   * Get chat history for a bot session
   */
  async getChatHistory(params: { botId: string; sessionId: string; limit?: number }): Promise<any[]> {
    const logs = await this.prisma.commandLog.findMany({
      where: { 
        botId: params.botId,
        args: {
          path: ['sessionId'],
          equals: params.sessionId
        }
      },
      orderBy: { timestamp: 'desc' },
      take: params.limit || 50
    });
    
    return logs.map(log => ({
      message: log.command,
      response: log.result,
      timestamp: log.timestamp
    }));
  }

  /**
   * Cleanup resources on shutdown
   */
  async disconnect(): Promise<void> {
    await this.prisma.$disconnect();
  }
}