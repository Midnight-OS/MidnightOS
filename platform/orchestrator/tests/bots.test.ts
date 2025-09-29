import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import request from 'supertest';
import express from 'express';
import jwt from 'jsonwebtoken';

describe('Bot Management API', () => {
  let app: express.Application;
  let authToken: string;
  let mockDatabase: any;
  let mockContainerManager: any;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    
    // Mock database
    mockDatabase = {
      users: new Map(),
      bots: new Map(),
    };

    // Mock container manager
    mockContainerManager = {
      createUserContainer: jest.fn(() => Promise.resolve({
        tenantId: 'user_123_1234567890',
        userId: 'user_123',
        walletPort: 4000,
        walletAddress: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb7',
        status: 'running',
        createdAt: new Date(),
        features: { wallet: true, dao: false, marketplace: false },
        tier: 'basic'
      })),
      stopUserContainer: jest.fn(() => Promise.resolve(undefined)),
      startUserContainer: jest.fn(() => Promise.resolve(undefined)),
      pauseBotContainer: jest.fn(() => Promise.resolve(undefined)),
      resumeBotContainer: jest.fn(() => Promise.resolve(undefined)),
      deleteUserContainer: jest.fn(() => Promise.resolve(undefined)),
      getContainerLogs: jest.fn(() => Promise.resolve('Container logs here...')),
      getContainerStatus: jest.fn(() => Promise.resolve({ wallet: 'running', bot: 'running' })),
      updateUserContainer: jest.fn(() => Promise.resolve(undefined)),
    };

    // Create a test user and get token
    const userId = 'user_123';
    const userEmail = 'test@example.com';
    authToken = jwt.sign(
      { userId, email: userEmail },
      process.env.JWT_SECRET!,
      { expiresIn: '1h' }
    );

    mockDatabase.users.set(userEmail, {
      id: userId,
      email: userEmail,
      name: 'Test User',
      tier: 'basic',
    });

    // Auth middleware
    const authenticate = (req: any, res: any, next: any) => {
      const token = req.headers.authorization?.split(' ')[1];
      if (!token) {
        return res.status(401).json({ error: 'Unauthorized' });
      }
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;
        req.user = { id: decoded.userId, email: decoded.email };
        next();
      } catch (error) {
        return res.status(401).json({ error: 'Invalid token' });
      }
    };

    // Bot routes
    app.get('/api/bots', authenticate, async (req: any, res) => {
      const userBots = Array.from(mockDatabase.bots.values()).filter(
        (bot: any) => bot.userId === req.user.id
      );
      res.json({ bots: userBots });
    });

    app.post('/api/bots', authenticate, async (req: any, res) => {
      const { name, features, platforms } = req.body;

      if (!name || !features || !platforms) {
        return res.status(400).json({ error: 'Missing required fields' });
      }

      const bot = {
        id: `bot_${Date.now()}`,
        userId: req.user.id,
        name,
        features,
        platforms,
        status: 'active',
        createdAt: new Date().toISOString(),
        tenantId: 'user_123_1234567890',
        walletPort: 4000,
        walletAddress: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb7',
        containerStatus: 'running',
      };

      // Mock container creation
      await mockContainerManager.createUserContainer({
        userId: req.user.id,
        email: req.user.email,
        tier: 'basic',
        features,
        platforms,
      });

      mockDatabase.bots.set(bot.id, bot);
      res.status(201).json({ bot });
    });

    app.get('/api/bots/:id', authenticate, async (req: any, res) => {
      const bot = mockDatabase.bots.get(req.params.id);
      
      if (!bot) {
        return res.status(404).json({ error: 'Bot not found' });
      }

      if (bot.userId !== req.user.id) {
        return res.status(403).json({ error: 'Forbidden' });
      }

      res.json({ bot });
    });

    app.put('/api/bots/:id', authenticate, async (req: any, res) => {
      const bot = mockDatabase.bots.get(req.params.id);
      
      if (!bot) {
        return res.status(404).json({ error: 'Bot not found' });
      }

      if (bot.userId !== req.user.id) {
        return res.status(403).json({ error: 'Forbidden' });
      }

      const updatedBot = { ...bot, ...req.body };
      mockDatabase.bots.set(bot.id, updatedBot);
      
      // Mock container update
      await mockContainerManager.updateUserContainer(bot.tenantId, {
        userId: req.user.id,
        email: req.user.email,
        tier: 'basic',
        features: updatedBot.features,
        platforms: updatedBot.platforms,
      });

      res.json({ bot: updatedBot });
    });

    app.delete('/api/bots/:id', authenticate, async (req: any, res) => {
      const bot = mockDatabase.bots.get(req.params.id);
      
      if (!bot) {
        return res.status(404).json({ error: 'Bot not found' });
      }

      if (bot.userId !== req.user.id) {
        return res.status(403).json({ error: 'Forbidden' });
      }

      await mockContainerManager.deleteUserContainer(bot.tenantId);
      mockDatabase.bots.delete(req.params.id);
      
      res.json({ message: 'Bot deleted successfully' });
    });

    // Bot lifecycle routes
    app.post('/api/bots/:id/stop', authenticate, async (req: any, res) => {
      const bot = mockDatabase.bots.get(req.params.id);
      if (!bot || bot.userId !== req.user.id) {
        return res.status(404).json({ error: 'Bot not found' });
      }

      await mockContainerManager.stopUserContainer(bot.tenantId);
      bot.containerStatus = 'stopped';
      res.json({ status: 'stopped' });
    });

    app.post('/api/bots/:id/start', authenticate, async (req: any, res) => {
      const bot = mockDatabase.bots.get(req.params.id);
      if (!bot || bot.userId !== req.user.id) {
        return res.status(404).json({ error: 'Bot not found' });
      }

      await mockContainerManager.startUserContainer(bot.tenantId);
      bot.containerStatus = 'running';
      res.json({ status: 'running' });
    });

    app.get('/api/bots/:id/logs', authenticate, async (req: any, res) => {
      const bot = mockDatabase.bots.get(req.params.id);
      if (!bot || bot.userId !== req.user.id) {
        return res.status(404).json({ error: 'Bot not found' });
      }

      const logs = await mockContainerManager.getContainerLogs(bot.tenantId);
      res.json({ logs });
    });

    app.get('/api/bots/:id/status', authenticate, async (req: any, res) => {
      const bot = mockDatabase.bots.get(req.params.id);
      if (!bot || bot.userId !== req.user.id) {
        return res.status(404).json({ error: 'Bot not found' });
      }

      const status = await mockContainerManager.getContainerStatus(bot.tenantId);
      res.json(status);
    });
  });

  describe('GET /api/bots', () => {
    it('should return empty array when user has no bots', async () => {
      const response = await request(app)
        .get('/api/bots')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.bots).toEqual([]);
    });

    it('should require authentication', async () => {
      const response = await request(app)
        .get('/api/bots');

      expect(response.status).toBe(401);
      expect(response.body.error).toBe('Unauthorized');
    });

    it('should return user bots', async () => {
      // Create a bot first
      await request(app)
        .post('/api/bots')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Test Bot',
          features: { wallet: true, dao: false, marketplace: false },
          platforms: { discord: { token: 'test_token' } },
        });

      const response = await request(app)
        .get('/api/bots')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.bots).toHaveLength(1);
      expect(response.body.bots[0].name).toBe('Test Bot');
    });
  });

  describe('POST /api/bots', () => {
    it('should create a new bot', async () => {
      const botData = {
        name: 'My Test Bot',
        features: { wallet: true, dao: true, marketplace: false },
        platforms: {
          discord: { token: 'discord_token_123', serverId: '123456' },
          telegram: { token: 'telegram_token_456' },
        },
      };

      const response = await request(app)
        .post('/api/bots')
        .set('Authorization', `Bearer ${authToken}`)
        .send(botData);

      expect(response.status).toBe(201);
      expect(response.body.bot).toBeDefined();
      expect(response.body.bot.name).toBe('My Test Bot');
      expect(response.body.bot.tenantId).toBeDefined();
      expect(response.body.bot.walletPort).toBeDefined();
      expect(response.body.bot.walletAddress).toBeDefined();
      expect(response.body.bot.containerStatus).toBe('running');
      expect(mockContainerManager.createUserContainer).toHaveBeenCalled();
    });

    it('should reject bot creation without required fields', async () => {
      const response = await request(app)
        .post('/api/bots')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: 'Incomplete Bot' });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('Missing required fields');
    });

    it('should require authentication', async () => {
      const response = await request(app)
        .post('/api/bots')
        .send({
          name: 'Test Bot',
          features: { wallet: true, dao: false, marketplace: false },
          platforms: { discord: { token: 'test_token' } },
        });

      expect(response.status).toBe(401);
    });
  });

  describe('GET /api/bots/:id', () => {
    let botId: string;

    beforeEach(async () => {
      const response = await request(app)
        .post('/api/bots')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Test Bot',
          features: { wallet: true, dao: false, marketplace: false },
          platforms: { discord: { token: 'test_token' } },
        });
      botId = response.body.bot.id;
    });

    it('should return bot details', async () => {
      const response = await request(app)
        .get(`/api/bots/${botId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.bot.id).toBe(botId);
      expect(response.body.bot.name).toBe('Test Bot');
    });

    it('should return 404 for non-existent bot', async () => {
      const response = await request(app)
        .get('/api/bots/non_existent_id')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Bot not found');
    });
  });

  describe('Bot Lifecycle Operations', () => {
    let botId: string;

    beforeEach(async () => {
      const response = await request(app)
        .post('/api/bots')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Lifecycle Test Bot',
          features: { wallet: true, dao: false, marketplace: false },
          platforms: { discord: { token: 'test_token' } },
        });
      botId = response.body.bot.id;
    });

    it('should stop a bot', async () => {
      const response = await request(app)
        .post(`/api/bots/${botId}/stop`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('stopped');
      expect(mockContainerManager.stopUserContainer).toHaveBeenCalled();
    });

    it('should start a bot', async () => {
      const response = await request(app)
        .post(`/api/bots/${botId}/start`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('running');
      expect(mockContainerManager.startUserContainer).toHaveBeenCalled();
    });

    it('should get bot logs', async () => {
      const response = await request(app)
        .get(`/api/bots/${botId}/logs`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.logs).toBeDefined();
      expect(mockContainerManager.getContainerLogs).toHaveBeenCalled();
    });

    it('should get bot status', async () => {
      const response = await request(app)
        .get(`/api/bots/${botId}/status`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.wallet).toBe('running');
      expect(response.body.bot).toBe('running');
      expect(mockContainerManager.getContainerStatus).toHaveBeenCalled();
    });
  });

  describe('DELETE /api/bots/:id', () => {
    let botId: string;

    beforeEach(async () => {
      const response = await request(app)
        .post('/api/bots')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Bot to Delete',
          features: { wallet: true, dao: false, marketplace: false },
          platforms: { discord: { token: 'test_token' } },
        });
      botId = response.body.bot.id;
    });

    it('should delete a bot', async () => {
      const response = await request(app)
        .delete(`/api/bots/${botId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.message).toContain('deleted successfully');
      expect(mockContainerManager.deleteUserContainer).toHaveBeenCalled();

      // Verify bot is deleted
      const getResponse = await request(app)
        .get(`/api/bots/${botId}`)
        .set('Authorization', `Bearer ${authToken}`);
      expect(getResponse.status).toBe(404);
    });
  });
});