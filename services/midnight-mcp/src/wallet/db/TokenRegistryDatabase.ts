/* istanbul ignore file */

import { PrismaClient } from '@prisma/client/edge';
import { withAccelerate } from '@prisma/extension-accelerate';
import { createLogger } from '../../logger/index.js';
import { TokenInfo } from '../../types/wallet.js';

/**
 * Service for managing token registry records in PostgreSQL using Prisma
 */
export class TokenRegistryDatabase {
  private prisma: PrismaClient;
  private logger = createLogger('token-registry-db');

  /**
   * Constructor initializes the Prisma client
   */
  constructor() {
    this.prisma = new PrismaClient().$extends(withAccelerate()) as any;
    this.logger.info('Token registry database initialized successfully');
  }
  
  /**
   * Register a new token
   * @param tokenInfo Token information
   * @returns The created token record
   */
  public async registerToken(tokenInfo: TokenInfo): Promise<TokenInfo> {
    try {
      await (this.prisma as any).token.create({
        data: {
          name: tokenInfo.name,
          symbol: tokenInfo.symbol,
          contractAddress: tokenInfo.contractAddress,
          domainSeparator: tokenInfo.domainSeparator,
          tokenTypeHex: tokenInfo.tokenTypeHex,
          description: tokenInfo.description,
          decimals: tokenInfo.decimals || 6,
        },
      });
      
      this.logger.info(`Registered token: ${tokenInfo.name} (${tokenInfo.symbol})`);
      return tokenInfo;
    } catch (error: any) {
      if (error?.code === 'P2002') {
        throw new Error(`Token with name '${tokenInfo.name}' is already registered`);
      }
      this.logger.error('Failed to register token', error);
      throw error;
    }
  }
  
  /**
   * Get a token by its name
   * @param name Token name
   * @returns Token information or null if not found
   */
  public async getTokenByName(name: string): Promise<TokenInfo | null> {
    try {
      const token = await (this.prisma as any).token.findUnique({
        where: { name },
      });
      
      if (!token) {
        return null;
      }
      
      return {
        name: token.name,
        symbol: token.symbol,
        contractAddress: token.contractAddress,
        domainSeparator: token.domainSeparator,
        tokenTypeHex: token.tokenTypeHex || undefined,
        description: token.description || undefined,
        decimals: token.decimals,
      };
    } catch (error) {
      this.logger.error(`Failed to get token with name: ${name}`, error);
      throw error;
    }
  }
  
  /**
   * Get a token by its symbol
   * @param symbol Token symbol
   * @returns Token information or null if not found
   */
  public async getTokenBySymbol(symbol: string): Promise<TokenInfo | null> {
    try {
      const token = await (this.prisma as any).token.findFirst({
        where: { symbol },
      });
      
      if (!token) {
        return null;
      }
      
      return {
        name: token.name,
        symbol: token.symbol,
        contractAddress: token.contractAddress,
        domainSeparator: token.domainSeparator,
        tokenTypeHex: token.tokenTypeHex || undefined,
        description: token.description || undefined,
        decimals: token.decimals,
      };
    } catch (error) {
      this.logger.error(`Failed to get token with symbol: ${symbol}`, error);
      throw error;
    }
  }

  /**
   * Get a token by its contract address
   * @param contractAddress Contract address
   * @returns Token information or null if not found
   */
  public async getTokenByContractAddress(contractAddress: string): Promise<TokenInfo | null> {
    try {
      const token = await (this.prisma as any).token.findFirst({
        where: { contractAddress },
      });
      
      if (!token) {
        return null;
      }
      
      return {
        name: token.name,
        symbol: token.symbol,
        contractAddress: token.contractAddress,
        domainSeparator: token.domainSeparator,
        tokenTypeHex: token.tokenTypeHex || undefined,
        description: token.description || undefined,
        decimals: token.decimals,
      };
    } catch (error) {
      this.logger.error(`Failed to get token with contract address: ${contractAddress}`, error);
      throw error;
    }
  }
  
  /**
   * Get a token by its token type hex
   * @param tokenTypeHex Token type hex
   * @returns Token information or null if not found
   */
  public async getTokenByTokenTypeHex(tokenTypeHex: string): Promise<TokenInfo | null> {
    try {
      const token = await (this.prisma as any).token.findFirst({
        where: { tokenTypeHex },
      });
      
      if (!token) {
        return null;
      }
      
      return {
        name: token.name,
        symbol: token.symbol,
        contractAddress: token.contractAddress,
        domainSeparator: token.domainSeparator,
        tokenTypeHex: token.tokenTypeHex || undefined,
        description: token.description || undefined,
        decimals: token.decimals,
      };
    } catch (error) {
      this.logger.error(`Failed to get token with token type hex: ${tokenTypeHex}`, error);
      throw error;
    }
  }
  
  /**
   * Get all registered tokens
   * @returns Array of all token records
   */
  public async getAllTokens(): Promise<TokenInfo[]> {
    try {
      const tokens = await (this.prisma as any).token.findMany({
        orderBy: { createdAt: 'desc' },
      });
      
      return tokens.map((token: any) => ({
        name: token.name,
        symbol: token.symbol,
        contractAddress: token.contractAddress,
        domainSeparator: token.domainSeparator,
        tokenTypeHex: token.tokenTypeHex || undefined,
        description: token.description || undefined,
        decimals: token.decimals,
      }));
    } catch (error) {
      this.logger.error('Failed to get all tokens', error);
      throw error;
    }
  }
  
  /**
   * Check if a token is registered by name
   * @param name Token name
   * @returns True if token is registered
   */
  public async isTokenRegistered(name: string): Promise<boolean> {
    try {
      const count = await (this.prisma as any).token.count({
        where: { name },
      });
      return count > 0;
    } catch (error) {
      this.logger.error(`Failed to check if token is registered: ${name}`, error);
      throw error;
    }
  }
  
  /**
   * Update token information
   * @param name Token name
   * @param updates Partial token information to update
   * @returns Updated token information or null if not found
   */
  public async updateToken(name: string, updates: Partial<Omit<TokenInfo, 'name'>>): Promise<TokenInfo | null> {
    try {
      const token = await (this.prisma as any).token.update({
        where: { name },
        data: {
          symbol: updates.symbol,
          contractAddress: updates.contractAddress,
          domainSeparator: updates.domainSeparator,
          tokenTypeHex: updates.tokenTypeHex,
          description: updates.description,
          decimals: updates.decimals,
        },
      });
      
      this.logger.info(`Updated token: ${name}`);
      return {
        name: token.name,
        symbol: token.symbol,
        contractAddress: token.contractAddress,
        domainSeparator: token.domainSeparator,
        tokenTypeHex: token.tokenTypeHex || undefined,
        description: token.description || undefined,
        decimals: token.decimals,
      };
    } catch (error: any) {
      if (error?.code === 'P2025') {
        this.logger.warn(`No token found with name: ${name}`);
        return null;
      }
      this.logger.error(`Failed to update token: ${name}`, error);
      throw error;
    }
  }
  
  /**
   * Remove a token from registry
   * @param name Token name
   * @returns True if token was removed
   */
  public async unregisterToken(name: string): Promise<boolean> {
    try {
      await (this.prisma as any).token.delete({
        where: { name },
      });
      
      this.logger.info(`Unregistered token: ${name}`);
      return true;
    } catch (error: any) {
      if (error?.code === 'P2025') {
        this.logger.warn(`No token found with name: ${name}`);
        return false;
      }
      this.logger.error(`Failed to unregister token: ${name}`, error);
      throw error;
    }
  }
  
  /**
   * Get registry statistics
   * @returns Registry statistics
   */
  public async getRegistryStats(): Promise<{ totalTokens: number; tokensBySymbol: Record<string, number> }> {
    try {
      const totalTokens = await (this.prisma as any).token.count();
      
      const tokens = await (this.prisma as any).token.groupBy({
        by: ['symbol'],
        _count: {
          symbol: true,
        },
      });
      
      const tokensBySymbol: Record<string, number> = {};
      tokens.forEach((token: any) => {
        tokensBySymbol[token.symbol] = token._count.symbol;
      });
      
      return {
        totalTokens,
        tokensBySymbol,
      };
    } catch (error) {
      this.logger.error('Failed to get registry statistics', error);
      throw error;
    }
  }
  
  /**
   * Close the database connection
   */
  public async close(): Promise<void> {
    try {
      await this.prisma.$disconnect();
      this.logger.info('Token registry database connection closed');
    } catch (error) {
      this.logger.error('Error closing token registry database connection', error);
      throw error;
    }
  }
}

export default TokenRegistryDatabase;