#!/usr/bin/env tsx

/**
 * Fund wallets from genesis wallet in standalone network
 */

import { WalletManager } from '../src/wallet/index.js';
import * as dotenv from 'dotenv';
import { NetworkId } from '@midnight-ntwrk/midnight-js-network-id';

dotenv.config();

// Genesis wallet seed for standalone network
const GENESIS_SEED = '0000000000000000000000000000000000000000000000000000000000000001';

async function fundFromGenesis() {
  console.log('Funding admin wallet from genesis wallet...');
  
  const networkId = NetworkId.Undeployed;
  
  // Create genesis wallet
  const genesisWallet = new WalletManager(
    networkId,
    GENESIS_SEED,
    'genesis-wallet',
    {
      indexer: process.env.INDEXER || 'http://localhost:8088/api/v1/graphql',
      indexerWS: process.env.INDEXER_WS || 'ws://localhost:8088/api/v1/graphql/ws',
      node: process.env.MN_NODE || 'http://localhost:9944',
      proofServer: process.env.PROOF_SERVER || 'http://localhost:6300',
      useExternalProofServer: true,
      networkId
    }
  );

  try {
    // Wait for genesis wallet to be ready
    console.log('Waiting for genesis wallet to sync...');
    let retries = 0;
    while (!genesisWallet.isReady() && retries < 30) {
      await new Promise(resolve => setTimeout(resolve, 1000));
      retries++;
    }
    
    if (!genesisWallet.isReady()) {
      throw new Error('Genesis wallet failed to initialize');
    }
    
    const genesisBalance = genesisWallet.getBalance();
    console.log(`Genesis wallet balance: ${genesisBalance.balance}`);
    console.log(`Genesis wallet address: ${await genesisWallet.getAddress()}`);
    
    // Convert balance to integer (remove decimals) for BigInt comparison
    const balanceInt = Math.floor(parseFloat(genesisBalance.balance.toString()));
    if (balanceInt === 0) {
      throw new Error('Genesis wallet has no funds. Make sure the standalone network is running.');
    }
    
    // For Undeployed network, we need to create admin wallet to get its address
    const adminSeed = process.env.ADMIN_SEED || '2912406e7eb8a691e23dd4a76a7b38544f9c5a5abcb0d88b077ba5d45262162e';
    
    // Create admin wallet temporarily to get its address
    const adminWallet = new WalletManager(
      networkId,
      adminSeed,
      'admin-undeployed',
      {
        indexer: process.env.INDEXER || 'http://localhost:8088/api/v1/graphql',
        indexerWS: process.env.INDEXER_WS || 'ws://localhost:8088/api/v1/graphql/ws',
        node: process.env.MN_NODE || 'http://localhost:9944',
        proofServer: process.env.PROOF_SERVER || 'http://localhost:6300',
        useExternalProofServer: true,
        networkId
      }
    );
    
    // Wait for admin wallet to be ready
    let adminRetries = 0;
    while (!adminWallet.isReady() && adminRetries < 30) {
      await new Promise(resolve => setTimeout(resolve, 1000));
      adminRetries++;
    }
    
    const adminAddress = await adminWallet.getAddress();
    console.log(`Admin wallet address (Undeployed): ${adminAddress}`);
    
    // Send funds to admin wallet
    const amount = '1000000000'; // 1 billion tokens
    console.log(`Sending ${amount} tokens to admin wallet: ${adminAddress}`);
    
    const result = await genesisWallet.sendFunds(adminAddress, amount);
    console.log(`Transaction submitted: ${result.txIdentifier}`);
    console.log(`SUCCESS: Admin wallet funded with ${amount} tokens`);
    
    // Also fund any other wallets if needed
    const userFundingAmount = process.env.USER_FUNDING_AMOUNT || '500';
    
    return {
      txId: result.txIdentifier,
      amount,
      recipient: adminAddress
    };
    
  } catch (error) {
    console.error('Error funding from genesis:', error);
    process.exit(1);
  } finally {
    await genesisWallet.close();
    await adminWallet.close();
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  fundFromGenesis().then(() => process.exit(0)).catch(console.error);
}

export { fundFromGenesis };