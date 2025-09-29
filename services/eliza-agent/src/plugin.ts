import type { Plugin } from '@elizaos/core';
import {
  type Action,
  type ActionResult,
  type Content,
  type HandlerCallback,
  type IAgentRuntime,
  type Memory,
  type Provider,
  type ProviderResult,
  Service,
  type State,
  logger,
} from '@elizaos/core';

/**
 * MidnightOS Blockchain Plugin
 * Provides real blockchain actions through MCP tools integration
 * These actions interface with the MCP server to execute actual blockchain operations
 */

// Wallet Balance Check Action
const walletBalanceAction: Action = {
  name: 'WALLET_BALANCE',
  similes: ['CHECK_BALANCE', 'GET_BALANCE', 'WALLET_STATUS'],
  description: 'Check wallet balance on Midnight blockchain via MCP tools',
  
  validate: async (_runtime: IAgentRuntime, message: Memory, _state: State): Promise<boolean> => {
    const text = message.content.text?.toLowerCase() || '';
    return text.includes('balance') || 
           text.includes('wallet') || 
           text.includes('how much');
  },

  handler: async (
    runtime: IAgentRuntime,
    message: Memory,
    _state: State,
    _options: any,
    callback: HandlerCallback,
    _responses: Memory[]
  ): Promise<ActionResult> => {
    try {
      logger.info('Checking wallet balance via MCP');
      
      // Response that triggers MCP tool call
      const responseContent: Content = {
        text: 'Checking your wallet balance on Midnight blockchain...',
        actions: ['WALLET_BALANCE'],
        source: message.content.source,
        data: {
          mcpTool: 'wallet',
          mcpMethod: 'getBalance',
          params: {}
        }
      };

      await callback(responseContent);

      return {
        text: 'Wallet balance check initiated',
        values: { success: true, action: 'wallet_balance' },
        data: { mcpCall: 'wallet:getBalance' },
        success: true,
      };
    } catch (error) {
      logger.error('Error checking wallet balance:', error);
      return {
        text: 'Failed to check wallet balance',
        values: { success: false },
        success: false,
        error: error instanceof Error ? error : new Error(String(error)),
      };
    }
  },

  examples: [
    [
      {
        name: '{{user}}',
        content: { text: 'What is my wallet balance?' },
      },
      {
        name: 'MidnightBot',
        content: { 
          text: 'Checking your wallet balance on Midnight blockchain...',
          actions: ['WALLET_BALANCE'],
        },
      },
    ],
  ],
};

// Send Transaction Action
const sendTransactionAction: Action = {
  name: 'SEND_TRANSACTION',
  similes: ['TRANSFER', 'SEND_TOKENS', 'PAY'],
  description: 'Send tokens to another address on Midnight blockchain',
  
  validate: async (_runtime: IAgentRuntime, message: Memory, _state: State): Promise<boolean> => {
    const text = message.content.text?.toLowerCase() || '';
    return text.includes('send') && 
           (text.includes('token') || text.includes('night') || text.includes('to'));
  },

  handler: async (
    runtime: IAgentRuntime,
    message: Memory,
    _state: State,
    _options: any,
    callback: HandlerCallback,
    _responses: Memory[]
  ): Promise<ActionResult> => {
    try {
      const text = message.content.text || '';
      
      // Parse the message for amount and recipient
      const amountMatch = text.match(/(\d+(?:\.\d+)?)/);
      const toMatch = text.match(/to\s+(\S+)/i);
      
      if (!amountMatch || !toMatch) {
        return {
          text: 'Please specify amount and recipient (e.g., "send 100 tokens to alice.wallet")',
          values: { success: false },
          success: false,
        };
      }

      const isShielded = text.toLowerCase().includes('private') || 
                        text.toLowerCase().includes('shielded');

      const responseContent: Content = {
        text: `Preparing ${isShielded ? 'shielded' : 'transparent'} transaction of ${amountMatch[1]} tokens to ${toMatch[1]}...`,
        actions: ['SEND_TRANSACTION'],
        source: message.content.source,
        data: {
          mcpTool: 'wallet',
          mcpMethod: 'sendTransaction',
          params: {
            to: toMatch[1],
            amount: parseFloat(amountMatch[1]),
            shielded: isShielded
          }
        }
      };

      await callback(responseContent);

      return {
        text: 'Transaction initiated',
        values: { success: true, amount: amountMatch[1], to: toMatch[1] },
        data: { mcpCall: 'wallet:sendTransaction' },
        success: true,
      };
    } catch (error) {
      logger.error('Error sending transaction:', error);
      return {
        text: 'Failed to send transaction',
        values: { success: false },
        success: false,
        error: error instanceof Error ? error : new Error(String(error)),
      };
    }
  },

  examples: [],
};

// Create DAO Proposal Action
const createProposalAction: Action = {
  name: 'CREATE_PROPOSAL',
  similes: ['NEW_PROPOSAL', 'MAKE_PROPOSAL', 'PROPOSE'],
  description: 'Create a new DAO proposal on Midnight blockchain',
  
  validate: async (_runtime: IAgentRuntime, message: Memory, _state: State): Promise<boolean> => {
    const text = message.content.text?.toLowerCase() || '';
    return (text.includes('create') || text.includes('make')) && 
           text.includes('proposal');
  },

  handler: async (
    runtime: IAgentRuntime,
    message: Memory,
    _state: State,
    _options: any,
    callback: HandlerCallback,
    _responses: Memory[]
  ): Promise<ActionResult> => {
    try {
      const text = message.content.text || '';
      
      // Extract proposal details
      const amountMatch = text.match(/(\d+(?:\.\d+)?)\s*(?:night|token)/i);
      const forMatch = text.match(/for\s+(.+?)(?:\.|$)/i);
      
      if (!amountMatch || !forMatch) {
        return {
          text: 'Please specify amount and purpose (e.g., "create proposal for 1000 NIGHT for development")',
          values: { success: false },
          success: false,
        };
      }

      const responseContent: Content = {
        text: `Creating DAO proposal: "${forMatch[1]}" requesting ${amountMatch[1]} NIGHT...`,
        actions: ['CREATE_PROPOSAL'],
        source: message.content.source,
        data: {
          mcpTool: 'dao',
          mcpMethod: 'createProposal',
          params: {
            title: forMatch[1].substring(0, 50),
            description: forMatch[1],
            amount: parseFloat(amountMatch[1]),
            duration: 7 * 24 * 60 * 60 // 7 days default
          }
        }
      };

      await callback(responseContent);

      return {
        text: 'Proposal creation initiated',
        values: { success: true, amount: amountMatch[1] },
        data: { mcpCall: 'dao:createProposal' },
        success: true,
      };
    } catch (error) {
      logger.error('Error creating proposal:', error);
      return {
        text: 'Failed to create proposal',
        values: { success: false },
        success: false,
        error: error instanceof Error ? error : new Error(String(error)),
      };
    }
  },

  examples: [],
};

// Vote on Proposal Action
const voteProposalAction: Action = {
  name: 'VOTE_PROPOSAL',
  similes: ['VOTE', 'CAST_VOTE', 'VOTE_ON'],
  description: 'Vote on a DAO proposal',
  
  validate: async (_runtime: IAgentRuntime, message: Memory, _state: State): Promise<boolean> => {
    const text = message.content.text?.toLowerCase() || '';
    return text.includes('vote') && 
           (text.includes('proposal') || text.includes('yes') || text.includes('no'));
  },

  handler: async (
    runtime: IAgentRuntime,
    message: Memory,
    _state: State,
    _options: any,
    callback: HandlerCallback,
    _responses: Memory[]
  ): Promise<ActionResult> => {
    try {
      const text = message.content.text || '';
      
      // Extract vote and proposal ID
      const proposalMatch = text.match(/proposal\s*#?(\d+)/i);
      const support = text.toLowerCase().includes('yes') || 
                     text.toLowerCase().includes('support') ||
                     text.toLowerCase().includes('approve');
      
      if (!proposalMatch) {
        return {
          text: 'Please specify proposal ID (e.g., "vote yes on proposal 5")',
          values: { success: false },
          success: false,
        };
      }

      const responseContent: Content = {
        text: `Casting ${support ? 'YES' : 'NO'} vote on proposal #${proposalMatch[1]}...`,
        actions: ['VOTE_PROPOSAL'],
        source: message.content.source,
        data: {
          mcpTool: 'dao',
          mcpMethod: 'vote',
          params: {
            proposalId: parseInt(proposalMatch[1]),
            support
          }
        }
      };

      await callback(responseContent);

      return {
        text: 'Vote cast',
        values: { success: true, proposalId: proposalMatch[1], support },
        data: { mcpCall: 'dao:vote' },
        success: true,
      };
    } catch (error) {
      logger.error('Error voting on proposal:', error);
      return {
        text: 'Failed to cast vote',
        values: { success: false },
        success: false,
        error: error instanceof Error ? error : new Error(String(error)),
      };
    }
  },

  examples: [],
};

// Deploy Contract Action
const deployContractAction: Action = {
  name: 'DEPLOY_CONTRACT',
  similes: ['DEPLOY', 'CREATE_CONTRACT', 'LAUNCH_CONTRACT'],
  description: 'Deploy a smart contract to Midnight blockchain',
  
  validate: async (_runtime: IAgentRuntime, message: Memory, _state: State): Promise<boolean> => {
    const text = message.content.text?.toLowerCase() || '';
    return text.includes('deploy') && 
           (text.includes('contract') || text.includes('treasury') || text.includes('dao'));
  },

  handler: async (
    runtime: IAgentRuntime,
    message: Memory,
    state: State,
    _options: any,
    callback: HandlerCallback,
    _responses: Memory[]
  ): Promise<ActionResult> => {
    try {
      const text = message.content.text?.toLowerCase() || '';
      
      let contractType = 'standard';
      if (text.includes('treasury')) contractType = 'treasury';
      else if (text.includes('dao')) contractType = 'dao';
      else if (text.includes('token')) contractType = 'token';
      else if (text.includes('vote') || text.includes('voting')) contractType = 'voting';

      const responseContent: Content = {
        text: `Deploying ${contractType} contract to Midnight blockchain...`,
        actions: ['DEPLOY_CONTRACT'],
        source: message.content.source,
        data: {
          mcpTool: 'contract',
          mcpMethod: 'deploy',
          params: {
            type: contractType,
            name: state.botName || 'MidnightDAO'
          }
        }
      };

      await callback(responseContent);

      return {
        text: 'Contract deployment initiated',
        values: { success: true, contractType },
        data: { mcpCall: 'contract:deploy' },
        success: true,
      };
    } catch (error) {
      logger.error('Error deploying contract:', error);
      return {
        text: 'Failed to deploy contract',
        values: { success: false },
        success: false,
        error: error instanceof Error ? error : new Error(String(error)),
      };
    }
  },

  examples: [],
};

// Treasury Status Provider
const treasuryStatusProvider: Provider = {
  name: 'TREASURY_STATUS',
  description: 'Provides DAO treasury status information',

  get: async (
    _runtime: IAgentRuntime,
    message: Memory,
    _state: State
  ): Promise<ProviderResult> => {
    const text = message.content.text?.toLowerCase() || '';
    if (text.includes('treasury')) {
      return {
        text: 'Treasury status can be checked using MCP tools',
        values: {
          mcpTool: 'treasury',
          mcpMethod: 'getStatus'
        },
        data: {}
      };
    }
    return { text: '', values: {}, data: {} };
  },
};

/**
 * MidnightOS Service - Manages blockchain operations
 */
export class MidnightService extends Service {
  static serviceType = 'midnight-blockchain';
  capabilityDescription = 'Manages blockchain operations on Midnight network through MCP tools';

  constructor(runtime: IAgentRuntime) {
    super(runtime);
  }

  static async start(runtime: IAgentRuntime) {
    logger.info('*** Starting Midnight blockchain service ***');
    const service = new MidnightService(runtime);
    
    // Initialize MCP connection if needed
    const mcpUrl = process.env.MCP_SERVER_URL || 'http://localhost:3456';
    logger.info(`Midnight service configured with MCP server at: ${mcpUrl}`);
    
    return service;
  }

  static async stop(runtime: IAgentRuntime) {
    logger.info('*** Stopping Midnight blockchain service ***');
    const service = runtime.getService(MidnightService.serviceType);
    if (!service) {
      throw new Error('Midnight service not found');
    }
    service.stop();
  }

  async stop() {
    logger.info('*** Stopping Midnight blockchain service instance ***');
  }
}

/**
 * MidnightOS Plugin - Real blockchain operations through MCP
 */
const plugin: Plugin = {
  name: 'midnight-blockchain',
  description: 'Real blockchain operations on Midnight network via MCP tools',
  priority: 100, // Higher priority than starter plugin
  
  config: {
    MCP_SERVER_URL: process.env.MCP_SERVER_URL || 'http://localhost:3456',
    MIDNIGHT_PROOF_SERVER_URL: process.env.MIDNIGHT_PROOF_SERVER_URL,
    MIDNIGHT_INDEXER_URL: process.env.MIDNIGHT_INDEXER_URL,
    MIDNIGHT_NODE_URL: process.env.MIDNIGHT_NODE_URL,
  },

  async init(config: Record<string, string>) {
    logger.info('*** Initializing Midnight blockchain plugin ***');
    logger.info('MCP Server URL:', config.MCP_SERVER_URL);
    
    // Set environment variables for MCP connection
    for (const [key, value] of Object.entries(config)) {
      if (value) process.env[key] = value;
    }
  },

  services: [MidnightService],
  
  actions: [
    walletBalanceAction,
    sendTransactionAction,
    createProposalAction,
    voteProposalAction,
    deployContractAction,
  ],
  
  providers: [treasuryStatusProvider],
  
  routes: [
    {
      name: 'blockchain-status',
      path: '/blockchain/status',
      type: 'GET',
      handler: async (_req: any, res: any) => {
        res.json({
          status: 'connected',
          network: 'midnight-testnet',
          mcpServer: process.env.MCP_SERVER_URL || 'http://localhost:3456',
          features: ['wallet', 'dao', 'treasury', 'contracts'],
        });
      },
    },
  ],
  
  events: {
    MESSAGE_RECEIVED: [
      async (params) => {
        // Check if message contains blockchain-related keywords
        const message = params.message as Memory;
        if (message?.content?.text) {
          const text = message.content.text.toLowerCase();
          if (text.includes('wallet') || text.includes('dao') || text.includes('treasury')) {
            logger.info('Blockchain-related message received:', text);
          }
        }
      },
    ],
  },
};

export default plugin;