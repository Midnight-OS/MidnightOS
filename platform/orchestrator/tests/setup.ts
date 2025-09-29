import { beforeAll, afterAll, beforeEach, afterEach } from '@jest/globals';
import * as fs from 'fs-extra';
import * as path from 'path';

// Test environment setup
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test_jwt_secret_key';
process.env.DB_PATH = './test-data/database.json';
process.env.USER_DATA_PATH = './test-data/users';
process.env.PORT_RANGE_START = '5000';
process.env.PORT_RANGE_END = '5100';
process.env.OPENAI_API_KEY = 'test_openai_key';

// Mock Docker commands for testing
jest.mock('child_process', () => ({
  exec: jest.fn((cmd, callback) => {
    // Mock successful Docker commands
    if (cmd.includes('docker')) {
      callback(null, { stdout: 'mock output', stderr: '' });
    } else {
      callback(null, { stdout: '', stderr: '' });
    }
  }),
  spawn: jest.fn(() => ({
    stdout: { on: jest.fn() },
    stderr: { on: jest.fn() },
    on: jest.fn(),
    kill: jest.fn(),
  })),
}));

beforeAll(async () => {
  // Create test directories
  await fs.ensureDir('./test-data');
  await fs.ensureDir('./test-data/users');
});

afterAll(async () => {
  // Clean up test data
  await fs.remove('./test-data');
});

beforeEach(() => {
  // Clear all mocks before each test
  jest.clearAllMocks();
});

afterEach(() => {
  // Clean up after each test
});