import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import crypto from 'crypto';

const JWT_SECRET = process.env.JWT_SECRET || 'midnight-os-secret-key-change-in-production';

export interface User {
  id: string;
  email: string;
  password?: string;
  tier: 'basic' | 'premium' | 'enterprise';
  createdAt: Date;
}

export class AuthService {
  /**
   * Hash password for storage
   */
  async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, 10);
  }

  /**
   * Verify password against hash
   */
  async verifyPassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }

  /**
   * Generate JWT token for user
   */
  generateToken(userId: string): string {
    return jwt.sign(
      { userId, iat: Date.now() },
      JWT_SECRET,
      { expiresIn: '7d' }
    );
  }

  /**
   * Verify JWT token
   */
  async verifyToken(token: string): Promise<{ id: string; email: string }> {
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as any;
      // In production, fetch user from database
      return { id: decoded.userId, email: `user_${decoded.userId}@example.com` };
    } catch (error) {
      throw new Error('Invalid token');
    }
  }

  /**
   * Generate API key for service-to-service auth
   */
  generateApiKey(): string {
    return `mno_${Buffer.from(crypto.randomUUID()).toString('base64')}`;
  }
}