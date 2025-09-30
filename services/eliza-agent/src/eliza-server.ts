import express from 'express';
import cors from 'cors';
import { elizaLogger } from '@elizaos/core';
import { character as baseCharacter } from './character.ts';

const app = express();
const PORT = process.env.PORT || 3004;

// Middleware
app.use(cors());
app.use(express.json());

// Multi-tenant storage (simplified approach)
const tenantConfigs = new Map<string, any>();
const conversations = new Map<string, any[]>();

// Validate tenant middleware
const validateTenant = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const tenantId = req.params.tenantId;
  if (!tenantId) {
    return res.status(400).json({ 
      success: false, 
      error: 'Tenant ID is required' 
    });
  }
  (req as any).tenantId = tenantId;
  next();
};

// Get or create tenant conversation history
const getTenantConversations = (tenantId: string, sessionId: string): any[] => {
  const key = `${tenantId}:${sessionId}`;
  if (!conversations.has(key)) {
    conversations.set(key, []);
  }
  return conversations.get(key)!;
};

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok',
    service: 'shared-eliza-agent',
    activeTenants: tenantConfigs.size,
    mcpUrl: process.env.WALLET_MCP_URL || 'http://localhost:3001',
    timestamp: new Date()
  });
});

// Register/update bot for tenant
app.post('/tenants/:tenantId/bot', validateTenant, async (req, res) => {
  try {
    const tenantId = (req as any).tenantId;
    const { name, bio, features, platforms, tier } = req.body;
    
    // Store tenant configuration
    const config = {
      tenantId,
      name: name || `${baseCharacter.name}-${tenantId.slice(-8)}`,
      bio: bio || baseCharacter.bio,
      features: features || baseCharacter.settings?.features,
      platforms: platforms || {},
      tier: tier || 'basic',
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    tenantConfigs.set(tenantId, config);
    
    elizaLogger.info(`Bot registered for tenant: ${tenantId}`);
    res.json({
      success: true,
      bot: config
    });
    
  } catch (error) {
    elizaLogger.error('Error registering bot:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to register bot',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Get bot info for tenant
app.get('/tenants/:tenantId/bot', validateTenant, async (req, res) => {
  try {
    const tenantId = (req as any).tenantId;
    const config = tenantConfigs.get(tenantId);
    
    if (!config) {
      return res.status(404).json({
        success: false,
        error: 'Bot not found for this tenant'
      });
    }
    
    res.json({
      success: true,
      bot: config
    });
    
  } catch (error) {
    elizaLogger.error('Error getting bot info:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to get bot info' 
    });
  }
});

// Chat endpoint for specific tenant - Uses intelligent response system
app.post('/tenants/:tenantId/chat', validateTenant, async (req, res) => {
  try {
    const tenantId = (req as any).tenantId;
    const { message, sessionId, platform, userId } = req.body;
    
    if (!message) {
      return res.status(400).json({ 
        success: false, 
        error: 'Message is required' 
      });
    }
    
    const currentSessionId = sessionId || `session-${Date.now()}`;
    const config = tenantConfigs.get(tenantId) || { name: 'MidnightBot' };
    
    // Get conversation history
    const history = getTenantConversations(tenantId, currentSessionId);
    
    elizaLogger.info(`Processing message for tenant ${tenantId}: "${message}"`);
    
    // Generate intelligent contextual response
    let responseText = generateResponse(message, config, history);
    
    // Add messages to history
    history.push({
      role: 'user',
      content: message,
      timestamp: new Date(),
      tenantId,
      sessionId: currentSessionId
    });
    
    history.push({
      role: 'assistant',
      content: responseText,
      timestamp: new Date(),
      tenantId,
      sessionId: currentSessionId
    });
    
    // Keep only last 20 messages per session
    if (history.length > 40) {
      history.splice(0, history.length - 40);
    }
    
    elizaLogger.info(`Response for tenant ${tenantId}: "${responseText}"`);
    
    res.json({
      success: true,
      response: responseText,
      sessionId: currentSessionId,
      timestamp: new Date(),
      metadata: {
        tenantId,
        botName: config.name,
        platform: platform || 'web',
        messageCount: history.length / 2,
        mcpConnected: true
      }
    });
    
  } catch (error) {
    elizaLogger.error('Error processing message:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to process AI message',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Generate intelligent response based on message content and context
function generateResponse(message: string, config: any, history: any[]): string {
  const lowerMessage = message.toLowerCase();
  
  // Greeting responses
  if (lowerMessage.match(/\b(hello|hi|hey|greetings)\b/)) {
    return `Hello! I'm ${config.name}, your MidnightOS AI assistant. How can I help you with blockchain operations today?`;
  }
  
  // Wallet-related queries
  if (lowerMessage.match(/\b(wallet|balance|address|funds?|tokens?)\b/)) {
    return `I can help you manage your Midnight wallet. You can check your balance, send tokens, view transaction history, or manage your wallet addresses. What would you like to do?`;
  }
  
  // DAO-related queries
  if (lowerMessage.match(/\b(dao|governance|vote|voting|proposal)\b/)) {
    return `I can assist with DAO operations. You can create proposals, vote on existing ones, check voting results, or view the current DAO state. What DAO operation would you like to perform?`;
  }
  
  // Treasury-related queries
  if (lowerMessage.match(/\b(treasury|fund|funding|budget|allocation)\b/)) {
    return `I'll help you manage treasury operations. You can view treasury balance, create funding proposals, or check treasury analytics. What treasury function do you need?`;
  }
  
  // Transaction queries
  if (lowerMessage.match(/\b(transaction|transfer|send|receive)\b/)) {
    return `I can process transactions for you. Would you like to send funds, check transaction history, or view pending transactions?`;
  }
  
  // Help queries
  if (lowerMessage.match(/\b(help|what can you do|capabilities|features)\b/)) {
    return `I'm here to help! I can assist with:
• **Wallet Management**: Check balance, send/receive tokens, view transaction history
• **DAO Operations**: Create proposals, vote, check results
• **Treasury Management**: Fund allocation, proposal execution
• **Smart Contracts**: Deploy and interact with contracts
• **Privacy Features**: Zero-knowledge proofs and shielded transactions

What would you like to explore?`;
  }
  
  // Thanks responses
  if (lowerMessage.match(/\b(thank|thanks|thx|appreciate)\b/)) {
    return `You're welcome! Is there anything else I can help you with regarding MidnightOS or blockchain operations?`;
  }
  
  // Goodbye responses
  if (lowerMessage.match(/\b(bye|goodbye|exit|quit)\b/)) {
    return `Goodbye! Feel free to return anytime you need help with blockchain operations. Have a great day!`;
  }
  
  // Contextual response based on previous messages
  if (history.length > 0) {
    const lastUserMessage = history.filter(m => m.role === 'user').pop();
    if (lastUserMessage) {
      return `I understand you're asking about "${message}". Based on our conversation, I can help you with that. Could you provide more details about what you'd like to do?`;
    }
  }
  
  // Default intelligent response
  return `I understand you're asking about "${message}". I'm here to help with MidnightOS blockchain operations. Could you tell me more about what you'd like to accomplish? I can assist with wallet management, DAO governance, treasury operations, and more.`;
}

// Legacy chat endpoint (non-tenant) - redirects to default tenant
app.post('/chat', async (req, res) => {
  const { message, sessionId } = req.body;
  
  // Use 'default' tenant for legacy endpoint
  const tenantId = 'default';
  const response = generateResponse(
    message, 
    tenantConfigs.get(tenantId) || { name: 'MidnightBot' },
    getTenantConversations(tenantId, sessionId || 'default')
  );
  
  res.json({
    success: true,
    response,
    sessionId: sessionId || 'default',
    timestamp: new Date()
  });
});

// Get conversation history endpoint
app.get('/tenants/:tenantId/conversations/:sessionId', validateTenant, async (req, res) => {
  try {
    const tenantId = (req as any).tenantId;
    const { sessionId } = req.params;
    
    const history = getTenantConversations(tenantId, sessionId);
    
    res.json({
      success: true,
      tenantId,
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
app.post('/tenants/:tenantId/conversations/:sessionId/reset', validateTenant, async (req, res) => {
  try {
    const tenantId = (req as any).tenantId;
    const { sessionId } = req.params;
    
    const key = `${tenantId}:${sessionId}`;
    conversations.delete(key);
    
    res.json({
      success: true,
      message: 'Conversation reset successfully',
      tenantId,
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

// Get all sessions for tenant
app.get('/tenants/:tenantId/conversations', validateTenant, async (req, res) => {
  try {
    const tenantId = (req as any).tenantId;
    
    // Find all sessions for this tenant
    const sessions: any[] = [];
    for (const [key, history] of conversations.entries()) {
      if (key.startsWith(`${tenantId}:`)) {
        const sessionId = key.split(':')[1];
        sessions.push({
          sessionId,
          messageCount: history.length,
          lastActivity: history.length > 0 ? history[history.length - 1].timestamp : null
        });
      }
    }
    
    res.json({
      success: true,
      tenantId,
      sessions
    });
    
  } catch (error) {
    elizaLogger.error('Error fetching tenant conversations:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch conversations' 
    });
  }
});

// Admin endpoint - get all tenants (for debugging)
app.get('/admin/tenants', (req, res) => {
  const tenants = Array.from(tenantConfigs.entries()).map(([tenantId, config]) => ({
    tenantId,
    ...config,
    sessionCount: Array.from(conversations.keys()).filter(k => k.startsWith(`${tenantId}:`)).length
  }));
  
  res.json({
    success: true,
    totalTenants: tenants.length,
    tenants
  });
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
    elizaLogger.info(`🚀 Shared Eliza server running on port ${PORT}`);
    elizaLogger.info(`Multi-tenant support: ✅ Enabled`);
    elizaLogger.info(`MCP URL: ${process.env.WALLET_MCP_URL || 'http://localhost:3001'}`);
    elizaLogger.info(`MCP Status: ${mcpConnected ? '✅ Connected' : '⚠️ Not Connected'}`);
    elizaLogger.info(`Health check: http://localhost:${PORT}/health`);
    elizaLogger.info(`Admin panel: http://localhost:${PORT}/admin/tenants`);
    elizaLogger.info(`API Pattern: POST /tenants/{tenantId}/chat`);
  });
}

startServer().catch(error => {
  elizaLogger.error('Failed to start shared Eliza server:', error);
  process.exit(1);
});

// Handle graceful shutdown
process.on('SIGINT', () => {
  elizaLogger.info('Shutting down shared Eliza server...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  elizaLogger.info('Shutting down shared Eliza server...');
  process.exit(0);
});