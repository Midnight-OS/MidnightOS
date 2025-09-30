#!/usr/bin/env tsx

/**
 * Admin wallet tools for balance checking and fund transfers
 */

import { WalletManager } from '../src/wallet/index.js';
import * as dotenv from 'dotenv';
import { program } from 'commander';

dotenv.config();

// Get balance for a wallet
async function getBalance(seed: string, networkId: string = 'TestNet') {
  console.log('Checking wallet balance...');
  
  // WalletManager takes seed in constructor
  const walletManager = new WalletManager(
    networkId as any,
    seed,
    'admin-wallet-check',
    {
      indexer: process.env.INDEXER || 'https://indexer.testnet-02.midnight.network/api/v1/graphql',
      indexerWS: process.env.INDEXER_WS || 'wss://indexer.testnet-02.midnight.network/api/v1/graphql/ws',
      node: process.env.MN_NODE || 'https://rpc.testnet-02.midnight.network',
      proofServer: process.env.PROOF_SERVER || 'http://localhost:6300',
      useExternalProofServer: true,
      networkId: networkId as any
    }
  );

  try {
    // Wait for wallet to be ready
    let retries = 0;
    while (!walletManager.isReady() && retries < 20) {
      console.log('Waiting for wallet to be ready...');
      await new Promise(resolve => setTimeout(resolve, 1000));
      retries++;
    }
    
    if (!walletManager.isReady()) {
      throw new Error('Wallet failed to initialize after 20 seconds');
    }
    
    const balances = walletManager.getBalance();
    const address = await walletManager.getAddress();
    
    console.log(`Address: ${address}`);
    console.log(`Balance: ${balances.balance}`);
    console.log(`Pending: ${balances.pendingBalance}`);
    
    // Output in parseable format for scripts
    console.log(`BALANCE_RESULT:${balances.balance}`);
    
    return balances.balance;
  } catch (error) {
    console.error('Error getting balance:', error);
    process.exit(1);
  } finally {
    await walletManager.close();
  }
}

// Send funds from admin wallet to user wallet
async function sendFunds(
  fromSeed: string, 
  toAddress: string, 
  amount: string,
  networkId: string = 'TestNet'
) {
  console.log(`Sending ${amount} to ${toAddress}...`);
  
  // WalletManager takes seed in constructor
  const walletManager = new WalletManager(
    networkId as any,
    fromSeed,
    'admin-wallet-send',
    {
      indexer: process.env.INDEXER || 'https://indexer.testnet-02.midnight.network/api/v1/graphql',
      indexerWS: process.env.INDEXER_WS || 'wss://indexer.testnet-02.midnight.network/api/v1/graphql/ws',
      node: process.env.MN_NODE || 'https://rpc.testnet-02.midnight.network',
      proofServer: process.env.PROOF_SERVER || 'http://localhost:6300',
      useExternalProofServer: true,
      networkId: networkId as any
    }
  );

  try {
    // Wait for wallet to be ready
    let retries = 0;
    while (!walletManager.isReady() && retries < 20) {
      console.log('Waiting for wallet to be ready...');
      await new Promise(resolve => setTimeout(resolve, 1000));
      retries++;
    }
    
    if (!walletManager.isReady()) {
      throw new Error('Wallet failed to initialize after 20 seconds');
    }
    
    // Check balance first
    const balances = walletManager.getBalance();
    console.log(`Current balance: ${balances.balance}`);
    
    // Handle decimal balance for comparison
    const balanceInt = Math.floor(parseFloat(balances.balance.toString()));
    if (BigInt(balanceInt) < BigInt(amount)) {
      throw new Error(`Insufficient balance. Have: ${balanceInt}, Need: ${amount}`);
    }
    
    // Send funds
    const result = await walletManager.sendFunds(toAddress, amount);
    
    console.log(`Transaction submitted: ${result.txIdentifier}`);
    console.log(`SEND_RESULT:SUCCESS:${result.txIdentifier}`);
    
    return result;
  } catch (error) {
    console.error('Error sending funds:', error);
    console.log(`SEND_RESULT:FAILED:${error}`);
    process.exit(1);
  } finally {
    await walletManager.close();
  }
}

// CLI setup
program
  .name('admin-wallet-tools')
  .description('Admin wallet tools for balance and transfers')
  .version('1.0.0');

program
  .command('balance')
  .description('Check wallet balance')
  .requiredOption('-s, --seed <seed>', 'Wallet seed (64-char hex)')
  .option('-n, --network <network>', 'Network ID', 'TestNet')
  .action(async (options) => {
    await getBalance(options.seed, options.network);
  });

program
  .command('send')
  .description('Send funds from admin wallet')
  .requiredOption('-s, --seed <seed>', 'Admin wallet seed')
  .requiredOption('-t, --to <address>', 'Destination address')
  .requiredOption('-a, --amount <amount>', 'Amount to send')
  .option('-n, --network <network>', 'Network ID', 'TestNet')
  .action(async (options) => {
    await sendFunds(options.seed, options.to, options.amount, options.network);
  });

program.parse();