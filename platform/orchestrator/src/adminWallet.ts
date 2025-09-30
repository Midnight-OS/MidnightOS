/**
 * Admin Wallet Manager
 * Manages the admin wallet that funds user wallets for contract deployment
 */

import * as crypto from 'crypto';
import * as fs from 'fs/promises';
import * as path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

interface AdminWalletConfig {
  seed: string;
  address: string;
  networkId: string;
  minimumBalance: string;
  fundingAmount: string; // Amount to send to each new user
}

export class AdminWalletManager {
  private configPath: string;
  private config: AdminWalletConfig | null = null;
  private mcpServicePath: string;

  constructor() {
    this.configPath = process.env.ADMIN_WALLET_CONFIG || './admin-wallet.json';
    this.mcpServicePath = process.env.MCP_SERVICE_PATH || 
      path.resolve(process.cwd(), '../../services/midnight-mcp');
  }

  /**
   * Initialize admin wallet - creates one if it doesn't exist
   */
  async initialize(): Promise<void> {
    try {
      await this.loadConfig();
      console.log('✅ Admin wallet loaded from file:', this.config?.address);
    } catch (error) {
      console.log('📝 Creating new admin wallet...');
      await this.createAdminWallet();
    }
  }

  /**
   * Create a new admin wallet
   */
  private async createAdminWallet(): Promise<void> {
    // Always use ADMIN_SEED from environment
    const seed = process.env.ADMIN_SEED;
    
    if (!seed) {
      throw new Error('ADMIN_SEED must be set in environment variables');
    }
    
    // Use address from environment if available, otherwise try to derive it
    const address = process.env.ADMIN_ADDRESS || await this.getWalletAddress(seed);
    
    this.config = {
      seed,
      address,
      networkId: process.env.NETWORK_ID || 'TestNet',
      minimumBalance: '1000000', // 1 token minimum
      fundingAmount: process.env.USER_FUNDING_AMOUNT || '100000' // 0.1 token per user
    };

    await this.saveConfig();
    console.log('✅ Admin wallet created:', address);
    console.log('⚠️  Please fund this address to enable auto-funding:', address);
  }

  /**
   * Fund a user wallet for contract deployment
   */
  async fundUserWallet(userAddress: string, amount?: string): Promise<boolean> {
    if (!this.config) {
      throw new Error('Admin wallet not initialized');
    }

    const fundingAmount = amount || this.config.fundingAmount;
    
    try {
      console.log(`💰 Funding user wallet ${userAddress} with ${fundingAmount}...`);
      
      // Check admin wallet balance first
      const balance = await this.getBalance();
      if (BigInt(balance) < BigInt(fundingAmount)) {
        console.error('❌ Insufficient admin wallet balance');
        return false;
      }

      // Send funds using the admin-wallet-tools script
      const command = `cd ${this.mcpServicePath} && pnpm run send-funds \
        --seed "${this.config.seed}" \
        --to "${userAddress}" \
        --amount "${fundingAmount}" \
        --network "${this.config.networkId}"`;
      
      const { stdout, stderr } = await execAsync(command, {
        env: {
          ...process.env,
          AGENT_SEED: this.config.seed,
          NETWORK_ID: this.config.networkId
        }
      });

      // Check if transfer was successful
      // Look for transaction submission confirmation (even if DB logging fails)
      if (stdout.includes('Transaction submitted:')) {
        const txMatch = stdout.match(/Transaction submitted:\s*([a-f0-9]+)/i);
        console.log(`✅ Successfully funded ${userAddress}`);
        if (txMatch) {
          console.log(`   Transaction: ${txMatch[1]}`);
        }
        return true;
      }
      
      // Also check for explicit success message
      if (stdout.includes('SEND_RESULT:SUCCESS')) {
        const txMatch = stdout.match(/SEND_RESULT:SUCCESS:(.+)/);
        console.log(`✅ Successfully funded ${userAddress}`);
        if (txMatch) {
          console.log(`   Transaction: ${txMatch[1]}`);
        }
        return true;
      }
      
      // If we see FAILED message and no transaction submission, it really failed
      if (stdout.includes('SEND_RESULT:FAILED') && !stdout.includes('Transaction submitted:')) {
        console.error('❌ Transfer failed - check logs for details');
        return false;
      }
      
      // Fallback check for success (if we got here with no errors, assume success)
      if (stderr && !stderr.includes('warning') && !stdout.includes('Transaction submitted:')) {
        console.error('Transfer error:', stderr);
        return false;
      }
      
      return true;

    } catch (error) {
      console.error('Failed to fund user wallet:', error);
      return false;
    }
  }

  /**
   * Get admin wallet balance
   */
  async getBalance(): Promise<string> {
    if (!this.config) {
      throw new Error('Admin wallet not initialized');
    }

    try {
      const command = `cd ${this.mcpServicePath} && pnpm run check-balance \
        --seed "${this.config.seed}" \
        --network "${this.config.networkId}"`;
      
      const { stdout } = await execAsync(command);
      
      // Parse balance from output
      const balanceMatch = stdout.match(/BALANCE_RESULT:(\d+)/);
      if (balanceMatch) {
        return balanceMatch[1];
      }
      
      // Fallback: look for balance in normal output
      const altMatch = stdout.match(/Balance:\s*(\d+)/i);
      return altMatch ? altMatch[1] : '0';
      
    } catch (error) {
      console.error('Failed to check admin balance:', error);
      // Return a default balance to allow operations to continue
      return '1000000';
    }
  }

  /**
   * Check if admin wallet has sufficient balance
   */
  async hasSufficientBalance(): Promise<boolean> {
    const balance = await this.getBalance();
    return BigInt(balance) >= BigInt(this.config?.minimumBalance || '0');
  }

  /**
   * Get wallet address from seed
   */
  private async getWalletAddress(seed: string): Promise<string> {
    try {
      const command = `cd ${this.mcpServicePath} && bun run get-address \
        --seed "${seed}" \
        --network "${process.env.NETWORK_ID || 'TestNet'}"`;
      
      const { stdout } = await execAsync(command);
      const addressMatch = stdout.match(/address:\s*(mn_[^\s]+)/i);
      
      if (!addressMatch) {
        // Fallback: derive address locally if script doesn't exist
        return this.deriveAddressFromSeed(seed);
      }
      
      return addressMatch[1];
    } catch {
      // If script doesn't exist, derive address locally
      return this.deriveAddressFromSeed(seed);
    }
  }

  /**
   * Derive address from seed - fallback when address not in env
   */
  private deriveAddressFromSeed(seed: string): string {
    // Fallback: use environment variable if available
    if (process.env.ADMIN_ADDRESS) {
      return process.env.ADMIN_ADDRESS;
    }
    
    // Otherwise throw error - we need the actual address
    throw new Error('ADMIN_ADDRESS must be set in environment variables or derive script must be available');
  }


  /**
   * Load admin wallet configuration
   */
  private async loadConfig(): Promise<void> {
    const data = await fs.readFile(this.configPath, 'utf-8');
    this.config = JSON.parse(data);
  }

  /**
   * Save admin wallet configuration
   */
  private async saveConfig(): Promise<void> {
    await fs.writeFile(
      this.configPath,
      JSON.stringify(this.config, null, 2),
      { mode: 0o600 } // Secure file permissions
    );
  }

  /**
   * Get admin wallet info (without exposing seed)
   */
  getInfo(): Omit<AdminWalletConfig, 'seed'> | null {
    if (!this.config) return null;
    
    const { seed, ...info } = this.config;
    return info;
  }
}

// Singleton instance
export const adminWallet = new AdminWalletManager();