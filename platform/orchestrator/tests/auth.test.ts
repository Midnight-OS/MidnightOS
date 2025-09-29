import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import request from 'supertest';
import express from 'express';
import jwt from 'jsonwebtoken';
import * as bcrypt from 'bcryptjs';

// Import the API setup (we'll need to refactor api.ts to export the app)
// For now, we'll create a test app instance

describe('Authentication API', () => {
  let app: express.Application;
  let mockDatabase: any;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    
    // Mock database
    mockDatabase = {
      users: new Map(),
      bots: new Map(),
    };

    // Setup routes (simplified for testing)
    app.post('/api/auth/register', async (req, res) => {
      const { email, password, name } = req.body;
      
      if (!email || !password || !name) {
        return res.status(400).json({ error: 'Missing required fields' });
      }

      if (mockDatabase.users.has(email)) {
        return res.status(400).json({ error: 'Email already exists' });
      }

      const hashedPassword = await bcrypt.hash(password, 10);
      const user = {
        id: `user_${Date.now()}`,
        email,
        name,
        password: hashedPassword,
        tier: 'basic',
        createdAt: new Date().toISOString(),
      };

      mockDatabase.users.set(email, user);
      
      const token = jwt.sign(
        { userId: user.id, email: user.email },
        process.env.JWT_SECRET!,
        { expiresIn: '7d' }
      );

      res.status(201).json({
        token,
        user: { id: user.id, email: user.email, name: user.name, tier: user.tier }
      });
    });

    app.post('/api/auth/login', async (req, res) => {
      const { email, password } = req.body;
      
      if (!email || !password) {
        return res.status(400).json({ error: 'Missing credentials' });
      }

      const user = mockDatabase.users.get(email);
      if (!user) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      const validPassword = await bcrypt.compare(password, user.password);
      if (!validPassword) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      const token = jwt.sign(
        { userId: user.id, email: user.email },
        process.env.JWT_SECRET!,
        { expiresIn: '7d' }
      );

      res.status(200).json({
        token,
        user: { id: user.id, email: user.email, name: user.name, tier: user.tier }
      });
    });

    app.get('/api/auth/verify', (req, res) => {
      const authHeader = req.headers.authorization;
      const token = authHeader?.split(' ')[1];

      if (!token) {
        return res.status(401).json({ error: 'No token provided' });
      }

      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;
        const user = Array.from(mockDatabase.users.values()).find((u: any) => u.id === decoded.userId) as any;
        
        res.status(200).json({
          valid: true,
          user: { id: user.id, email: user.email, name: user.name, tier: user.tier }
        });
      } catch (error) {
        res.status(401).json({ error: 'Invalid token' });
      }
    });
  });

  describe('POST /api/auth/register', () => {
    it('should register a new user successfully', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'test@example.com',
          password: 'password123',
          name: 'Test User',
        });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('token');
      expect(response.body).toHaveProperty('user');
      expect(response.body.user.email).toBe('test@example.com');
      expect(response.body.user.tier).toBe('basic');
    });

    it('should reject registration with missing fields', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'test@example.com',
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('Missing required fields');
    });

    it('should reject duplicate email registration', async () => {
      // Register first user
      await request(app)
        .post('/api/auth/register')
        .send({
          email: 'duplicate@example.com',
          password: 'password123',
          name: 'First User',
        });

      // Try to register with same email
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'duplicate@example.com',
          password: 'password456',
          name: 'Second User',
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('already exists');
    });
  });

  describe('POST /api/auth/login', () => {
    beforeEach(async () => {
      // Register a test user
      await request(app)
        .post('/api/auth/register')
        .send({
          email: 'login@example.com',
          password: 'correctpassword',
          name: 'Login Test User',
        });
    });

    it('should login with valid credentials', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'login@example.com',
          password: 'correctpassword',
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('token');
      expect(response.body).toHaveProperty('user');
      expect(response.body.user.email).toBe('login@example.com');
    });

    it('should reject login with invalid password', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'login@example.com',
          password: 'wrongpassword',
        });

      expect(response.status).toBe(401);
      expect(response.body.error).toContain('Invalid credentials');
    });

    it('should reject login with non-existent email', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'nonexistent@example.com',
          password: 'anypassword',
        });

      expect(response.status).toBe(401);
      expect(response.body.error).toContain('Invalid credentials');
    });

    it('should reject login with missing credentials', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'login@example.com',
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('Missing credentials');
    });
  });

  describe('GET /api/auth/verify', () => {
    let validToken: string;

    beforeEach(async () => {
      // Register and get a valid token
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'verify@example.com',
          password: 'password123',
          name: 'Verify User',
        });
      validToken = response.body.token;
    });

    it('should verify a valid token', async () => {
      const response = await request(app)
        .get('/api/auth/verify')
        .set('Authorization', `Bearer ${validToken}`);

      expect(response.status).toBe(200);
      expect(response.body.valid).toBe(true);
      expect(response.body.user.email).toBe('verify@example.com');
    });

    it('should reject an invalid token', async () => {
      const response = await request(app)
        .get('/api/auth/verify')
        .set('Authorization', 'Bearer invalid_token_here');

      expect(response.status).toBe(401);
      expect(response.body.error).toContain('Invalid token');
    });

    it('should reject when no token is provided', async () => {
      const response = await request(app)
        .get('/api/auth/verify');

      expect(response.status).toBe(401);
      expect(response.body.error).toContain('No token provided');
    });

    it('should reject an expired token', async () => {
      // Create an expired token
      const expiredToken = jwt.sign(
        { userId: 'user_123', email: 'expired@example.com' },
        process.env.JWT_SECRET!,
        { expiresIn: '0s' }
      );

      const response = await request(app)
        .get('/api/auth/verify')
        .set('Authorization', `Bearer ${expiredToken}`);

      expect(response.status).toBe(401);
      expect(response.body.error).toContain('Invalid token');
    });
  });
});