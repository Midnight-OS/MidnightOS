import { describe, expect, it, beforeAll, afterAll } from '@jest/globals';
import axios from 'axios';
import { execSync, spawn } from 'child_process';
import path from 'path';
import fs from 'fs';

describe('Eliza Agent Integration Tests', () => {
  let walletServerProcess: any;
  let elizaAgentProcess: any;
  const walletPort = 4500;
  const elizaPort = 4501;
  const testAgentId = 'test-agent-001';
  
  beforeAll(async () => {
    console.log('Starting integration test environment...');
    
    // Clean up any existing test processes
    try {
      execSync('pkill -f "test-wallet-server" || true', { stdio: 'ignore' });
      execSync('pkill -f "test-eliza-agent" || true', { stdio: 'ignore' });
    } catch (error) {
      // Ignore cleanup errors
    }
    
    // Start wallet server (midnight-mcp)
    console.log('Starting wallet server on port', walletPort);
    walletServerProcess = spawn('node', [
      path.join(__dirname, '../../midnight-mcp/dist/server.js')
    ], {
      env: {
        ...process.env,
        PORT: walletPort.toString(),
        AGENT_ID: testAgentId,
        NETWORK_ID: 'TestNet',
        USE_EXTERNAL_PROOF_SERVER: 'true',
        PROOF_SERVER: 'http://localhost:6300',
        INDEXER: 'https://indexer.devnet.midnight.network:443',
        INDEXER_WS: 'wss://indexer.devnet.midnight.network:443',
        MN_NODE: 'https://rpc-node-devnet.midnight.network',
        WALLET_FILENAME: `test-wallet-${testAgentId}.json`
      },
      detached: false,
      stdio: 'pipe'
    });
    
    // Wait for wallet server to be ready
    await waitForServer(`http://localhost:${walletPort}/health`, 30000);
    
    // Start eliza agent
    console.log('Starting eliza agent on port', elizaPort);
    elizaAgentProcess = spawn('node', [
      path.join(__dirname, '../dist/index.js')
    ], {
      env: {
        ...process.env,
        PORT: elizaPort.toString(),
        AGENT_ID: testAgentId,
        WALLET_MCP_URL: `http://localhost:${walletPort}`,
        DISCORD_TOKEN: 'test_discord_token',
        TELEGRAM_TOKEN: 'test_telegram_token',
        OPENAI_API_KEY: process.env.OPENAI_API_KEY || 'test_key'
      },
      detached: false,
      stdio: 'pipe'
    });
    
    // Wait for eliza agent to be ready
    await waitForServer(`http://localhost:${elizaPort}/health`, 30000);
  }, 60000);
  
  afterAll(async () => {
    console.log('Cleaning up integration test environment...');
    
    // Kill processes
    if (walletServerProcess) {
      walletServerProcess.kill();
    }
    if (elizaAgentProcess) {
      elizaAgentProcess.kill();
    }
    
    // Clean up test wallet files
    try {
      fs.unlinkSync(`test-wallet-${testAgentId}.json`);
    } catch (error) {
      // Ignore if file doesn't exist
    }
  });
  
  describe('Wallet Server Integration', () => {
    it('should check wallet server health', async () => {
      const response = await axios.get(`http://localhost:${walletPort}/health`);
      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('status', 'healthy');
    });
    
    it('should get wallet status', async () => {
      const response = await axios.get(`http://localhost:${walletPort}/wallet/status`);
      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('initialized');
      expect(response.data).toHaveProperty('network', 'TestNet');
    });
    
    it('should get wallet address', async () => {
      const response = await axios.get(`http://localhost:${walletPort}/wallet/address`);
      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('address');
      expect(typeof response.data.address).toBe('string');
    });
    
    it('should get wallet balance', async () => {
      const response = await axios.get(`http://localhost:${walletPort}/wallet/balance`);
      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('balance');
      expect(typeof response.data.balance).toBe('number');
    });
    
    it('should list tokens', async () => {
      const response = await axios.get(`http://localhost:${walletPort}/wallet/tokens/list`);
      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('tokens');
      expect(Array.isArray(response.data.tokens)).toBe(true);
    });
    
    it('should get token registry stats', async () => {
      const response = await axios.get(`http://localhost:${walletPort}/wallet/tokens/stats`);
      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('totalTokens');
      expect(response.data).toHaveProperty('activeTokens');
    });
  });
  
  describe('Treasury Integration', () => {
    it('should get treasury balance', async () => {
      const response = await axios.get(`http://localhost:${walletPort}/treasury/balance`);
      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('balance');
      expect(typeof response.data.balance).toBe('number');
    });
    
    it('should get treasury proposals', async () => {
      const response = await axios.get(`http://localhost:${walletPort}/treasury/proposals`);
      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('proposals');
      expect(Array.isArray(response.data.proposals)).toBe(true);
    });
    
    it('should get treasury analytics', async () => {
      const response = await axios.get(`http://localhost:${walletPort}/treasury/analytics`);
      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('totalFunds');
      expect(response.data).toHaveProperty('allocatedFunds');
      expect(response.data).toHaveProperty('availableFunds');
    });
    
    it('should create a treasury proposal', async () => {
      const proposal = {
        title: 'Test Proposal',
        description: 'Integration test proposal',
        amount: 1000,
        recipient: 'test-recipient-address',
        votingPeriod: 86400 // 1 day
      };
      
      const response = await axios.post(
        `http://localhost:${walletPort}/treasury/create-proposal`,
        proposal
      );
      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('proposalId');
      expect(response.data).toHaveProperty('status', 'created');
    });
  });
  
  describe('DAO Integration', () => {
    it('should get DAO state', async () => {
      const response = await axios.get(`http://localhost:${walletPort}/dao/state`);
      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('currentElection');
      expect(response.data).toHaveProperty('treasury');
    });
    
    it('should get DAO config template', async () => {
      const response = await axios.get(`http://localhost:${walletPort}/dao/config-template`);
      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('template');
      expect(response.data).toHaveProperty('description');
    });
  });
  
  describe('Marketplace Integration', () => {
    it('should register user in marketplace', async () => {
      const registration = {
        userId: 'test-user-001',
        publicKey: 'test-public-key',
        metadata: {
          name: 'Test User',
          role: 'trader'
        }
      };
      
      const response = await axios.post(
        `http://localhost:${walletPort}/marketplace/register`,
        registration
      );
      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('registered', true);
    });
    
    it('should verify user in marketplace', async () => {
      const verification = {
        userId: 'test-user-001'
      };
      
      const response = await axios.post(
        `http://localhost:${walletPort}/marketplace/verify`,
        verification
      );
      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('verified');
    });
  });
  
  describe('Eliza Agent Health', () => {
    it('should check eliza agent health', async () => {
      const response = await axios.get(`http://localhost:${elizaPort}/health`);
      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('status', 'healthy');
      expect(response.data).toHaveProperty('agentId', testAgentId);
    });
  });
});

// Helper function to wait for server to be ready
async function waitForServer(url: string, timeout: number): Promise<void> {
  const startTime = Date.now();
  
  while (Date.now() - startTime < timeout) {
    try {
      await axios.get(url);
      console.log(`Server at ${url} is ready`);
      return;
    } catch (error) {
      // Server not ready yet, wait and retry
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
  
  throw new Error(`Server at ${url} failed to start within ${timeout}ms`);
}