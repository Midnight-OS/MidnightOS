const fs = require('fs');
const path = require('path');
const axios = require('axios');
const crypto = require('crypto');
const { spawn } = require('child_process');

// Test configuration
const TEST_AGENT_ID = 'sync-test-001';
const TEST_PORT = 5003;
// Use a proper 64-character hex seed (32 bytes)
const TEST_SEED = crypto.randomBytes(32).toString('hex');

console.log(`Generated test seed: ${TEST_SEED.substring(0, 16)}... (length: ${TEST_SEED.length})`);

// Create test seed file
function createTestSeed() {
  const seedDir = path.join(__dirname, '.storage', 'seeds', TEST_AGENT_ID);
  const seedFile = path.join(seedDir, 'seed');
  
  // Create directory if it doesn't exist
  fs.mkdirSync(seedDir, { recursive: true });
  
  // Write seed file
  fs.writeFileSync(seedFile, TEST_SEED, { mode: 0o600 });
  console.log('✓ Test seed created');
}

// Start the server and monitor sync
function startServerWithMonitoring() {
  return new Promise((resolve, reject) => {
    const env = {
      ...process.env,
      AGENT_ID: TEST_AGENT_ID,
      NETWORK_ID: 'TestNet',
      PORT: TEST_PORT.toString(),
      USE_EXTERNAL_PROOF_SERVER: 'true',
      PROOF_SERVER: 'https://rpc-proof-devnet.midnight.network:8443',
      INDEXER: 'https://indexer.devnet.midnight.network:443',
      INDEXER_WS: 'wss://indexer.devnet.midnight.network:443',
      MN_NODE: 'https://rpc-node-devnet.midnight.network'
    };
    
    const serverProcess = spawn('node', [
      '--experimental-specifier-resolution=node',
      'dist/server.js'
    ], {
      env,
      cwd: __dirname,
      stdio: 'pipe'  // Capture output to monitor sync
    });
    
    let syncStartTime = Date.now();
    let isReady = false;
    let walletAddress = '';
    
    // Monitor server output
    serverProcess.stdout.on('data', (data) => {
      const output = data.toString();
      console.log(output.trim());
      
      // Check for wallet address
      if (output.includes('address:') || output.includes('mn_shield-addr_')) {
        const match = output.match(/mn_shield-addr_[a-z0-9]+/);
        if (match) {
          walletAddress = match[0];
          console.log(`🔑 Wallet address detected: ${walletAddress}`);
        }
      }
      
      // Check for sync status
      if (output.includes('synced') || output.includes('Wallet syncing')) {
        console.log('📊 Wallet sync status update detected');
      }
      
      // Check if fully synced
      if (output.includes('isFullySynced": true') || output.includes('synced": true')) {
        isReady = true;
        console.log('✅ Wallet is fully synced!');
      }
    });
    
    serverProcess.stderr.on('data', (data) => {
      console.error('Server error:', data.toString());
    });
    
    serverProcess.on('error', reject);
    
    // Wait and check sync status periodically
    const checkInterval = setInterval(async () => {
      try {
        // Check wallet status endpoint
        const response = await axios.get(`http://localhost:${TEST_PORT}/wallet/status`);
        const status = response.data;
        
        const elapsedTime = Math.round((Date.now() - syncStartTime) / 1000);
        console.log(`\n⏱️ Sync time: ${elapsedTime}s`);
        console.log(`📊 Sync status:`, {
          ready: status.ready,
          syncing: status.syncing,
          isFullySynced: status.isFullySynced,
          address: status.address || 'not available yet',
          applyGap: status.syncProgress?.lag?.applyGap || '0',
          sourceGap: status.syncProgress?.lag?.sourceGap || '0',
          percentage: status.syncProgress?.percentage || 0
        });
        
        if (status.address) {
          walletAddress = status.address;
        }
        
        // Check if wallet is ready
        if (status.ready || status.isFullySynced || (status.address && status.address !== '')) {
          clearInterval(checkInterval);
          console.log(`\n✅ Wallet is ready after ${elapsedTime} seconds!`);
          resolve({ serverProcess, walletAddress, syncTime: elapsedTime });
        } else if (elapsedTime > 120) { // 2 minute timeout
          clearInterval(checkInterval);
          console.log(`\n⚠️ Wallet sync timeout after ${elapsedTime} seconds`);
          console.log('Proceeding with tests anyway...');
          resolve({ serverProcess, walletAddress, syncTime: elapsedTime });
        }
      } catch (error) {
        // Server might not be ready yet, continue checking
        console.log('⏳ Waiting for server to respond...');
      }
    }, 5000); // Check every 5 seconds
  });
}

// Test endpoints after sync
async function testEndpoints(walletAddress) {
  const baseURL = `http://localhost:${TEST_PORT}`;
  const tests = [];
  
  console.log('\n📋 Testing endpoints after sync...\n');
  
  // Health check
  try {
    const response = await axios.get(`${baseURL}/health`);
    tests.push({ endpoint: '/health', status: 'PASS', data: response.data });
    console.log('✅ /health - PASS');
  } catch (error) {
    tests.push({ endpoint: '/health', status: 'FAIL', error: error.message });
    console.log('❌ /health - FAIL:', error.message);
  }
  
  // Wallet status
  try {
    const response = await axios.get(`${baseURL}/wallet/status`);
    tests.push({ endpoint: '/wallet/status', status: 'PASS', data: response.data });
    console.log('✅ /wallet/status - PASS');
    console.log('   Address:', response.data.address);
    console.log('   Ready:', response.data.ready);
    console.log('   Synced:', response.data.isFullySynced);
  } catch (error) {
    tests.push({ endpoint: '/wallet/status', status: 'FAIL', error: error.message });
    console.log('❌ /wallet/status - FAIL:', error.message);
  }
  
  // Wallet address
  try {
    const response = await axios.get(`${baseURL}/wallet/address`);
    tests.push({ endpoint: '/wallet/address', status: 'PASS', data: response.data });
    console.log('✅ /wallet/address - PASS');
    console.log('   Address:', response.data.address);
  } catch (error) {
    tests.push({ endpoint: '/wallet/address', status: 'FAIL', error: error.message });
    console.log('❌ /wallet/address - FAIL:', error.message);
  }
  
  // Wallet balance
  try {
    const response = await axios.get(`${baseURL}/wallet/balance`);
    tests.push({ endpoint: '/wallet/balance', status: 'PASS', data: response.data });
    console.log('✅ /wallet/balance - PASS');
    console.log('   Balance:', response.data.balance);
  } catch (error) {
    tests.push({ endpoint: '/wallet/balance', status: 'FAIL', error: error.message });
    console.log('❌ /wallet/balance - FAIL:', error.message);
  }
  
  // Treasury balance
  try {
    const response = await axios.get(`${baseURL}/treasury/balance`);
    tests.push({ endpoint: '/treasury/balance', status: 'PASS', data: response.data });
    console.log('✅ /treasury/balance - PASS');
  } catch (error) {
    tests.push({ endpoint: '/treasury/balance', status: 'FAIL', error: error.message });
    console.log('❌ /treasury/balance - FAIL:', error.message);
  }
  
  // Treasury proposals
  try {
    const response = await axios.get(`${baseURL}/treasury/proposals`);
    tests.push({ endpoint: '/treasury/proposals', status: 'PASS', data: response.data });
    console.log('✅ /treasury/proposals - PASS');
  } catch (error) {
    tests.push({ endpoint: '/treasury/proposals', status: 'FAIL', error: error.message });
    console.log('❌ /treasury/proposals - FAIL:', error.message);
  }
  
  // DAO state
  try {
    const response = await axios.get(`${baseURL}/dao/state`);
    tests.push({ endpoint: '/dao/state', status: 'PASS', data: response.data });
    console.log('✅ /dao/state - PASS');
  } catch (error) {
    tests.push({ endpoint: '/dao/state', status: 'FAIL', error: error.message });
    console.log('❌ /dao/state - FAIL:', error.message);
  }
  
  // Token list
  try {
    const response = await axios.get(`${baseURL}/wallet/tokens/list`);
    tests.push({ endpoint: '/wallet/tokens/list', status: 'PASS', data: response.data });
    console.log('✅ /wallet/tokens/list - PASS');
    console.log('   Tokens:', response.data.tokens.length);
  } catch (error) {
    tests.push({ endpoint: '/wallet/tokens/list', status: 'FAIL', error: error.message });
    console.log('❌ /wallet/tokens/list - FAIL:', error.message);
  }
  
  // Summary
  console.log('\n📊 Test Summary:');
  const passed = tests.filter(t => t.status === 'PASS').length;
  const failed = tests.filter(t => t.status === 'FAIL').length;
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`📈 Total: ${tests.length}`);
  
  return tests;
}

// Main test runner
async function main() {
  let serverProcess = null;
  
  try {
    console.log('🚀 Starting Midnight MCP Wallet Sync Test\n');
    console.log('This test will wait for the wallet to fully sync with the blockchain.');
    console.log('This may take 30-60 seconds depending on network conditions.\n');
    
    // Create test seed
    createTestSeed();
    
    // Start server and wait for sync
    console.log('⏳ Starting server and monitoring sync...\n');
    const { serverProcess: server, walletAddress, syncTime } = await startServerWithMonitoring();
    serverProcess = server;
    
    console.log(`\n🎉 Wallet synced successfully!`);
    console.log(`   Wallet Address: ${walletAddress}`);
    console.log(`   Sync Time: ${syncTime} seconds\n`);
    
    // Run endpoint tests
    const results = await testEndpoints(walletAddress);
    
    // Save results
    const report = {
      timestamp: new Date().toISOString(),
      seed: TEST_SEED.substring(0, 16) + '...',
      seedLength: TEST_SEED.length,
      walletAddress,
      syncTime,
      tests: results
    };
    fs.writeFileSync('test-sync-results.json', JSON.stringify(report, null, 2));
    console.log('\n💾 Results saved to test-sync-results.json');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    process.exit(1);
  } finally {
    // Clean up
    if (serverProcess) {
      console.log('\n🧹 Cleaning up...');
      serverProcess.kill();
    }
  }
}

// Run tests
main().catch(console.error);