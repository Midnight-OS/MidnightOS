/**
 * Multi-Tenant Wallet Service
 * 
 * Manages multiple tenant wallets in a single MCP service instance.
 * Each tenant gets their own isolated wallet with their own seed.
 */

import { WalletManager } from './index.js';
import { createLogger } from '../logger/index.js';
import type { Logger } from 'pino';
import { NetworkId } from '@midnight-ntwrk/midnight-js-network-id';
import type { 
  WalletStatus, 
  SendFundsResult, 
  TokenBalance,
  TokenInfo,
  TokenOperationResult,
  TransactionRecord,
  TransactionStatusResult
} from '../types/wallet.js';

interface TenantMetadata {
  tenantId: string;
  name?: string;
  createdAt: Date;
  lastAccessedAt: Date;
  isActive: boolean;
}

interface TenantWallet {
  walletManager: WalletManager;
  metadata: TenantMetadata;
  seed: string;
}

export class MultiTenantWalletService {
  private readonly logger: Logger;
  private readonly tenantWallets: Map<string, TenantWallet> = new Map();
  private readonly maxTenantsPerInstance: number = 100; // Configurable limit

  constructor() {
    this.logger = createLogger('multi-tenant-wallet');
    this.logger.info('Multi-tenant wallet service initialized');
  }

  /**
   * Register a new tenant with their seed
   */
  async registerTenant(
    tenantId: string, 
    seed: string, 
    metadata?: { name?: string }
  ): Promise<{ success: boolean; tenantId: string; error?: string }> {
    try {
      // Check if tenant already exists
      if (this.tenantWallets.has(tenantId)) {
        this.logger.warn(`Tenant ${tenantId} already registered`);
        return { 
          success: false, 
          tenantId, 
          error: 'Tenant already registered' 
        };
      }

      // Check tenant limit
      if (this.tenantWallets.size >= this.maxTenantsPerInstance) {
        this.logger.error('Maximum tenant limit reached');
        return { 
          success: false, 
          tenantId, 
          error: 'Maximum tenant limit reached' 
        };
      }

      // Create wallet manager for this tenant with proper configuration
      const walletManager = new WalletManager(
        NetworkId.TestNet, 
        seed,
        `wallet_${tenantId}.dat`,
        {
          indexer: process.env.MIDNIGHT_INDEXER_URL || 'https://indexer.testnet-02.midnight.network/api/v1/graphql',
          indexerWS: process.env.MIDNIGHT_INDEXER_WS_URL || 'wss://indexer.testnet-02.midnight.network/api/v1/graphql/ws',
          node: process.env.MIDNIGHT_NODE_URL || 'https://rpc.testnet-02.midnight.network',
          proofServer: process.env.MIDNIGHT_PROOF_SERVER_URL || 'https://proof.testnet-02.midnight.network',
          logDir: `./logs/${tenantId}`,
          useExternalProofServer: process.env.USE_EXTERNAL_PROOF_SERVER === 'true'
        } as any
      );
      
      // Wait for wallet to be ready
      let retries = 30; // 30 seconds timeout
      while (!walletManager.isReady() && retries > 0) {
        await new Promise(resolve => setTimeout(resolve, 1000));
        retries--;
      }
      
      if (!walletManager.isReady()) {
        throw new Error(`Failed to initialize wallet for tenant ${tenantId} within timeout`);
      }

      // Store tenant wallet
      const tenantWallet: TenantWallet = {
        walletManager,
        metadata: {
          tenantId,
          name: metadata?.name,
          createdAt: new Date(),
          lastAccessedAt: new Date(),
          isActive: true
        },
        seed
      };

      this.tenantWallets.set(tenantId, tenantWallet);
      
      this.logger.info(`Registered new tenant: ${tenantId}`);
      
      return { 
        success: true, 
        tenantId 
      };
    } catch (error) {
      this.logger.error(`Failed to register tenant ${tenantId}:`, error);
      return { 
        success: false, 
        tenantId, 
        error: error instanceof Error ? error.message : 'Registration failed' 
      };
    }
  }

  /**
   * Get tenant's wallet manager
   */
  private getTenantWallet(tenantId: string): WalletManager | null {
    const tenantWallet = this.tenantWallets.get(tenantId);
    if (!tenantWallet) {
      this.logger.warn(`Tenant ${tenantId} not found`);
      return null;
    }

    // Update last accessed time
    tenantWallet.metadata.lastAccessedAt = new Date();
    
    return tenantWallet.walletManager;
  }

  /**
   * Check if tenant is registered
   */
  isTenantRegistered(tenantId: string): boolean {
    return this.tenantWallets.has(tenantId);
  }

  /**
   * Get tenant's wallet address
   */
  async getTenantAddress(tenantId: string): Promise<string | null> {
    const wallet = this.getTenantWallet(tenantId);
    if (!wallet) return null;

    try {
      const status = wallet.getWalletStatus();
      return status.address || null;
    } catch (error) {
      this.logger.error(`Failed to get address for tenant ${tenantId}:`, error);
      return null;
    }
  }

  /**
   * Get tenant's wallet status
   */
  getTenantWalletStatus(tenantId: string): WalletStatus | null {
    const wallet = this.getTenantWallet(tenantId);
    if (!wallet) return null;

    try {
      return wallet.getWalletStatus();
    } catch (error) {
      this.logger.error(`Failed to get status for tenant ${tenantId}:`, error);
      return null;
    }
  }

  /**
   * Send funds from tenant's wallet
   */
  async sendFundsForTenant(
    tenantId: string,
    toAddress: string,
    amount: string
  ): Promise<SendFundsResult> {
    const wallet = this.getTenantWallet(tenantId);
    if (!wallet) {
      throw new Error(`Tenant ${tenantId} not found`);
    }

    return await wallet.sendFunds(toAddress, amount);
  }

  /**
   * Get tenant's token balances
   */
  async getTokenBalancesForTenant(tenantId: string): Promise<TokenBalance[]> {
    const wallet = this.getTenantWallet(tenantId);
    if (!wallet) {
      return [];
    }

    return await wallet.listWalletTokens();
  }

  /**
   * Register token for tenant
   */
  async registerTokenForTenant(
    tenantId: string,
    name: string,
    symbol: string,
    contractAddress: string,
    domainSeparator?: string,
    description?: string,
    decimals?: number
  ): Promise<TokenOperationResult> {
    const wallet = this.getTenantWallet(tenantId);
    if (!wallet) {
      return {
        success: false,
        tokenName: name,
        error: `Tenant ${tenantId} not found`
      };
    }

    return await wallet.registerToken(
      name,
      symbol,
      contractAddress,
      domainSeparator || 'custom_token',
      description,
      decimals
    );
  }

  /**
   * Get tenant's transactions
   */
  async getTransactionsForTenant(tenantId: string): Promise<TransactionRecord[]> {
    const wallet = this.getTenantWallet(tenantId);
    if (!wallet) {
      return [];
    }

    return await wallet.getTransactions();
  }

  /**
   * Get transaction status for tenant
   */
  async getTransactionStatusForTenant(
    tenantId: string,
    transactionId: string
  ): Promise<TransactionStatusResult | null> {
    const wallet = this.getTenantWallet(tenantId);
    if (!wallet) {
      return null;
    }

    return await wallet.getTransactionStatus(transactionId);
  }

  /**
   * Send token from tenant's wallet
   */
  async sendTokenForTenant(
    tenantId: string,
    tokenName: string,
    toAddress: string,
    amount: string
  ): Promise<SendFundsResult> {
    const wallet = this.getTenantWallet(tenantId);
    if (!wallet) {
      throw new Error(`Tenant ${tenantId} not found`);
    }

    return await wallet.sendToken(tokenName, toAddress, amount);
  }

  /**
   * Get token info for tenant
   */
  async getTokenInfoForTenant(
    tenantId: string,
    tokenName: string
  ): Promise<TokenInfo | null> {
    const wallet = this.getTenantWallet(tenantId);
    if (!wallet) {
      return null;
    }

    return await wallet.getTokenInfo(tokenName);
  }

  /**
   * Get token balance for tenant
   */
  async getTokenBalanceForTenant(
    tenantId: string,
    tokenName: string
  ): Promise<string> {
    const wallet = this.getTenantWallet(tenantId);
    if (!wallet) {
      return '0';
    }

    return await wallet.getTokenBalance(tokenName);
  }

  /**
   * Unregister a tenant (cleanup)
   */
  async unregisterTenant(tenantId: string): Promise<boolean> {
    try {
      const tenantWallet = this.tenantWallets.get(tenantId);
      if (!tenantWallet) {
        return false;
      }

      // Stop wallet if it has a stop method
      // await tenantWallet.walletManager.stop();

      // Remove from registry
      this.tenantWallets.delete(tenantId);
      
      this.logger.info(`Unregistered tenant: ${tenantId}`);
      return true;
    } catch (error) {
      this.logger.error(`Failed to unregister tenant ${tenantId}:`, error);
      return false;
    }
  }

  /**
   * Get all registered tenant IDs
   */
  getRegisteredTenants(): string[] {
    return Array.from(this.tenantWallets.keys());
  }

  /**
   * Get tenant metadata
   */
  getTenantMetadata(tenantId: string): TenantMetadata | null {
    const tenantWallet = this.tenantWallets.get(tenantId);
    return tenantWallet?.metadata || null;
  }

  /**
   * Get service statistics
   */
  getStatistics(): {
    totalTenants: number;
    maxTenants: number;
    activeTenants: number;
  } {
    const activeTenants = Array.from(this.tenantWallets.values())
      .filter(tw => tw.metadata.isActive).length;

    return {
      totalTenants: this.tenantWallets.size,
      maxTenants: this.maxTenantsPerInstance,
      activeTenants
    };
  }

  /**
   * Clean up inactive tenants (optional maintenance)
   */
  async cleanupInactiveTenants(inactiveDays: number = 30): Promise<number> {
    const now = new Date();
    const cutoffTime = new Date(now.getTime() - (inactiveDays * 24 * 60 * 60 * 1000));
    let cleaned = 0;

    for (const [tenantId, tenantWallet] of this.tenantWallets.entries()) {
      if (tenantWallet.metadata.lastAccessedAt < cutoffTime) {
        if (await this.unregisterTenant(tenantId)) {
          cleaned++;
        }
      }
    }

    this.logger.info(`Cleaned up ${cleaned} inactive tenants`);
    return cleaned;
  }
}

export default MultiTenantWalletService;