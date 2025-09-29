import express from 'express';
import cors from 'cors';

const app = express();
const PORT = process.env.PORT || 3003;

// Middleware
app.use(cors());
app.use(express.json());

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok',
    agentId: process.env.AGENT_ID,
    timestamp: new Date()
  });
});

// Chat endpoint for orchestrator communication
app.post('/chat', async (req, res) => {
  try {
    const { message, sessionId, platform, userId } = req.body;
    
    if (!message) {
      return res.status(400).json({ 
        success: false, 
        error: 'Message is required' 
      });
    }

    // For now, just echo back a simple response
    // The actual Eliza agent will be started separately
    res.json({
      success: true,
      response: `I received your message: "${message}". I'm the Eliza agent for tenant ${process.env.AGENT_ID}.`,
      sessionId: sessionId || `session-${Date.now()}`,
      timestamp: new Date(),
      metadata: {
        agentId: process.env.AGENT_ID,
        platform: platform || 'web'
      }
    });
    
  } catch (error) {
    console.error('Error processing chat message:', error);
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
      id: process.env.AGENT_ID,
      name: 'MidnightOS Agent',
      description: 'AI agent for MidnightOS platform',
      platform: 'eliza',
      version: '1.0.0'
    },
    capabilities: {
      chat: true,
      mcp: true,
      blockchain: true,
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
    
    // For now, return empty history
    res.json({
      success: true,
      sessionId,
      messages: []
    });
    
  } catch (error) {
    console.error('Error fetching conversation history:', error);
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
    
    res.json({
      success: true,
      message: 'Conversation reset successfully',
      sessionId
    });
    
  } catch (error) {
    console.error('Error resetting conversation:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to reset conversation' 
    });
  }
});

// Error handling middleware
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Unhandled error:', err);
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
    console.log(`Verifying MCP connection at ${mcpUrl}...`);
    const response = await fetch(`${mcpUrl}/health`);
    if (response.ok) {
      console.log('✅ MCP service is reachable');
      return true;
    } else {
      console.warn(`⚠️ MCP service returned status: ${response.status}`);
      return false;
    }
  } catch (error) {
    console.error('❌ Failed to connect to MCP service:', error);
    return false;
  }
}

// Start server with MCP verification
async function startServer() {
  // Verify MCP connection
  const mcpConnected = await verifyMCPConnection();
  if (!mcpConnected) {
    console.warn('⚠️ MCP service is not available. Eliza will start but MCP tools may not work.');
    console.warn(`⚠️ Please ensure MCP service is running at: ${process.env.WALLET_MCP_URL || 'http://localhost:3001'}`);
  }
  
  app.listen(PORT, () => {
    console.log(`🚀 Eliza HTTP server running on port ${PORT}`);
    console.log(`Agent ID: ${process.env.AGENT_ID}`);
    console.log(`MCP URL: ${process.env.WALLET_MCP_URL || 'http://localhost:3001'}`);
    console.log(`MCP Status: ${mcpConnected ? '✅ Connected' : '⚠️ Not Connected'}`);
    console.log(`Health check: http://localhost:${PORT}/health`);
  });
}

startServer().catch(error => {
  console.error('Failed to start server:', error);
  process.exit(1);
});

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('Shutting down Eliza HTTP server...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('Shutting down Eliza HTTP server...');
  process.exit(0);
});