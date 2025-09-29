import express from 'express';
import cors from 'cors';
import { elizaLogger } from '@elizaos/core';
import { character } from './character.ts';
import starterPlugin from './plugin.ts';

const app = express();
const PORT = process.env.PORT || 3003;

// Middleware
app.use(cors());
app.use(express.json());

// Simple conversation storage
const conversations = new Map<string, any[]>();

// MCP configuration is now in character.ts settings.mcp

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok',
    agentId: process.env.AGENT_ID || 'midnight-bot-agent',
    character: character.name,
    mcpUrl: process.env.WALLET_MCP_URL || 'http://localhost:3001',
    timestamp: new Date()
  });
});

// Chat endpoint with Eliza AI processing
app.post('/chat', async (req, res) => {
  try {
    const { message, sessionId, platform, userId } = req.body;
    
    if (!message) {
      return res.status(400).json({ 
        success: false, 
        error: 'Message is required' 
      });
    }
    
    // For now, provide a simulated AI response until we can integrate the full Eliza processing
    // The actual Eliza agent will be run separately via the CLI
    const currentSessionId = sessionId || `session-${Date.now()}`;
    
    // Get or create conversation history
    if (!conversations.has(currentSessionId)) {
      conversations.set(currentSessionId, []);
    }
    const history = conversations.get(currentSessionId)!;
    
    // Add user message to history
    history.push({
      role: 'user',
      content: message,
      timestamp: new Date()
    });
    
    // Generate contextual response based on message
    let responseText = '';
    
    // Check for specific patterns and provide intelligent responses
    if (message.toLowerCase().includes('hello') || message.toLowerCase().includes('hi')) {
      responseText = `Hello! I'm ${character.name}, your MidnightOS AI assistant. How can I help you today?`;
    } else if (message.toLowerCase().includes('wallet') || message.toLowerCase().includes('balance')) {
      responseText = `I can help you manage your Midnight wallet. Would you like to check your balance, send tokens, or view transaction history?`;
    } else if (message.toLowerCase().includes('dao')) {
      responseText = `I can assist with DAO operations. You can create proposals, vote on existing ones, or check the current DAO state. What would you like to do?`;
    } else if (message.toLowerCase().includes('help')) {
      responseText = `I'm here to help! I can assist with:
- Wallet management (balance, transfers, transactions)
- DAO operations (proposals, voting, treasury)
- Token operations (minting, burning, transfers)
- General questions about MidnightOS

What would you like to know more about?`;
    } else if (message.toLowerCase().includes('thank')) {
      responseText = `You're welcome! Is there anything else I can help you with?`;
    } else {
      // Default intelligent response
      responseText = `I understand you're asking about "${message}". Let me help you with that. I can provide information and guidance on using MidnightOS and blockchain operations.`;
    }
    
    // Add AI response to history
    history.push({
      role: 'assistant',
      content: responseText,
      timestamp: new Date()
    });
    
    // Keep only last 20 messages in memory
    if (history.length > 20) {
      history.splice(0, history.length - 20);
    }
    
    res.json({
      success: true,
      response: responseText,
      sessionId: currentSessionId,
      timestamp: new Date(),
      metadata: {
        agentId: process.env.AGENT_ID || 'midnight-bot-agent',
        platform: platform || 'web',
        characterName: character.name,
        messageCount: history.length,
        mcpConnected: false // Will be updated when MCP is available
      }
    });
    
  } catch (error) {
    elizaLogger.error('Error processing chat message:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to process message',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Get agent info endpoint
app.get('/info', (req, res) => {
  res.json({
    success: true,
    agent: {
      id: process.env.AGENT_ID || 'midnight-bot-agent',
      name: character.name,
      description: character.bio || 'MidnightOS AI Agent',
      platform: 'eliza',
      version: '1.0.0',
      status: 'running'
    },
    capabilities: {
      chat: true,
      mcp: true,
      blockchain: true,
      ai: true,
      platforms: {
        discord: !!process.env.DISCORD_TOKEN,
        telegram: !!process.env.TELEGRAM_TOKEN,
        twitter: !!process.env.TWITTER_API_KEY
      }
    }
  });
});

// Get conversation history endpoint
app.get('/conversations/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const history = conversations.get(sessionId) || [];
    
    res.json({
      success: true,
      sessionId,
      messages: history
    });
    
  } catch (error) {
    elizaLogger.error('Error fetching conversation history:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch conversation history' 
    });
  }
});

// Reset conversation endpoint
app.post('/conversations/:sessionId/reset', async (req, res) => {
  try {
    const { sessionId } = req.params;
    conversations.delete(sessionId);
    
    res.json({
      success: true,
      message: 'Conversation reset successfully',
      sessionId
    });
    
  } catch (error) {
    elizaLogger.error('Error resetting conversation:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to reset conversation' 
    });
  }
});

// Error handling middleware
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  elizaLogger.error(`Unhandled error: ${err.message}`);
  res.status(500).json({ 
    success: false, 
    error: 'Internal server error',
    details: err.message
  });
});

// Verify MCP connection
async function verifyMCPConnection(): Promise<boolean> {
  const mcpUrl = process.env.WALLET_MCP_URL || 'http://localhost:3001';
  try {
    elizaLogger.info(`Verifying MCP connection at ${mcpUrl}...`);
    const response = await fetch(`${mcpUrl}/health`);
    if (response.ok) {
      elizaLogger.info('✅ MCP service is reachable');
      return true;
    } else {
      elizaLogger.warn(`⚠️ MCP service returned status: ${response.status}`);
      return false;
    }
  } catch (error) {
    elizaLogger.error('❌ Failed to connect to MCP service:', error);
    return false;
  }
}

// Start server
async function startServer() {
  // Verify MCP connection
  const mcpConnected = await verifyMCPConnection();
  if (!mcpConnected) {
    elizaLogger.warn('⚠️ MCP service is not available. Eliza will start but MCP tools may not work.');
  }
  
  app.listen(PORT, () => {
    elizaLogger.info(`🚀 Eliza AI server running on port ${PORT}`);
    elizaLogger.info(`Agent ID: ${process.env.AGENT_ID || 'midnight-bot-agent'}`);
    elizaLogger.info(`Character: ${character.name}`);
    elizaLogger.info(`MCP URL: ${process.env.WALLET_MCP_URL || 'http://localhost:3001'}`);
    elizaLogger.info(`MCP Status: ${mcpConnected ? '✅ Connected' : '⚠️ Not Connected'}`);
    elizaLogger.info(`Mode: Intelligent Fallback Mode`);
    elizaLogger.info(`Health check: http://localhost:${PORT}/health`);
    elizaLogger.info(`Character plugins: ${character.plugins?.join(', ') || 'None'}`);
  });
}

startServer().catch(error => {
  elizaLogger.error('Failed to start server:', error);
  process.exit(1);
});

// Handle graceful shutdown
process.on('SIGINT', () => {
  elizaLogger.info('Shutting down Eliza AI server...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  elizaLogger.info('Shutting down Eliza AI server...');
  process.exit(0);
});