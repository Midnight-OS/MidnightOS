/**
 * CORRECT Multi-Tenant ElizaOS Server
 * 
 * Instead of keyword matching, this uses the ACTUAL ElizaOS runtime
 * with dynamic agent management per tenant.
 */

import express from 'express';
import cors from 'cors';
import { 
  type IAgentRuntime, 
  type Character,
  AgentRuntime,
  elizaLogger,
  ModelProviderName,
  parseArguments,
  getTokenForProvider,
} from '@elizaos/core';
import { character as baseCharacter } from '../../eliza-agent/src/character.ts';
import midnightPlugin from '../../eliza-agent/src/plugin.ts';

const app = express();
const PORT = process.env.PORT || 3004;

app.use(cors());
app.use(express.json());

// Store runtime instances per tenant
const tenantRuntimes = new Map<string, IAgentRuntime>();

// Middleware to extract tenant ID
const validateTenant = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const tenantId = req.params.tenantId;
  if (!tenantId) {
    return res.status(400).json({ error: 'Tenant ID required' });
  }
  (req as any).tenantId = tenantId;
  next();
};

/**
 * Create or get ElizaOS runtime for a specific tenant
 * This is the KEY: Each tenant gets their own IAgentRuntime
 * but they all run in the same Node process!
 */
async function getTenantRuntime(tenantId: string, botConfig?: any): Promise<IAgentRuntime> {
  // If runtime already exists, return it
  if (tenantRuntimes.has(tenantId)) {
    return tenantRuntimes.get(tenantId)!;
  }

  // Create tenant-specific character config
  const tenantCharacter: Character = {
    ...baseCharacter,
    name: botConfig?.name || `MidnightBot-${tenantId.slice(-8)}`,
    id: tenantId, // Important: Each tenant gets unique character ID
    settings: {
      ...baseCharacter.settings,
      secrets: {
        ...baseCharacter.settings?.secrets,
        // Tenant-specific wallet seed
        midnightWalletSeed: botConfig?.walletSeed,
      },
    },
  };

  elizaLogger.info(`🤖 Creating new runtime for tenant: ${tenantId}`);

  // Create new AgentRuntime with tenant's character
  const runtime = new AgentRuntime({
    character: tenantCharacter,
    token: getTokenForProvider(ModelProviderName.OPENAI, tenantCharacter),
    databaseAdapter: undefined, // Use memory adapter for now
    serverUrl: process.env.SERVER_URL || 'http://localhost:3000',
  });

  // Register Midnight plugin
  await runtime.registerPlugin(midnightPlugin);

  // Initialize the runtime
  await runtime.initialize();

  // Store for reuse
  tenantRuntimes.set(tenantId, runtime);

  elizaLogger.info(`✅ Runtime initialized for tenant: ${tenantId}`);
  return runtime;
}

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'shared-eliza-ai',
    activeRuntimes: tenantRuntimes.size,
    mcpUrl: process.env.WALLET_MCP_URL || 'http://localhost:3001',
  });
});

// Register/update bot for tenant
app.post('/tenants/:tenantId/bot', validateTenant, async (req, res) => {
  try {
    const tenantId = (req as any).tenantId;
    const botConfig = req.body;

    // Create/update runtime with new config
    const runtime = await getTenantRuntime(tenantId, botConfig);

    res.json({
      success: true,
      bot: {
        id: tenantId,
        name: runtime.character.name,
        status: 'active',
      },
    });
  } catch (error) {
    elizaLogger.error('Error registering bot:', error);
    res.status(500).json({ error: 'Failed to register bot' });
  }
});

// Chat endpoint - THIS USES REAL AI!
app.post('/tenants/:tenantId/chat', validateTenant, async (req, res) => {
  try {
    const tenantId = (req as any).tenantId;
    const { message, sessionId, userId } = req.body;

    if (!message) {
      return res.status(400).json({ error: 'Message required' });
    }

    // Get the tenant's runtime (with real ElizaOS AI!)
    const runtime = await getTenantRuntime(tenantId);

    // Create room ID (session) for conversation context
    const roomId = sessionId || `session-${Date.now()}`;

    // Use ElizaOS to process the message with ACTUAL AI
    const response = await runtime.processMessage({
      content: { text: message },
      userId: userId || 'user',
      roomId,
    });

    res.json({
      success: true,
      response: response.text,
      sessionId: roomId,
      timestamp: new Date(),
      metadata: {
        tenantId,
        botId: runtime.character.id,
        botName: runtime.character.name,
        model: runtime.modelProvider, // Shows which AI model responded
      },
    });
  } catch (error) {
    elizaLogger.error('Error processing chat:', error);
    res.status(500).json({ 
      error: 'Failed to process message',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// Get conversation history
app.get('/tenants/:tenantId/conversations/:sessionId', validateTenant, async (req, res) => {
  try {
    const tenantId = (req as any).tenantId;
    const { sessionId } = req.params;

    const runtime = await getTenantRuntime(tenantId);
    
    // Get messages from ElizaOS memory system
    const messages = await runtime.messageManager.getMemories({
      roomId: sessionId,
      count: 50,
    });

    res.json({
      success: true,
      tenantId,
      sessionId,
      messages,
    });
  } catch (error) {
    elizaLogger.error('Error fetching history:', error);
    res.status(500).json({ error: 'Failed to fetch conversation' });
  }
});

// Admin endpoint
app.get('/admin/tenants', (req, res) => {
  const tenants = Array.from(tenantRuntimes.entries()).map(([tenantId, runtime]) => ({
    tenantId,
    botName: runtime.character.name,
    model: runtime.modelProvider,
    plugins: runtime.character.plugins,
  }));

  res.json({
    success: true,
    totalTenants: tenants.length,
    tenants,
  });
});

// Cleanup runtime on tenant deletion
app.delete('/tenants/:tenantId', validateTenant, async (req, res) => {
  try {
    const tenantId = (req as any).tenantId;
    
    const runtime = tenantRuntimes.get(tenantId);
    if (runtime) {
      // Cleanup runtime resources
      await runtime.stop();
      tenantRuntimes.delete(tenantId);
    }

    res.json({
      success: true,
      message: 'Tenant runtime deleted',
    });
  } catch (error) {
    elizaLogger.error('Error deleting tenant:', error);
    res.status(500).json({ error: 'Failed to delete tenant' });
  }
});

// Start server
async function startServer() {
  app.listen(PORT, () => {
    elizaLogger.info(`🚀 Multi-Tenant ElizaOS Server (REAL AI!) running on port ${PORT}`);
    elizaLogger.info(`Health: http://localhost:${PORT}/health`);
    elizaLogger.info(`API: POST /tenants/{tenantId}/chat`);
  });
}

startServer().catch(error => {
  elizaLogger.error('Failed to start server:', error);
  process.exit(1);
});

// Graceful shutdown
process.on('SIGINT', async () => {
  elizaLogger.info('Shutting down...');
  // Stop all runtimes
  for (const [tenantId, runtime] of tenantRuntimes) {
    await runtime.stop();
  }
  process.exit(0);
});
