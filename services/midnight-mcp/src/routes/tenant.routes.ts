/**
 * Tenant-specific wallet routes
 * 
 * These routes provide multi-tenant support for the MCP service,
 * allowing the orchestrator to manage multiple isolated wallets.
 */

import { Router, Request, Response, NextFunction } from 'express';
import { MultiTenantWalletService } from '../wallet/multi-tenant-service.js';
import { createLogger } from '../logger/index.js';

const logger = createLogger('tenant-routes');
const router: Router = Router();

// Initialize multi-tenant service as a singleton
const multiTenantService = new MultiTenantWalletService();

/**
 * Middleware to validate tenant context from headers
 * Ensures the X-Tenant-ID header matches the URL parameter for security
 */
function validateTenantHeader(req: Request, res: Response, next: NextFunction) {
  const tenantIdFromUrl = (req.params as any).tenantId;
  const tenantIdFromHeader = req.headers['x-tenant-id'] as string;
  
  // Skip validation for registration endpoint (no URL param)
  if (!tenantIdFromUrl) {
    return next();
  }
  
  // Log the validation attempt
  if (tenantIdFromHeader) {
    logger.debug(`Validating tenant: URL=${tenantIdFromUrl}, Header=${tenantIdFromHeader}`);
  }
  
  // If header is provided, it must match the URL parameter
  if (tenantIdFromHeader && tenantIdFromHeader !== tenantIdFromUrl) {
    logger.warn(`Tenant ID mismatch: URL=${tenantIdFromUrl}, Header=${tenantIdFromHeader}`);
    return res.status(403).json({
      error: 'Tenant ID mismatch',
      message: 'The X-Tenant-ID header does not match the tenant ID in the URL'
    });
  }
  
  // Add tenant ID to request for logging
  (req as any).tenantId = tenantIdFromUrl;
  
  next();
}

/**
 * Register a new tenant with their seed
 * Expected by orchestrator when creating a new bot
 */
router.post('/api/wallet/register', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { tenantId, seed, metadata } = req.body;

    if (!tenantId || !seed) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: tenantId and seed'
      });
    }

    logger.info(`Registering tenant: ${tenantId}`);

    const result = await multiTenantService.registerTenant(tenantId, seed, metadata);
    
    if (result.success) {
      // Get the wallet address immediately after registration
      const address = await multiTenantService.getTenantAddress(tenantId);
      return res.json({
        success: true,
        tenantId,
        address
      });
    } else {
      return res.status(400).json(result);
    }
  } catch (error) {
    logger.error('Failed to register tenant:', error);
    next(error);
  }
});

/**
 * Get tenant's wallet address
 * Expected by orchestrator to display in bot info
 */
router.get('/api/wallet/:tenantId/address', validateTenantHeader, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { tenantId } = req.params;

    const address = await multiTenantService.getTenantAddress(tenantId);
    
    if (!address) {
      return res.status(404).json({
        error: `Tenant ${tenantId} not found or wallet not initialized`
      });
    }

    res.json({ address });
  } catch (error) {
    logger.error('Failed to get tenant address:', error);
    next(error);
  }
});

/**
 * Get tenant's wallet status
 */
router.get('/api/wallet/:tenantId/status', validateTenantHeader, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { tenantId } = req.params;

    const status = multiTenantService.getTenantWalletStatus(tenantId);
    
    if (!status) {
      return res.status(404).json({
        error: `Tenant ${tenantId} not found`
      });
    }

    res.json(status);
  } catch (error) {
    logger.error('Failed to get tenant status:', error);
    next(error);
  }
});

/**
 * Send funds from tenant's wallet
 */
router.post('/api/wallet/:tenantId/send', validateTenantHeader, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { tenantId } = req.params;
    const { toAddress, amount } = req.body;

    if (!toAddress || !amount) {
      return res.status(400).json({
        error: 'Missing required fields: toAddress and amount'
      });
    }

    const result = await multiTenantService.sendFundsForTenant(tenantId, toAddress, amount);
    res.json(result);
  } catch (error) {
    logger.error('Failed to send funds for tenant:', error);
    next(error);
  }
});

/**
 * Get tenant's token balances
 */
router.get('/api/wallet/:tenantId/tokens', validateTenantHeader, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { tenantId } = req.params;

    const tokens = await multiTenantService.getTokenBalancesForTenant(tenantId);
    res.json({ tokens });
  } catch (error) {
    logger.error('Failed to get tokens for tenant:', error);
    next(error);
  }
});

/**
 * Register a token for tenant
 */
router.post('/api/wallet/:tenantId/tokens/register', validateTenantHeader, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { tenantId } = req.params;
    const { name, symbol, contractAddress, domainSeparator, description, decimals } = req.body;

    if (!name || !symbol || !contractAddress) {
      return res.status(400).json({
        error: 'Missing required fields: name, symbol, and contractAddress'
      });
    }

    const result = await multiTenantService.registerTokenForTenant(
      tenantId,
      name,
      symbol,
      contractAddress,
      domainSeparator,
      description,
      decimals
    );

    if (result.success) {
      res.json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    logger.error('Failed to register token for tenant:', error);
    next(error);
  }
});

/**
 * Send tokens from tenant's wallet
 */
router.post('/api/wallet/:tenantId/tokens/send', validateTenantHeader, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { tenantId } = req.params;
    const { tokenName, toAddress, amount } = req.body;

    if (!tokenName || !toAddress || !amount) {
      return res.status(400).json({
        error: 'Missing required fields: tokenName, toAddress, and amount'
      });
    }

    const result = await multiTenantService.sendTokenForTenant(
      tenantId,
      tokenName,
      toAddress,
      amount
    );

    res.json(result);
  } catch (error) {
    logger.error('Failed to send token for tenant:', error);
    next(error);
  }
});

/**
 * Get tenant's transactions
 */
router.get('/api/wallet/:tenantId/transactions', validateTenantHeader, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { tenantId } = req.params;

    const transactions = await multiTenantService.getTransactionsForTenant(tenantId);
    res.json({ transactions });
  } catch (error) {
    logger.error('Failed to get transactions for tenant:', error);
    next(error);
  }
});

/**
 * Get transaction status for tenant
 */
router.get('/api/wallet/:tenantId/transactions/:transactionId', validateTenantHeader, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { tenantId, transactionId } = req.params;

    const status = await multiTenantService.getTransactionStatusForTenant(tenantId, transactionId);
    
    if (!status) {
      return res.status(404).json({
        error: `Transaction ${transactionId} not found for tenant ${tenantId}`
      });
    }

    res.json(status);
  } catch (error) {
    logger.error('Failed to get transaction status for tenant:', error);
    next(error);
  }
});

/**
 * Get token info for tenant
 */
router.get('/api/wallet/:tenantId/tokens/:tokenName', validateTenantHeader, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { tenantId, tokenName } = req.params;

    const tokenInfo = await multiTenantService.getTokenInfoForTenant(tenantId, tokenName);
    
    if (!tokenInfo) {
      return res.status(404).json({
        error: `Token ${tokenName} not found for tenant ${tenantId}`
      });
    }

    res.json(tokenInfo);
  } catch (error) {
    logger.error('Failed to get token info for tenant:', error);
    next(error);
  }
});

/**
 * Get token balance for tenant
 */
router.get('/api/wallet/:tenantId/tokens/:tokenName/balance', validateTenantHeader, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { tenantId, tokenName } = req.params;

    const balance = await multiTenantService.getTokenBalanceForTenant(tenantId, tokenName);
    res.json({ balance });
  } catch (error) {
    logger.error('Failed to get token balance for tenant:', error);
    next(error);
  }
});

/**
 * Unregister a tenant (cleanup)
 */
router.delete('/api/wallet/:tenantId', validateTenantHeader, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { tenantId } = req.params;

    const success = await multiTenantService.unregisterTenant(tenantId);
    
    if (success) {
      res.json({ success: true, message: `Tenant ${tenantId} unregistered` });
    } else {
      res.status(404).json({ error: `Tenant ${tenantId} not found` });
    }
  } catch (error) {
    logger.error('Failed to unregister tenant:', error);
    next(error);
  }
});

/**
 * Get all registered tenants (admin endpoint)
 */
router.get('/api/tenants', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenants = multiTenantService.getRegisteredTenants();
    res.json({ tenants });
  } catch (error) {
    logger.error('Failed to get registered tenants:', error);
    next(error);
  }
});

/**
 * Get tenant metadata (admin endpoint)
 */
router.get('/api/tenants/:tenantId/metadata', validateTenantHeader, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { tenantId } = req.params;

    const metadata = multiTenantService.getTenantMetadata(tenantId);
    
    if (!metadata) {
      return res.status(404).json({
        error: `Tenant ${tenantId} not found`
      });
    }

    res.json(metadata);
  } catch (error) {
    logger.error('Failed to get tenant metadata:', error);
    next(error);
  }
});

/**
 * Get service statistics (admin endpoint)
 */
router.get('/api/tenants/stats', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const stats = multiTenantService.getStatistics();
    res.json(stats);
  } catch (error) {
    logger.error('Failed to get service statistics:', error);
    next(error);
  }
});

/**
 * Clean up inactive tenants (admin endpoint)
 */
router.post('/api/tenants/cleanup', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { inactiveDays = 30 } = req.body;

    const cleaned = await multiTenantService.cleanupInactiveTenants(inactiveDays);
    res.json({ 
      success: true, 
      message: `Cleaned up ${cleaned} inactive tenants`,
      cleaned 
    });
  } catch (error) {
    logger.error('Failed to cleanup inactive tenants:', error);
    next(error);
  }
});

export default router;