#!/usr/bin/env tsx

/**
 * Check wallet balance with full sync status
 */

import { WalletManager } from '../src/wallet/index.js';
import * as dotenv from 'dotenv';

dotenv.config();

async function checkBalanceWithSync(seed: string, networkId: string = 'TestNet') {
  console.log('Initializing wallet and checking balance...');
  
  const walletManager = new WalletManager(
    networkId as any,
    seed,
    'admin-wallet-sync-check',
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
    while (!walletManager.isReady() && retries < 30) {
      console.log('Waiting for wallet initialization...');
      await new Promise(resolve => setTimeout(resolve, 1000));
      retries++;
    }
    
    if (!walletManager.isReady()) {
      throw new Error('Wallet failed to initialize after 30 seconds');
    }

    const address = await walletManager.getAddress();
    console.log(`\nWallet Address:\n${address}\n`);

    // Keep checking balance and sync status
    let syncAttempts = 0;
    const maxSyncAttempts = 60; // Wait up to 60 seconds for sync
    
    while (syncAttempts < maxSyncAttempts) {
      const balances = walletManager.getBalance();
      const status = walletManager.getWalletStatus();
      
      console.log(`\n[Attempt ${syncAttempts + 1}/${maxSyncAttempts}]`);
      console.log(`Balance: ${balances.balance} | Pending: ${balances.pendingBalance}`);
      console.log(`Sync Status: ${status.syncProgress.synced ? '✅ SYNCED' : '⏳ SYNCING...'}`);
      
      if (status.syncProgress.lag) {
        console.log(`Sync Gap: applyGap=${status.syncProgress.lag.applyGap}, sourceGap=${status.syncProgress.lag.sourceGap}`);
      }
      
      // If synced and balance > 0, we're done
      if (status.syncProgress.synced && BigInt(balances.balance) > 0) {
        console.log('\n✅ Wallet fully synced with positive balance!');
        console.log(`Final Balance: ${balances.balance}`);
        break;
      }
      
      // If synced but balance is 0, might need more time for transaction confirmation
      if (status.syncProgress.synced && BigInt(balances.balance) === 0n) {
        console.log('⚠️ Wallet synced but balance is 0 - transaction might be pending');
      }
      
      await new Promise(resolve => setTimeout(resolve, 1000));
      syncAttempts++;
    }
    
    // Final check
    const finalBalances = walletManager.getBalance();
    const finalStatus = walletManager.getWalletStatus();
    
    console.log('\n=== FINAL WALLET STATE ===');
    console.log(`Address: ${address}`);
    console.log(`Balance: ${finalBalances.balance}`);
    console.log(`Pending: ${finalBalances.pendingBalance}`);
    console.log(`Fully Synced: ${finalStatus.syncProgress.synced}`);
    
    // Output for script parsing
    console.log(`\nBALANCE_RESULT:${finalBalances.balance}`);
    
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  } finally {
    await walletManager.close();
  }
}

// Get seed from command line or environment
const seed = process.argv[2] || process.env.ADMIN_SEED || 'b4d040c5080f0f123b9cb879fedf9f513eb9f50292380c7f0897c94a5ee79b94';
const network = process.argv[3] || 'TestNet';

console.log('Starting balance check with full sync...');
console.log('This may take a minute while the wallet syncs with the blockchain...\n');

checkBalanceWithSync(seed, network).then(() => process.exit(0));