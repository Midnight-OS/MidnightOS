const axios = require('axios');
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

// Test configuration
const TEST_AGENT_ID = 'test-eliza-001';
const ELIZA_PORT = 3002;
const WALLET_PORT = 5002;

// Create test configuration
function createTestConfig() {
  const config = {
    name: "Test Bot",
    modelProvider: "openai",
    systemPrompt: "You are a helpful test bot.",
    bio: "I am a test bot for integration testing.",
    telegramConfig: {
      enabled: false
    },
    discordConfig: {
      enabled: false
    }
  };
  
  // Write character config
  fs.writeFileSync('character-test.json', JSON.stringify(config, null, 2));
  console.log('✓ Test configuration created');
}

// Start wallet server (midnight-mcp)
function startWalletServer() {
  return new Promise((resolve, reject) => {
    // Create test seed first (use proper hex seed format)
    const seedDir = path.join(__dirname, '../midnight-mcp/.storage/seeds', TEST_AGENT_ID);
    const seedFile = path.join(seedDir, 'seed');
    fs.mkdirSync(seedDir, { recursive: true });
    // Use a proper 64-character hex seed
    fs.writeFileSync(seedFile, 'c5d040c5080f0f123b9cb879fedf9f513eb9f50292380c7f0897c94a5ee79b95', { mode: 0o600 });
    
    const env = {
      ...process.env,
      AGENT_ID: TEST_AGENT_ID,
      NETWORK_ID: 'TestNet',
      PORT: WALLET_PORT.toString(),
      USE_EXTERNAL_PROOF_SERVER: 'true',
      PROOF_SERVER: 'https://rpc-proof-devnet.midnight.network:8443',
      INDEXER: 'https://indexer.devnet.midnight.network:443',
      INDEXER_WS: 'wss://indexer.devnet.midnight.network:443',
      MN_NODE: 'https://rpc-node-devnet.midnight.network'
    };
    
    const walletProcess = spawn('node', [
      '--experimental-specifier-resolution=node',
      'dist/server.js'
    ], {
      env,
      cwd: path.join(__dirname, '../midnight-mcp'),
      stdio: 'pipe'
    });
    
    walletProcess.on('error', reject);
    
    // Wait for server to start
    setTimeout(() => resolve(walletProcess), 3000);
  });
}

// Start eliza agent
function startElizaAgent() {
  return new Promise((resolve, reject) => {
    const env = {
      ...process.env,
      AGENT_ID: TEST_AGENT_ID,
      PORT: ELIZA_PORT.toString(),
      WALLET_MCP_URL: `http://localhost:${WALLET_PORT}`,
      DISCORD_TOKEN: 'test-discord-token',
      TELEGRAM_TOKEN: 'test-telegram-token',
      OPENAI_API_KEY: process.env.OPENAI_API_KEY || 'test-key',
      CHARACTER_FILE: './character-test.json'
    };
    
    const elizaProcess = spawn('node', ['dist/index.js'], {
      env,
      cwd: __dirname,
      stdio: 'pipe'
    });
    
    elizaProcess.on('error', reject);
    
    // Wait for server to start
    setTimeout(() => resolve(elizaProcess), 3000);
  });
}

// Test endpoints
async function testEndpoints() {
  const tests = [];
  
  console.log('\n📋 Testing Eliza Agent endpoints...\n');
  
  // Test wallet service connectivity
  try {
    const response = await axios.get(`http://localhost:${WALLET_PORT}/health`);
    tests.push({ endpoint: 'wallet-service/health', status: 'PASS', data: response.data });
    console.log('✅ Wallet Service - PASS');
  } catch (error) {
    tests.push({ endpoint: 'wallet-service/health', status: 'FAIL', error: error.message });
    console.log('❌ Wallet Service - FAIL:', error.message);
  }
  
  // Test eliza agent health
  try {
    const response = await axios.get(`http://localhost:${ELIZA_PORT}/health`);
    tests.push({ endpoint: 'eliza/health', status: 'PASS', data: response.data });
    console.log('✅ Eliza Agent Health - PASS');
  } catch (error) {
    tests.push({ endpoint: 'eliza/health', status: 'FAIL', error: error.message });
    console.log('❌ Eliza Agent Health - FAIL:', error.message);
  }
  
  // Test eliza agent status
  try {
    const response = await axios.get(`http://localhost:${ELIZA_PORT}/status`);
    tests.push({ endpoint: 'eliza/status', status: 'PASS', data: response.data });
    console.log('✅ Eliza Agent Status - PASS');
  } catch (error) {
    tests.push({ endpoint: 'eliza/status', status: 'FAIL', error: error.message });
    console.log('❌ Eliza Agent Status - FAIL:', error.message);
  }
  
  // Test MCP integration
  try {
    const response = await axios.get(`http://localhost:${ELIZA_PORT}/mcp/status`);
    tests.push({ endpoint: 'eliza/mcp/status', status: 'PASS', data: response.data });
    console.log('✅ MCP Integration - PASS');
  } catch (error) {
    tests.push({ endpoint: 'eliza/mcp/status', status: 'FAIL', error: error.message });
    console.log('❌ MCP Integration - FAIL:', error.message);
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
  let walletProcess = null;
  let elizaProcess = null;
  
  try {
    console.log('🚀 Starting Eliza Agent Integration Test\n');
    
    // Create test config
    createTestConfig();
    
    // Start wallet server
    console.log('⏳ Starting wallet server...');
    walletProcess = await startWalletServer();
    console.log('✓ Wallet server started on port', WALLET_PORT);
    
    // Start eliza agent
    console.log('⏳ Starting eliza agent...');
    elizaProcess = await startElizaAgent();
    console.log('✓ Eliza agent started on port', ELIZA_PORT);
    
    // Wait a bit for services to fully initialize
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Run tests
    const results = await testEndpoints();
    
    // Save results
    fs.writeFileSync('test-results-eliza.json', JSON.stringify(results, null, 2));
    console.log('\n💾 Results saved to test-results-eliza.json');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    process.exit(1);
  } finally {
    // Clean up
    console.log('\n🧹 Cleaning up...');
    if (walletProcess) walletProcess.kill();
    if (elizaProcess) elizaProcess.kill();
    
    // Clean up test files
    try {
      fs.unlinkSync('character-test.json');
    } catch (e) {
      // Ignore
    }
  }
}

// Run tests
main().catch(console.error);