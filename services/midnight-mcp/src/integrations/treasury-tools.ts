/**
 * Treasury Management Tools for MCP
 * Exposes DAO treasury operations as MCP tools
 */

import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { DaoTreasuryManager } from './dao-treasury-manager.js';
import { createLogger } from '../logger/index.js';
import { WalletServiceMCP } from '../mcp/index.js';

// Treasury tool definitions that will be exposed through MCP
export const TREASURY_TOOLS: Tool[] = [
  {
    name: 'getTreasuryState',
    description: 'Get current state of DAO treasury including balance, proposals, and voting status',
    inputSchema: {
      type: 'object',
      properties: {
        daoAddress: {
          type: 'string',
          description: 'DAO voting contract address (optional if using default)'
        }
      }
    }
  },
  {
    name: 'fundTreasury',
    description: 'Fund the DAO treasury with tokens',
    inputSchema: {
      type: 'object',
      properties: {
        amount: {
          type: 'string',
          description: 'Amount of tokens to fund'
        },
        tokenAddress: {
          type: 'string',
          description: 'Address of the funding token contract'
        }
      },
      required: ['amount']
    }
  },
  {
    name: 'createTreasuryProposal',
    description: 'Create a new treasury funding proposal',
    inputSchema: {
      type: 'object',
      properties: {
        description: {
          type: 'string',
          description: 'Description of the proposal'
        },
        amount: {
          type: 'string',
          description: 'Amount of tokens requested'
        },
        recipient: {
          type: 'string',
          description: 'Recipient address for the funds'
        }
      },
      required: ['description', 'amount', 'recipient']
    }
  },
  {
    name: 'openProposalVoting',
    description: 'Open voting for a treasury proposal',
    inputSchema: {
      type: 'object',
      properties: {
        proposalId: {
          type: 'string',
          description: 'ID of the proposal to open voting for'
        }
      },
      required: ['proposalId']
    }
  },
  {
    name: 'closeProposalVoting',
    description: 'Close voting for current treasury proposal',
    inputSchema: {
      type: 'object',
      properties: {}
    }
  },
  {
    name: 'payoutApprovedProposal',
    description: 'Execute payout for an approved treasury proposal',
    inputSchema: {
      type: 'object',
      properties: {}
    }
  },
  {
    name: 'getTreasuryProposals',
    description: 'Get list of all treasury proposals',
    inputSchema: {
      type: 'object',
      properties: {
        status: {
          type: 'string',
          enum: ['pending', 'voting', 'approved', 'rejected', 'paid'],
          description: 'Filter proposals by status (optional)'
        }
      }
    }
  },
  {
    name: 'getTreasuryAnalytics',
    description: 'Get treasury analytics including inflow/outflow and approval rates',
    inputSchema: {
      type: 'object',
      properties: {}
    }
  },
  {
    name: 'deployTreasuryDAO',
    description: 'Deploy a new DAO with treasury management capabilities',
    inputSchema: {
      type: 'object',
      properties: {
        fundingTokenAddress: {
          type: 'string',
          description: 'Address of the funding token contract'
        },
        voteTokenAddress: {
          type: 'string',
          description: 'Address of the voting token contract'
        },
        minVotesForApproval: {
          type: 'number',
          description: 'Minimum votes required for proposal approval'
        }
      },
      required: ['fundingTokenAddress', 'voteTokenAddress']
    }
  },
  {
    name: 'mintFundingTokens',
    description: 'Mint funding tokens for treasury (admin only)',
    inputSchema: {
      type: 'object',
      properties: {
        amount: {
          type: 'string',
          description: 'Amount of tokens to mint'
        }
      },
      required: ['amount']
    }
  }
];

// Treasury tool handlers
export class TreasuryToolHandlers {
  private logger = createLogger('treasury-tools');
  private treasuryManager?: DaoTreasuryManager;
  private walletService: WalletServiceMCP;

  constructor(walletService: WalletServiceMCP) {
    this.walletService = walletService;
  }

  async initializeTreasuryManager(config: any): Promise<void> {
    const providers = await this.walletService.getProviders();
    this.treasuryManager = new DaoTreasuryManager(this.logger, providers, config);
    await this.treasuryManager.initialize();
  }

  async handleTreasuryTool(toolName: string, args: any): Promise<any> {
    switch (toolName) {
      case 'getTreasuryState':
        return this.getTreasuryState(args);
      
      case 'fundTreasury':
        return this.fundTreasury(args);
      
      case 'createTreasuryProposal':
        return this.createTreasuryProposal(args);
      
      case 'openProposalVoting':
        return this.openProposalVoting(args);
      
      case 'closeProposalVoting':
        return this.closeProposalVoting();
      
      case 'payoutApprovedProposal':
        return this.payoutApprovedProposal();
      
      case 'getTreasuryProposals':
        return this.getTreasuryProposals(args);
      
      case 'getTreasuryAnalytics':
        return this.getTreasuryAnalytics();
      
      case 'deployTreasuryDAO':
        return this.deployTreasuryDAO(args);
      
      case 'mintFundingTokens':
        return this.mintFundingTokens(args);
      
      default:
        throw new Error(`Unknown treasury tool: ${toolName}`);
    }
  }

  private async getTreasuryState(args: any): Promise<any> {
    if (!this.treasuryManager) {
      throw new Error('Treasury manager not initialized');
    }

    const state = await this.treasuryManager.getTreasuryState();
    
    return {
      balance: state.balance.toString(),
      totalFunded: state.totalFunded.toString(),
      totalPaidOut: state.totalPaidOut.toString(),
      pendingProposals: state.pendingProposals,
      approvedProposals: state.approvedProposals,
      electionOpen: state.electionOpen,
      electionId: state.electionId,
      votingResults: state.votingResults
    };
  }

  private async fundTreasury(args: any): Promise<any> {
    if (!this.treasuryManager) {
      throw new Error('Treasury manager not initialized');
    }

    const amount = BigInt(args.amount);
    
    // Create coin info for funding
    const coinInfo = {
      value: amount,
      color: args.tokenAddress || 'default_funding_token',
      // Additional coin properties...
    };

    const tx = await this.treasuryManager.fundTreasury(coinInfo as any);
    
    return {
      success: true,
      transactionId: tx.txId,
      amount: amount.toString(),
      message: 'Treasury funded successfully'
    };
  }

  private async createTreasuryProposal(args: any): Promise<any> {
    if (!this.treasuryManager) {
      throw new Error('Treasury manager not initialized');
    }

    const proposal = await this.treasuryManager.createProposal(
      args.description,
      BigInt(args.amount),
      args.recipient
    );

    return {
      proposalId: proposal.id,
      description: proposal.description,
      amount: proposal.amount.toString(),
      recipient: proposal.recipient,
      status: proposal.status,
      createdAt: proposal.createdAt.toISOString()
    };
  }

  private async openProposalVoting(args: any): Promise<any> {
    if (!this.treasuryManager) {
      throw new Error('Treasury manager not initialized');
    }

    const tx = await this.treasuryManager.openVoting(args.proposalId);
    
    return {
      success: true,
      proposalId: args.proposalId,
      transactionId: tx.txId,
      message: 'Voting opened for proposal'
    };
  }

  private async closeProposalVoting(): Promise<any> {
    if (!this.treasuryManager) {
      throw new Error('Treasury manager not initialized');
    }

    const tx = await this.treasuryManager.closeVoting();
    const state = await this.treasuryManager.getTreasuryState();
    
    return {
      success: true,
      transactionId: tx.txId,
      votingResults: state.votingResults,
      message: 'Voting closed'
    };
  }

  private async payoutApprovedProposal(): Promise<any> {
    if (!this.treasuryManager) {
      throw new Error('Treasury manager not initialized');
    }

    const tx = await this.treasuryManager.payoutApprovedProposal();
    
    return {
      success: true,
      transactionId: tx.txId,
      message: 'Payout executed for approved proposal'
    };
  }

  private async getTreasuryProposals(args: any): Promise<any> {
    if (!this.treasuryManager) {
      throw new Error('Treasury manager not initialized');
    }

    let proposals = this.treasuryManager.getProposals();
    
    // Filter by status if provided
    if (args.status) {
      proposals = proposals.filter(p => p.status === args.status);
    }

    return proposals.map(p => ({
      id: p.id,
      description: p.description,
      amount: p.amount.toString(),
      recipient: p.recipient,
      status: p.status,
      votes: p.votes,
      createdAt: p.createdAt.toISOString(),
      votingEndAt: p.votingEndAt?.toISOString()
    }));
  }

  private async getTreasuryAnalytics(): Promise<any> {
    if (!this.treasuryManager) {
      throw new Error('Treasury manager not initialized');
    }

    const analytics = await this.treasuryManager.getTreasuryAnalytics();
    
    return {
      totalValue: analytics.totalValue.toString(),
      monthlyInflow: analytics.monthlyInflow.toString(),
      monthlyOutflow: analytics.monthlyOutflow.toString(),
      proposalApprovalRate: `${analytics.proposalApprovalRate.toFixed(2)}%`,
      averageVoterTurnout: `${analytics.averageVoterTurnout.toFixed(2)}%`
    };
  }

  private async deployTreasuryDAO(args: any): Promise<any> {
    const providers = await this.walletService.getProviders();
    const config = {
      fundingTokenAddress: args.fundingTokenAddress,
      daoVoteTokenAddress: args.voteTokenAddress,
      minVotesForApproval: args.minVotesForApproval
    };

    this.treasuryManager = new DaoTreasuryManager(this.logger, providers, config);
    const daoAddress = await this.treasuryManager.deployDaoVotingContract();

    return {
      success: true,
      daoAddress,
      fundingTokenAddress: args.fundingTokenAddress,
      voteTokenAddress: args.voteTokenAddress,
      message: 'DAO with treasury deployed successfully'
    };
  }

  private async mintFundingTokens(args: any): Promise<any> {
    // This would integrate with the funding token contract
    // to mint new tokens for treasury funding
    
    return {
      success: true,
      amount: args.amount,
      message: 'Funding tokens minted (simulation - requires admin rights)'
    };
  }
}