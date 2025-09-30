import { WalletBuilder } from '@midnight-ntwrk/wallet';
import { setNetworkId, NetworkId } from '@midnight-ntwrk/midnight-js-network-id';

// Set to Undeployed network
setNetworkId(NetworkId.Undeployed);

// Genesis seed
const seed = '0000000000000000000000000000000000000000000000000000000000000001';

// Build wallet to get address
async function getAddress() {
  try {
    const wallet = await WalletBuilder.buildFromSeed(
      'http://localhost:8088/api/v1/graphql',
      'ws://localhost:8088/api/v1/graphql/ws',
      'http://localhost:6300',
      'http://localhost:9944',
      seed,
      'temp-genesis-wallet'
    );
    
    const state = await wallet.state();
    console.log('Genesis wallet for Undeployed network:');
    console.log('Seed:', seed);
    console.log('Address:', state.address);
    
    // Clean up
    wallet.close();
  } catch (error) {
    console.error('Error:', error);
  }
}

getAddress();
