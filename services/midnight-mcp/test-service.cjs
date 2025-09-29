const fs = require('fs');
const path = require('path');
const axios = require('axios');
const { spawn } = require('child_process');

// Test configuration
const TEST_AGENT_ID = 'test-001';
const TEST_PORT = 5001;
// Use a proper 64-character hex seed (from the workshop example)
const TEST_SEED = 'b4d040c5080f0f123b9cb879fedf9f513eb9f50292380c7f0897c94a5ee79b94';

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

// Start the server
function startServer() {
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
      stdio: 'inherit'
    });
    
    serverProcess.on('error', reject);
    
    // Wait for server to start and wallet to initialize
    setTimeout(() => {
      console.log('⏳ Waiting for wallet to sync...');
      // Additional wait for wallet state to be available
      setTimeout(() => resolve(serverProcess), 8000);
    }, 3000);
  });
}

// Test endpoints
async function testEndpoints() {
  const baseURL = `http://localhost:${TEST_PORT}`;
  const tests = [];
  
  console.log('\n📋 Testing endpoints...\n');
  
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
  } catch (error) {
    tests.push({ endpoint: '/wallet/status', status: 'FAIL', error: error.message });
    console.log('❌ /wallet/status - FAIL:', error.message);
  }
  
  // Wallet address
  try {
    const response = await axios.get(`${baseURL}/wallet/address`);
    tests.push({ endpoint: '/wallet/address', status: 'PASS', data: response.data });
    console.log('✅ /wallet/address - PASS');
  } catch (error) {
    tests.push({ endpoint: '/wallet/address', status: 'FAIL', error: error.message });
    console.log('❌ /wallet/address - FAIL:', error.message);
  }
  
  // Wallet balance
  try {
    const response = await axios.get(`${baseURL}/wallet/balance`);
    tests.push({ endpoint: '/wallet/balance', status: 'PASS', data: response.data });
    console.log('✅ /wallet/balance - PASS');
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
    console.log('🚀 Starting Midnight MCP Service Test\n');
    
    // Create test seed
    createTestSeed();
    
    // Start server
    console.log('⏳ Starting server...');
    serverProcess = await startServer();
    console.log('✓ Server started on port', TEST_PORT);
    
    // Run tests
    const results = await testEndpoints();
    
    // Save results
    fs.writeFileSync('test-results.json', JSON.stringify(results, null, 2));
    console.log('\n💾 Results saved to test-results.json');
    
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