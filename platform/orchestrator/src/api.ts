import express from 'express';
import cors from 'cors';
import * as dotenv from 'dotenv';
import { ContainerManager } from './containerManager';
import { AuthService } from './auth';
import { DatabaseService } from './database';

// Load environment variables
dotenv.config();

const app = express();
const containerManager = new ContainerManager();
const authService = new AuthService();
const db = new DatabaseService();

app.use(cors());
app.use(express.json());

// Middleware for authentication
const authenticate = async (req: any, res: any, next: any) => {
  // Skip authentication in development mode if SKIP_AUTH is set
  if (process.env.SKIP_AUTH === 'true' || process.env.NODE_ENV === 'development') {
    req.user = { id: 'dev-user-123', email: 'dev@midnightos.ai' };
    return next();
  }

  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No token provided' });
  
  try {
    // Support dev-token for development
    if (token === 'dev-token' && process.env.NODE_ENV === 'development') {
      req.user = { id: 'dev-user-123', email: 'dev@midnightos.ai' };
      return next();
    }
    
    const user = await authService.verifyToken(token);
    req.user = user;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Invalid token' });
  }
};

// ============ Public Endpoints ============

/**
 * User Registration
 */
app.post('/api/register', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    // Create user in database
    const user = await db.createUser({ email, password });
    
    // Generate auth token
    const token = authService.generateToken(user.id);
    
    res.json({ 
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.email.split('@')[0] // Use email prefix as name
      }
    });
  } catch (error: any) {
    if (error.message === 'User with this email already exists') {
      res.status(409).json({ error: 'Email already registered' });
    } else {
      res.status(400).json({ error: error.message });
    }
  }
});

/**
 * User Login
 */
app.post('/api/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    const user = await db.authenticateUser(email, password);
    const token = authService.generateToken(user.id);
    
    res.json({ 
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.email.split('@')[0] // Use email prefix as name
      }
    });
  } catch (error: any) {
    res.status(401).json({ error: 'Invalid credentials' });
  }
});

// ============ Activity/Notification Endpoints ============

/**
 * Get user activities/notifications
 */
app.get('/api/activities', authenticate, async (req, res) => {
  try {
    const { limit, offset, unread, botId } = req.query;
    
    const activities = await db.getUserActivities(req.user!.id, {
      limit: limit ? parseInt(limit as string) : 50,
      offset: offset ? parseInt(offset as string) : 0,
      unreadOnly: unread === 'true',
      botId: botId as string
    });
    
    res.json({ activities });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Get activity statistics
 */
app.get('/api/activities/stats', authenticate, async (req, res) => {
  try {
    const stats = await db.getActivityStats(req.user!.id);
    res.json(stats);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Mark activities as read
 */
app.post('/api/activities/read', authenticate, async (req, res) => {
  try {
    const { activityIds } = req.body;
    await db.markActivitiesAsRead(req.user!.id, activityIds);
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Get unread count
 */
app.get('/api/activities/unread-count', authenticate, async (req, res) => {
  try {
    const count = await db.getUnreadActivityCount(req.user!.id);
    res.json({ count });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ============ Protected Endpoints ============

/**
 * Create a new bot for the user
 */
app.post('/api/bots', authenticate, async (req, res) => {
  try {
    const { 
      name,
      features,      // { wallet: true, dao: false, marketplace: true }
      platforms,     // { discord: { token: "xxx" }, telegram: { token: "yyy" } }
      tier = 'basic'
    } = req.body;
    
    const userConfig = {
      userId: req.user!.id,
      email: req.user!.email,
      tier,
      features,
      platforms
    };
    
    // Create container for user
    const containerInfo = await containerManager.createUserContainer(userConfig);
    
    // Save bot to database
    const bot = await db.createBot({
      userId: req.user!.id,
      name,
      tenantId: containerInfo.tenantId,
      walletAddress: containerInfo.walletAddress,
      elizaPort: containerInfo.elizaPort,
      features,
      platforms,
      status: 'active'
    });
    
    res.json({
      success: true,
      bot: {
        id: bot.id,
        name: bot.name,
        walletAddress: containerInfo.walletAddress,
        status: 'deploying',
        features,
        platforms: Object.keys(platforms)
      }
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Get user's bots
 */
app.get('/api/bots', authenticate, async (req, res) => {
  try {
    const bots = await db.getUserBots(req.user!.id);
    
    // Add real-time status for each bot
    const botsWithStatus = await Promise.all(
      bots.map(async (bot: any) => {
        try {
          // Check container status - skip for mock data in development
          if (process.env.NODE_ENV === 'development' && bot.id.startsWith('bot-')) {
            // Return mock status for development bots
            return {
              ...bot,
              agentStatus: { status: 'healthy', uptime: '2h 30m', version: '1.0.0' },
              containerStatus: bot.status === 'paused' ? 'paused' : 'running',
              walletStatus: {
                balance: { total: Math.random() * 1000 + 50 },
                transactionCount: Math.floor(Math.random() * 100) + 1
              }
            };
          }
          
          const response = await fetch(`http://localhost:${bot.elizaPort}/health`);
          const agentStatus = await response.json();
          
          return {
            ...bot,
            agentStatus,
            containerStatus: 'running'
          };
        } catch (error) {
          return {
            ...bot,
            containerStatus: 'error'
          };
        }
      })
    );
    
    res.json({ bots: botsWithStatus });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Get specific bot details
 */
app.get('/api/bots/:botId', authenticate, async (req, res) => {
  try {
    const bot = await db.getBot(req.params.botId);
    
    if (bot.userId !== req.user!.id) {
      return res.status(403).json({ error: 'Unauthorized' });
    }
    
    // Get wallet balance
    const balanceResponse = await fetch(`http://localhost:${bot.walletPort}/wallet/balance`);
    const balance = await balanceResponse.json();
    
    // Get transaction history
    const txResponse = await fetch(`http://localhost:${bot.walletPort}/wallet/transactions`);
    const transactions: any = await txResponse.json();
    
    res.json({
      bot,
      wallet: {
        balance,
        transactions: Array.isArray(transactions) ? transactions.slice(0, 10) : [] // Last 10 transactions
      }
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Execute bot command (proxy to container)
 */
app.post('/api/bots/:botId/execute', authenticate, async (req, res) => {
  try {
    const { command, args } = req.body;
    const bot = await db.getBot(req.params.botId);
    
    if (bot.userId !== req.user!.id) {
      return res.status(403).json({ error: 'Unauthorized' });
    }
    
    // Map commands to wallet endpoints
    const commandMap: any = {
      'getBalance': { endpoint: '/wallet/balance', method: 'GET' },
      'sendFunds': { endpoint: '/wallet/send', method: 'POST' },
      'getTransactions': { endpoint: '/wallet/transactions', method: 'GET' },
      'openElection': { endpoint: '/dao/open-election', method: 'POST' },
      'castVote': { endpoint: '/dao/cast-vote', method: 'POST' },
      'getDaoState': { endpoint: '/dao/state', method: 'GET' }
    };
    
    const cmdInfo = commandMap[command];
    if (!cmdInfo) {
      return res.status(400).json({ error: 'Unknown command' });
    }
    
    // Execute command against user's container
    const url = `http://localhost:${bot.walletPort}${cmdInfo.endpoint}`;
    const response = await fetch(url, {
      method: cmdInfo.method,
      headers: { 'Content-Type': 'application/json' },
      body: cmdInfo.method === 'POST' ? JSON.stringify(args) : undefined
    });
    
    const result = await response.json();
    
    // Log command execution
    await db.logCommand({
      botId: bot.id,
      command,
      args,
      result,
      timestamp: new Date()
    });
    
    res.json({ success: true, result });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Update bot configuration
 */
app.put('/api/bots/:botId', authenticate, async (req, res) => {
  try {
    const { features, platforms } = req.body;
    const bot = await db.getBot(req.params.botId);
    
    if (bot.userId !== req.user!.id) {
      return res.status(403).json({ error: 'Unauthorized' });
    }
    
    // Update bot configuration in database
    await db.updateBot(req.params.botId, { features, platforms });
    
    // Update container configuration and restart
    const updatedConfig = {
      userId: bot.userId,
      email: req.user!.email,
      tier: bot.tier || 'basic',
      features: features || bot.features,
      platforms: platforms || bot.platforms
    };
    
    await containerManager.updateUserContainer(bot.tenantId, updatedConfig);
    
    res.json({ 
      success: true, 
      status: 'restarting',
      message: 'Bot is restarting with new configuration' 
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Stop bot
 */
app.post('/api/bots/:botId/stop', authenticate, async (req, res) => {
  try {
    const bot = await db.getBot(req.params.botId);
    
    if (bot.userId !== req.user!.id) {
      return res.status(403).json({ error: 'Unauthorized' });
    }
    
    await containerManager.stopUserContainer(bot.tenantId);
    await db.updateBot(req.params.botId, { status: 'stopped' });
    
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Test Discord bot token
 */
app.post('/api/bots/test/discord', authenticate, async (req, res) => {
  try {
    const { token } = req.body;
    
    if (!token) {
      return res.status(400).json({ error: 'Discord token is required' });
    }
    
    // Test the Discord token by fetching bot info
    const response = await fetch('https://discord.com/api/v10/users/@me', {
      headers: {
        'Authorization': `Bot ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      return res.json({ valid: false, error: 'Invalid Discord token' });
    }
    
    const botInfo = await response.json();
    
    res.json({
      valid: true,
      username: botInfo.username,
      discriminator: botInfo.discriminator,
      id: botInfo.id,
      avatar: botInfo.avatar
    });
  } catch (error: any) {
    res.json({ valid: false, error: error.message });
  }
});

/**
 * Test Telegram bot token
 */
app.post('/api/bots/test/telegram', authenticate, async (req, res) => {
  try {
    const { token } = req.body;
    
    if (!token) {
      return res.status(400).json({ error: 'Telegram token is required' });
    }
    
    // Test the Telegram token by fetching bot info
    const response = await fetch(`https://api.telegram.org/bot${token}/getMe`);
    
    if (!response.ok) {
      return res.json({ valid: false, error: 'Invalid Telegram token' });
    }
    
    const result = await response.json();
    
    if (!result.ok) {
      return res.json({ valid: false, error: 'Invalid Telegram token' });
    }
    
    res.json({
      valid: true,
      username: result.result.username,
      firstName: result.result.first_name,
      id: result.result.id,
      canJoinGroups: result.result.can_join_groups,
      canReadAllGroupMessages: result.result.can_read_all_group_messages
    });
  } catch (error: any) {
    res.json({ valid: false, error: error.message });
  }
});

/**
 * Start bot
 */
app.post('/api/bots/:botId/start', authenticate, async (req, res) => {
  try {
    const bot = await db.getBot(req.params.botId);
    
    if (bot.userId !== req.user!.id) {
      return res.status(403).json({ error: 'Unauthorized' });
    }
    
    await containerManager.startUserContainer(bot.tenantId);
    await db.updateBot(req.params.botId, { status: 'running' });
    
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Pause bot (stops bot container but keeps wallet running)
 */
app.post('/api/bots/:botId/pause', authenticate, async (req, res) => {
  try {
    const bot = await db.getBot(req.params.botId);
    
    if (bot.userId !== req.user!.id) {
      return res.status(403).json({ error: 'Unauthorized' });
    }
    
    await containerManager.pauseBotContainer(bot.tenantId);
    await db.updateBot(req.params.botId, { status: 'paused' });
    
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Resume bot (restarts bot container)
 */
app.post('/api/bots/:botId/resume', authenticate, async (req, res) => {
  try {
    const bot = await db.getBot(req.params.botId);
    
    if (bot.userId !== req.user!.id) {
      return res.status(403).json({ error: 'Unauthorized' });
    }
    
    await containerManager.resumeBotContainer(bot.tenantId);
    await db.updateBot(req.params.botId, { status: 'running' });
    
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Get bot status
 */
app.get('/api/bots/:botId/status', authenticate, async (req, res) => {
  try {
    const bot = await db.getBot(req.params.botId);
    
    if (bot.userId !== req.user!.id) {
      return res.status(403).json({ error: 'Unauthorized' });
    }
    
    const status = await containerManager.getContainerStatus(bot.tenantId);
    
    res.json({ 
      status: bot.status,
      containers: status
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Delete bot
 */
app.delete('/api/bots/:botId', authenticate, async (req, res) => {
  try {
    const bot = await db.getBot(req.params.botId);
    
    if (bot.userId !== req.user!.id) {
      return res.status(403).json({ error: 'Unauthorized' });
    }
    
    await containerManager.deleteUserContainer(bot.tenantId);
    await db.deleteBot(req.params.botId);
    
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Get bot logs
 */
app.get('/api/bots/:botId/logs', authenticate, async (req, res) => {
  try {
    const bot = await db.getBot(req.params.botId);
    
    if (bot.userId !== req.user!.id) {
      return res.status(403).json({ error: 'Unauthorized' });
    }
    
    const logs = await containerManager.getContainerLogs(bot.tenantId);
    
    res.json({ logs });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ============ PLATFORM CONNECTION ENDPOINTS ============

/**
 * Test Discord connection
 */
app.post('/api/bots/:botId/platforms/discord/test', authenticate, async (req, res) => {
  try {
    const { token, serverId } = req.body;
    const bot = await db.getBot(req.params.botId);
    
    if (bot.userId !== req.user!.id) {
      return res.status(403).json({ error: 'Unauthorized' });
    }
    
    // Simple validation for Discord token format
    if (!token || !token.startsWith('M') || token.length < 50) {
      return res.status(400).json({
        success: false,
        error: 'Invalid Discord bot token format'
      });
    }
    
    // Test Discord API
    try {
      const response = await fetch('https://discord.com/api/v10/users/@me', {
        headers: {
          'Authorization': `Bot ${token}`
        }
      });
      
      if (response.ok) {
        const botInfo: any = await response.json();
        res.json({
          success: true,
          message: `Connected to Discord as ${botInfo.username}`,
          botName: botInfo.username,
          botId: botInfo.id
        });
      } else {
        res.status(400).json({
          success: false,
          error: 'Invalid Discord token - unable to authenticate'
        });
      }
    } catch (error) {
      res.status(400).json({
        success: false,
        error: 'Failed to connect to Discord API'
      });
    }
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Test Telegram connection
 */
app.post('/api/bots/:botId/platforms/telegram/test', authenticate, async (req, res) => {
  try {
    const { token } = req.body;
    const bot = await db.getBot(req.params.botId);
    
    if (bot.userId !== req.user!.id) {
      return res.status(403).json({ error: 'Unauthorized' });
    }
    
    // Test Telegram API
    try {
      const response = await fetch(`https://api.telegram.org/bot${token}/getMe`);
      
      if (response.ok) {
        const data: any = await response.json();
        if (data.ok) {
          res.json({
            success: true,
            message: `Connected to Telegram as ${data.result.username}`,
            botName: data.result.username,
            botId: data.result.id
          });
        } else {
          res.status(400).json({
            success: false,
            error: 'Invalid Telegram token'
          });
        }
      } else {
        res.status(400).json({
          success: false,
          error: 'Invalid Telegram token - unable to authenticate'
        });
      }
    } catch (error) {
      res.status(400).json({
        success: false,
        error: 'Failed to connect to Telegram API'
      });
    }
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Get platform status for bot
 */
app.get('/api/bots/:botId/platforms/status', authenticate, async (req, res) => {
  try {
    const bot = await db.getBot(req.params.botId);
    
    if (bot.userId !== req.user!.id) {
      return res.status(403).json({ error: 'Unauthorized' });
    }
    
    const status: any = {
      discord: { configured: false, connected: false },
      telegram: { configured: false, connected: false }
    };
    
    // Check Discord
    if (bot.platforms?.discord?.token) {
      status.discord.configured = true;
      try {
        const response = await fetch('https://discord.com/api/v10/users/@me', {
          headers: { 'Authorization': `Bot ${bot.platforms.discord.token}` }
        });
        status.discord.connected = response.ok;
      } catch (error) {
        status.discord.connected = false;
      }
    }
    
    // Check Telegram
    if (bot.platforms?.telegram?.token) {
      status.telegram.configured = true;
      try {
        const response = await fetch(`https://api.telegram.org/bot${bot.platforms.telegram.token}/getMe`);
        const data: any = await response.json();
        status.telegram.connected = data.ok === true;
      } catch (error) {
        status.telegram.connected = false;
      }
    }
    
    res.json({ platforms: status });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ============ TOKEN MANAGEMENT ENDPOINTS ============

/**
 * Register a new token for a bot
 */
app.post('/api/bots/:botId/tokens/register', authenticate, async (req, res) => {
  try {
    const bot = await db.getBot(req.params.botId);
    if (bot.userId !== req.user!.id) {
      return res.status(403).json({ error: 'Unauthorized' });
    }
    
    const response = await fetch(`http://localhost:${bot.walletPort}/wallet/tokens/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req.body)
    });
    
    const result = await response.json();
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Get token balance
 */
app.get('/api/bots/:botId/tokens/:tokenName/balance', authenticate, async (req, res) => {
  try {
    const bot = await db.getBot(req.params.botId);
    if (bot.userId !== req.user!.id) {
      return res.status(403).json({ error: 'Unauthorized' });
    }
    
    const response = await fetch(`http://localhost:${bot.walletPort}/wallet/tokens/balance/${req.params.tokenName}`);
    const result = await response.json();
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Send tokens
 */
app.post('/api/bots/:botId/tokens/send', authenticate, async (req, res) => {
  try {
    const bot = await db.getBot(req.params.botId);
    if (bot.userId !== req.user!.id) {
      return res.status(403).json({ error: 'Unauthorized' });
    }
    
    const response = await fetch(`http://localhost:${bot.walletPort}/wallet/tokens/send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req.body)
    });
    
    const result = await response.json();
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * List all wallet tokens
 */
app.get('/api/bots/:botId/tokens/list', authenticate, async (req, res) => {
  try {
    const bot = await db.getBot(req.params.botId);
    if (bot.userId !== req.user!.id) {
      return res.status(403).json({ error: 'Unauthorized' });
    }
    
    const response = await fetch(`http://localhost:${bot.walletPort}/wallet/tokens/list`);
    const result = await response.json();
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ============ DAO OPERATIONS ENDPOINTS ============

/**
 * Open DAO election
 */
app.post('/api/bots/:botId/dao/open-election', authenticate, async (req, res) => {
  try {
    const bot = await db.getBot(req.params.botId);
    if (bot.userId !== req.user!.id) {
      return res.status(403).json({ error: 'Unauthorized' });
    }
    
    const response = await fetch(`http://localhost:${bot.walletPort}/dao/open-election`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req.body)
    });
    
    const result = await response.json();
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Cast DAO vote
 */
app.post('/api/bots/:botId/dao/cast-vote', authenticate, async (req, res) => {
  try {
    const bot = await db.getBot(req.params.botId);
    if (bot.userId !== req.user!.id) {
      return res.status(403).json({ error: 'Unauthorized' });
    }
    
    const response = await fetch(`http://localhost:${bot.walletPort}/dao/cast-vote`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req.body)
    });
    
    const result = await response.json();
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Get DAO state
 */
app.get('/api/bots/:botId/dao/state', authenticate, async (req, res) => {
  try {
    const bot = await db.getBot(req.params.botId);
    if (bot.userId !== req.user!.id) {
      return res.status(403).json({ error: 'Unauthorized' });
    }
    
    const response = await fetch(`http://localhost:${bot.walletPort}/dao/state`);
    const result = await response.json();
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ============ TREASURY MANAGEMENT ENDPOINTS ============

/**
 * Deploy DAO Treasury contracts to blockchain
 */
app.post('/api/bots/:botId/treasury/deploy', authenticate, async (req, res) => {
  try {
    const bot = await db.getBot(req.params.botId);
    if (bot.userId !== req.user!.id) {
      return res.status(403).json({ error: 'Unauthorized' });
    }
    
    const response = await fetch(`http://localhost:${bot.walletPort}/treasury/deploy`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req.body)
    });
    
    const result = await response.json();
    
    // Save deployed contract addresses to database
    const typedResult = result as any;
    if (typedResult.success && typedResult.contracts) {
      await db.updateBot(req.params.botId, {
        daoContracts: typedResult.contracts,
        treasuryAddress: typedResult.treasuryAddress
      });
    }
    
    res.json(typedResult);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Create treasury proposal
 */
app.post('/api/bots/:botId/treasury/proposals', authenticate, async (req, res) => {
  try {
    const bot = await db.getBot(req.params.botId);
    if (bot.userId !== req.user!.id) {
      return res.status(403).json({ error: 'Unauthorized' });
    }
    
    const response = await fetch(`http://localhost:${bot.walletPort}/treasury/create-proposal`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req.body)
    });
    
    const result = await response.json();
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Get treasury proposals
 */
app.get('/api/bots/:botId/treasury/proposals', authenticate, async (req, res) => {
  try {
    const bot = await db.getBot(req.params.botId);
    if (bot.userId !== req.user!.id) {
      return res.status(403).json({ error: 'Unauthorized' });
    }
    
    const response = await fetch(`http://localhost:${bot.walletPort}/treasury/proposals`);
    const result = await response.json();
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Fund DAO treasury
 */
app.post('/api/bots/:botId/treasury/fund', authenticate, async (req, res) => {
  try {
    const bot = await db.getBot(req.params.botId);
    if (bot.userId !== req.user!.id) {
      return res.status(403).json({ error: 'Unauthorized' });
    }
    
    const response = await fetch(`http://localhost:${bot.walletPort}/dao/fund-treasury`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req.body)
    });
    
    const result = await response.json();
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Get treasury analytics
 */
app.get('/api/bots/:botId/treasury/analytics', authenticate, async (req, res) => {
  try {
    const bot = await db.getBot(req.params.botId);
    if (bot.userId !== req.user!.id) {
      return res.status(403).json({ error: 'Unauthorized' });
    }
    
    const response = await fetch(`http://localhost:${bot.walletPort}/treasury/analytics`);
    const result = await response.json();
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ============ PUBLIC PLATFORM TEST ENDPOINTS ============

/**
 * Quick test Discord bot token (no auth required)
 */
app.post('/api/bots/test/discord', async (req, res) => {
  try {
    const { token } = req.body;
    if (!token) {
      return res.status(400).json({ error: 'Discord token required' });
    }

    // Test Discord API
    const response = await fetch('https://discord.com/api/v10/users/@me', {
      headers: { 'Authorization': `Bot ${token}` }
    });

    if (response.ok) {
      const botInfo = await response.json() as any;
      res.json({
        success: true,
        message: `Connected to Discord as ${botInfo.username}`,
        botInfo: {
          id: botInfo.id,
          username: botInfo.username,
          discriminator: botInfo.discriminator
        }
      });
    } else {
      res.status(401).json({ 
        success: false,
        error: 'Invalid Discord token - unable to authenticate' 
      });
    }
  } catch (error: any) {
    res.status(500).json({ 
      success: false,
      error: 'Failed to connect to Discord API',
      message: error.message 
    });
  }
});

/**
 * Quick test Telegram bot token (no auth required)  
 */
app.post('/api/bots/test/telegram', async (req, res) => {
  try {
    const { token } = req.body;
    if (!token) {
      return res.status(400).json({ error: 'Telegram token required' });
    }

    // Test Telegram API
    const response = await fetch(`https://api.telegram.org/bot${token}/getMe`);
    const data = await response.json() as any;

    if (data.ok) {
      res.json({
        success: true,
        message: `Connected to Telegram as ${data.result.username}`,
        botInfo: {
          id: data.result.id,
          username: data.result.username,
          firstName: data.result.first_name,
          canJoinGroups: data.result.can_join_groups,
          canReadAllGroupMessages: data.result.can_read_all_group_messages
        }
      });
    } else {
      res.status(401).json({ 
        success: false,
        error: 'Invalid Telegram token - unable to authenticate',
        description: data.description 
      });
    }
  } catch (error: any) {
    res.status(500).json({ 
      success: false,
      error: 'Failed to connect to Telegram API',
      message: error.message 
    });
  }
});

// ============ MARKETPLACE ENDPOINTS ============

/**
 * Register bot in marketplace
 */
app.post('/api/bots/:botId/marketplace/register', authenticate, async (req, res) => {
  try {
    const bot = await db.getBot(req.params.botId);
    if (bot.userId !== req.user!.id) {
      return res.status(403).json({ error: 'Unauthorized' });
    }
    
    const response = await fetch(`http://localhost:${bot.walletPort}/marketplace/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: bot.id,
        userData: {
          name: bot.name,
          marketplaceAddress: req.body.marketplaceAddress
        }
      })
    });
    
    const result = await response.json();
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Verify bot in marketplace
 */
app.post('/api/bots/:botId/marketplace/verify', authenticate, async (req, res) => {
  try {
    const bot = await db.getBot(req.params.botId);
    if (bot.userId !== req.user!.id) {
      return res.status(403).json({ error: 'Unauthorized' });
    }
    
    const response = await fetch(`http://localhost:${bot.walletPort}/marketplace/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req.body)
    });
    
    const result = await response.json();
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ============ CONTRACT DEPLOYMENT ENDPOINTS ============

/**
 * Join existing DAO
 */
app.post('/api/bots/:botId/contracts/join-dao', authenticate, async (req, res) => {
  try {
    const bot = await db.getBot(req.params.botId);
    if (bot.userId !== req.user!.id) {
      return res.status(403).json({ error: 'Unauthorized' });
    }
    
    // This would use MCP tools to join existing DAO
    const response = await fetch(`http://localhost:${bot.walletPort}/contracts/join`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req.body)
    });
    
    const result = await response.json();
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Get deployed contracts
 */
app.get('/api/bots/:botId/contracts/deployed', authenticate, async (req, res) => {
  try {
    const bot = await db.getBot(req.params.botId);
    if (bot.userId !== req.user!.id) {
      return res.status(403).json({ error: 'Unauthorized' });
    }
    
    // Get from database and verify on blockchain
    const contracts = bot.daoContracts || {};
    
    res.json({
      contracts,
      treasuryAddress: bot.treasuryAddress
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Web Chat - Send message to bot (for web interface)
 */
app.post('/api/bots/:botId/chat', authenticate, async (req, res) => {
  try {
    const { message, sessionId } = req.body;
    const bot = await db.getBot(req.params.botId);
    
    if (bot.userId !== req.user!.id) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    // Check if bot has web chat enabled
    if (!bot.platforms?.webChat?.enabled) {
      return res.status(400).json({ 
        error: 'Web chat not enabled for this bot. Enable it in bot settings.' 
      });
    }

    // Forward message to the bot's Eliza agent
    const elizaPort = bot.elizaPort; // Use the actual Eliza port
    const elizaUrl = `http://localhost:${elizaPort}/chat`;

    try {
      const response = await fetch(elizaUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message,
          sessionId: sessionId || `web-${req.user!.id}-${Date.now()}`,
          platform: 'web',
          userId: req.user!.id
        })
      });

      if (!response.ok) {
        throw new Error('Eliza agent not responding');
      }

      const result = await response.json() as any;

      // Log the chat interaction
      await db.logCommand({
        botId: bot.id,
        command: 'chat',
        args: { message },
        result: result.response,
        timestamp: new Date()
      });

      res.json({
        success: true,
        response: result.response,
        sessionId: result.sessionId,
        timestamp: new Date()
      });
    } catch (error) {
      // If Eliza is not running, try to process through MCP directly
      const mcpUrl = `http://localhost:${bot.walletPort}/agent/chat`;
      
      try {
        const mcpResponse = await fetch(mcpUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message,
            sessionId: sessionId || `web-${req.user!.id}-${Date.now()}`
          })
        });

        if (!mcpResponse.ok) {
          throw new Error('MCP server not responding');
        }

        const mcpResult = await mcpResponse.json() as any;

        res.json({
          success: true,
          response: mcpResult.response,
          sessionId: mcpResult.sessionId,
          timestamp: new Date()
        });
      } catch (mcpError) {
        res.status(503).json({ 
          error: 'Bot agent is currently offline. Please try again later.' 
        });
      }
    }
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Get chat history for a bot
 */
app.get('/api/bots/:botId/chat/history', authenticate, async (req, res) => {
  try {
    const bot = await db.getBot(req.params.botId);
    
    if (bot.userId !== req.user!.id) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const { sessionId, limit = 50 } = req.query;

    // Get chat history from database
    const history = await db.getChatHistory({
      botId: bot.id,
      sessionId: sessionId as string,
      limit: Number(limit)
    });

    res.json({
      success: true,
      history,
      sessionId
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Enable/disable web chat for a bot
 */
app.post('/api/bots/:botId/platforms/webchat/toggle', authenticate, async (req, res) => {
  try {
    const { enabled } = req.body;
    const bot = await db.getBot(req.params.botId);
    
    if (bot.userId !== req.user!.id) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    // Update bot platforms configuration
    const platforms = bot.platforms || {};
    platforms.webChat = { 
      enabled: Boolean(enabled),
      port: bot.elizaPort // Eliza agent port
    };

    await db.updateBot(bot.id, { platforms });

    res.json({
      success: true,
      message: `Web chat ${enabled ? 'enabled' : 'disabled'} for bot ${bot.name}`,
      webChatUrl: enabled ? `http://localhost:${platforms.webChat.port}/chat` : null
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Health check endpoint
 */
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: new Date() });
});

// Environment variable validation
function validateEnvironment(): void {
  const required = ['DATABASE_URL', 'JWT_SECRET'];
  const missing = required.filter(key => !process.env[key]);
  if (missing.length > 0) {
    console.error(`Missing required environment variables: ${missing.join(', ')}`);
    process.exit(1);
  }
}

// Verify platform services are running
async function verifyPlatformServices(): Promise<void> {
  const services = [
    { name: 'MCP', url: 'http://localhost:3001/health', critical: true },
    { name: 'Proof Server', url: 'http://localhost:6300/health', critical: false }
  ];
  
  for (const service of services) {
    try {
      const response = await fetch(service.url);
      if (response.ok) {
        console.log(`✓ ${service.name} service is healthy`);
      } else {
        throw new Error(`${service.name} returned status ${response.status}`);
      }
    } catch (error) {
      if (service.critical) {
        console.error(`✗ Critical service ${service.name} is not running. Please start platform services first.`);
        console.error(`  Run: docker-compose -f docker/docker-compose.yml up -d`);
        process.exit(1);
      } else {
        console.warn(`⚠ Optional service ${service.name} is not available`);
      }
    }
  }
}

// Start server
const PORT = process.env.PORT || 3002;

async function start() {
  try {
    console.log('🚀 Starting MidnightOS Orchestrator...');
    
    // Validate environment
    validateEnvironment();
    
    // Initialize database
    console.log('📦 Initializing database...');
    await db.initialize();
    
    // Verify platform services
    console.log('🔍 Verifying platform services...');
    await verifyPlatformServices();
    
    // Load existing containers on startup
    console.log('📋 Loading existing containers...');
    await containerManager.loadActiveContainers();
    
    app.listen(PORT, () => {
      console.log(`✅ Platform API running on port ${PORT}`);
      console.log(`   Health check: http://localhost:${PORT}/health`);
    });
  } catch (error) {
    console.error('Failed to start orchestrator:', error);
    process.exit(1);
  }
}

start();