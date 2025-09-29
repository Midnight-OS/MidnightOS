import express, { Router, RequestHandler, Express } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import pkg from 'body-parser';
const { json } = pkg;
import { WalletServiceMCP } from './mcp/index.js';
import { WalletController } from './controllers/wallet.controller.js';
import { TreasuryController } from './controllers/treasury-controller.js';
import tenantRoutes from './routes/tenant.routes.js';
import { config } from './config.js';
import { SeedManager } from './utils/seed-manager.js';
import { createLogger } from './logger/index.js';

const app: Express = express();
const router = Router();
const port = process.env.PORT || 3000;
const logger = createLogger('server');

// Middleware
app.use(helmet());
app.use(cors());
app.use(json());

// Initialize services

// Check for seed in environment variable first, then fall back to file
let seed: string;
if (process.env.MIDNIGHT_SEED) {
  seed = process.env.MIDNIGHT_SEED;
  // Optionally save it for future use
  SeedManager.initializeAgentSeed(config.agentId, seed).catch(() => {
    // Ignore errors saving seed to file in production
  });
} else {
  seed = SeedManager.getAgentSeed(config.agentId);
}
const externalConfig = {
  proofServer: config.proofServer,
  indexer: config.indexer,
  indexerWS: config.indexerWS,
  node: config.node,
  useExternalProofServer: config.useExternalProofServer,
  networkId: config.networkId
};

const walletService = new WalletServiceMCP(
  config.networkId,
  seed,
  config.walletFilename,
  externalConfig
);

// Initialize controllers
const walletController = new WalletController(walletService);
const treasuryController = new TreasuryController(walletService);

// Register routes with bound methods
const routes = [
  { method: 'get', path: '/wallet/status', handler: walletController.getStatus },
  { method: 'get', path: '/wallet/address', handler: walletController.getAddress },
  { method: 'get', path: '/wallet/balance', handler: walletController.getBalance },
  { method: 'post', path: '/wallet/send', handler: walletController.sendFunds },
  { method: 'post', path: '/wallet/verify-transaction', handler: walletController.verifyTransaction },
  { method: 'get', path: '/wallet/transaction/:transactionId', handler: walletController.getTransactionStatus },
  { method: 'get', path: '/wallet/transactions', handler: walletController.getTransactions },
  { method: 'get', path: '/wallet/pending-transactions', handler: walletController.getPendingTransactions },
  { method: 'get', path: '/wallet/config', handler: walletController.getWalletConfig },
  { method: 'get', path: '/health', handler: walletController.healthCheck },
  // Token routes
  { method: 'get', path: '/wallet/tokens/balance/:tokenName', handler: walletController.getTokenBalance },
  { method: 'post', path: '/wallet/tokens/send', handler: walletController.sendToken },
  { method: 'get', path: '/wallet/tokens/list', handler: walletController.listTokens },
  { method: 'post', path: '/wallet/tokens/register', handler: walletController.registerToken },
  { method: 'post', path: '/wallet/tokens/batch', handler: walletController.registerTokensBatch },
  { method: 'post', path: '/wallet/tokens/register-from-env', handler: walletController.registerTokensFromEnv },
  { method: 'get', path: '/wallet/tokens/config-template', handler: walletController.getTokenEnvConfigTemplate },
  { method: 'get', path: '/wallet/tokens/stats', handler: walletController.getTokenRegistryStats },
  // DAO routes
  { method: 'post', path: '/dao/open-election', handler: walletController.openDaoElection },
  { method: 'post', path: '/dao/close-election', handler: walletController.closeDaoElection },
  { method: 'post', path: '/dao/cast-vote', handler: walletController.castDaoVote },
  { method: 'post', path: '/dao/fund-treasury', handler: walletController.fundDaoTreasury },
  { method: 'post', path: '/dao/payout-proposal', handler: walletController.payoutDaoProposal },
  { method: 'get', path: '/dao/election-status', handler: walletController.getDaoElectionStatus },
  { method: 'get', path: '/dao/state', handler: walletController.getDaoState },
  { method: 'get', path: '/dao/config-template', handler: walletController.getDaoConfigTemplate },
  // Marketplace routes
  { method: 'post', path: '/marketplace/register', handler: walletController.registerInMarketplace },
  { method: 'post', path: '/marketplace/verify', handler: walletController.verifyUserInMarketplace },
  // Treasury Management routes
  { method: 'post', path: '/treasury/create-proposal', handler: treasuryController.createProposal },
  { method: 'get', path: '/treasury/proposals', handler: treasuryController.getProposals },
  { method: 'get', path: '/treasury/analytics', handler: treasuryController.getAnalytics },
  { method: 'get', path: '/treasury/balance', handler: treasuryController.getBalance },
  { method: 'post', path: '/treasury/open-voting', handler: treasuryController.openVoting },
  { method: 'post', path: '/treasury/payout', handler: treasuryController.executePayout }
] as const;

// Register all routes
routes.forEach(({ method, path, handler }) => {
  // Determine which controller to bind to based on path
  const controller = path.startsWith('/treasury') ? treasuryController : walletController;
  const boundHandler = (handler as RequestHandler).bind(controller);
  /* istanbul ignore else */
  if (method === 'get') {
    router.get(path, boundHandler);
  } else if (method === 'post') {
    router.post(path, boundHandler);

  } else if (method === 'put') {
    router.put(path, boundHandler);
    
  } else if (method === 'delete') {
    router.delete(path, boundHandler);
  }
});

// Mount routers
app.use(router); // Existing single-tenant routes (for backward compatibility)
app.use(tenantRoutes); // New multi-tenant routes

// Error handling middleware
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  logger.error('Unhandled error:', err);
  res.status(500).json({
    error: 'Internal server error',
    message: err.message
  });
});

// Start server
const server = app.listen(port, () => {
  logger.info(`Server is running on port ${port}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM signal received. Closing HTTP server...');
  server.close(async () => {
    logger.info('HTTP server closed');
    try {
      await walletService.close();
      logger.info('Wallet service closed');
      process.exit(0);
    } catch (error) {
      logger.error('Error during shutdown:', error);
      process.exit(1);
    }
  });
});

process.on('SIGINT', () => {
  logger.info('SIGINT signal received. Closing HTTP server...');
  server.close(async () => {
    logger.info('HTTP server closed');
    try {
      await walletService.close();
      logger.info('Wallet service closed');
      process.exit(0);
    } catch (error) {
      logger.error('Error during shutdown:', error);
      process.exit(1);
    }
  });
});

export { app, server };