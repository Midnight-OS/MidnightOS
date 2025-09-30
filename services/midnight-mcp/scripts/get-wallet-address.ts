#!/usr/bin/env tsx

import { WalletManager } from '../src/wallet';
import * as dotenv from 'dotenv';

dotenv.config();

async function getAddressFromSeed(seed: string) {
  console.log('Getting wallet address for seed...');
  
  const walletManager = new WalletManager(
    'TestNet',
    'temp-wallet',
    undefined,
    'temp-agent'
  );

  try {
    await walletManager.initialize(seed);
    await walletManager.waitForSync(5000);
    
    const address = await walletManager.getAddress();
    console.log('\n===========================================');
    console.log('Wallet Address:', address);
    console.log('===========================================\n');
    
    return address;
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await walletManager.shutdown();
  }
}

// Get seed from argument or use the one from env
const seed = process.argv[2] || process.env.ADMIN_SEED || '170527890bcff1a4e1ecf39096ae76cb22ad74308e75f3e9d5d44ba33a041d84';

getAddressFromSeed(seed).then(() => process.exit(0));