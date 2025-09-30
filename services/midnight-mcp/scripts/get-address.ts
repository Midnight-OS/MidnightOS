#!/usr/bin/env tsx

/**
 * Get wallet address from seed
 * Usage: bun run get-address --seed <hex-seed> --network <TestNet|MainNet|DevNet|Undeployed>
 */

import { WalletBuilder } from '@midnight-ntwrk/wallet';
import { NetworkId, setNetworkId, getZswapNetworkId } from '@midnight-ntwrk/midnight-js-network-id';
import { firstValueFrom } from 'rxjs';

async function main() {
  const args = process.argv.slice(2);
  
  let seed = '';
  let networkId: NetworkId = NetworkId.TestNet;
  
  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--seed':
        seed = args[++i];
        break;
      case '--network':
        const network = args[++i];
        if (network === 'TestNet') networkId = NetworkId.TestNet;
        else if (network === 'MainNet') networkId = NetworkId.MainNet;
        else if (network === 'DevNet') networkId = NetworkId.DevNet;
        else if (network === 'Undeployed') networkId = NetworkId.Undeployed;
        break;
    }
  }
  
  if (!seed || seed.length !== 64) {
    console.error('Error: Valid 64-character hex seed is required');
    console.error('Usage: bun run get-address --seed <hex-seed> --network <TestNet|MainNet|DevNet|Undeployed>');
    process.exit(1);
  }
  
  setNetworkId(networkId);
  
  // Use a minimal indexer/node for address generation (doesn't need to connect)
  const wallet = await WalletBuilder.buildFromSeed(
    'http://localhost:8088/api/v1/graphql',
    'ws://localhost:8088/api/v1/graphql/ws',
    'http://localhost:6300',
    'http://localhost:9944',
    seed,
    getZswapNetworkId(),
    'error' // Minimal logging
  );
  
  try {
    // Get the wallet state to extract the address
    const state = await firstValueFrom(wallet.state());
    
    // Output both the shield address (for transfers) and coin public key (for reference)
    // For funding operations, we need the shield address, not the coin public key
    console.log(`Address: ${state.address}`);
    console.log(`CoinPublicKey: ${state.coinPublicKey}`);
    
  } finally {
    await wallet.close();
  }
}

main().catch((error) => {
  console.error('Error:', error);
  process.exit(1);
});
