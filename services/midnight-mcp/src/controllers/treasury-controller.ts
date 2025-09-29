/**
 * Treasury Controller
 * Handles HTTP endpoints for treasury management operations
 */

import { Request, Response } from 'express';
import { DaoTreasuryManager } from '../integrations/dao-treasury-manager.js';
import { WalletServiceMCP } from '../mcp/index.js';
import { createLogger } from '../logger/index.js';

class TreasuryController {
  private logger = createLogger('treasury-controller');
  private treasuryManager?: DaoTreasuryManager;
  private walletService: WalletServiceMCP;

  constructor(walletService: WalletServiceMCP) {
    this.walletService = walletService;
  }

  async initializeTreasuryManager(): Promise<void> {
    if (!this.treasuryManager) {
      const config = {
        fundingTokenAddress: process.env.FUNDING_TOKEN_ADDRESS || '',
        daoVoteTokenAddress: process.env.DAO_VOTE_TOKEN_ADDRESS || '',
        daoVotingAddress: process.env.DAO_VOTING_ADDRESS
      };

      const providers = await this.walletService.getProviders();
      this.treasuryManager = new DaoTreasuryManager(this.logger, providers, config);
      
      if (config.daoVotingAddress) {
        await this.treasuryManager.initialize();
      }
    }
  }

  /**
   * POST /treasury/create-proposal
   */
  async createProposal(req: Request, res: Response): Promise<void> {
    try {
      await this.initializeTreasuryManager();
      
      const { description, amount, recipient } = req.body;
      
      if (!description || !amount || !recipient) {
        res.status(400).json({
          error: 'Missing required fields: description, amount, recipient'
        });
        return;
      }

      const proposal = await this.treasuryManager!.createProposal(
        description,
        BigInt(amount),
        recipient
      );

      res.json({
        success: true,
        proposal: {
          id: proposal.id,
          description: proposal.description,
          amount: proposal.amount.toString(),
          recipient: proposal.recipient,
          status: proposal.status,
          createdAt: proposal.createdAt
        }
      });
    } catch (error: any) {
      this.logger.error('Error creating proposal:', error);
      res.status(500).json({
        error: 'Failed to create proposal',
        details: error.message
      });
    }
  }

  /**
   * GET /treasury/proposals
   */
  async getProposals(req: Request, res: Response): Promise<void> {
    try {
      await this.initializeTreasuryManager();
      
      const { status } = req.query;
      let proposals = this.treasuryManager!.getProposals();
      
      if (status && typeof status === 'string') {
        proposals = proposals.filter(p => p.status === status);
      }

      res.json({
        success: true,
        count: proposals.length,
        proposals: proposals.map(p => ({
          id: p.id,
          description: p.description,
          amount: p.amount.toString(),
          recipient: p.recipient,
          status: p.status,
          votes: p.votes,
          createdAt: p.createdAt,
          votingEndAt: p.votingEndAt
        }))
      });
    } catch (error: any) {
      this.logger.error('Error fetching proposals:', error);
      res.status(500).json({
        error: 'Failed to fetch proposals',
        details: error.message
      });
    }
  }

  /**
   * GET /treasury/analytics
   */
  async getAnalytics(req: Request, res: Response): Promise<void> {
    try {
      await this.initializeTreasuryManager();
      
      const analytics = await this.treasuryManager!.getTreasuryAnalytics();
      
      res.json({
        success: true,
        analytics: {
          totalValue: analytics.totalValue.toString(),
          monthlyInflow: analytics.monthlyInflow.toString(),
          monthlyOutflow: analytics.monthlyOutflow.toString(),
          proposalApprovalRate: analytics.proposalApprovalRate,
          averageVoterTurnout: analytics.averageVoterTurnout
        }
      });
    } catch (error: any) {
      this.logger.error('Error fetching analytics:', error);
      res.status(500).json({
        error: 'Failed to fetch treasury analytics',
        details: error.message
      });
    }
  }

  /**
   * GET /treasury/balance
   */
  async getBalance(req: Request, res: Response): Promise<void> {
    try {
      await this.initializeTreasuryManager();
      
      // Check if DAO is configured
      if (!process.env.DAO_VOTING_ADDRESS) {
        // Return default values when DAO is not configured
        res.json({
          success: true,
          balance: {
            total: '0',
            totalFunded: '0',
            totalPaidOut: '0',
            pendingProposals: 0,
            approvedProposals: 0
          },
          electionStatus: {
            open: false,
            electionId: null,
            votes: null
          },
          message: 'DAO not configured - returning default values'
        });
        return;
      }
      
      const state = await this.treasuryManager!.getTreasuryState();
      
      res.json({
        success: true,
        balance: {
          total: state.balance.toString(),
          totalFunded: state.totalFunded.toString(),
          totalPaidOut: state.totalPaidOut.toString(),
          pendingProposals: state.pendingProposals,
          approvedProposals: state.approvedProposals
        },
        electionStatus: {
          open: state.electionOpen,
          electionId: state.electionId,
          votes: state.votingResults
        }
      });
    } catch (error: any) {
      this.logger.error('Error fetching balance:', error);
      res.status(500).json({
        error: 'Failed to fetch treasury balance',
        details: error.message
      });
    }
  }

  /**
   * POST /treasury/open-voting
   */
  async openVoting(req: Request, res: Response): Promise<void> {
    try {
      await this.initializeTreasuryManager();
      
      const { proposalId } = req.body;
      
      if (!proposalId) {
        res.status(400).json({
          error: 'Missing required field: proposalId'
        });
        return;
      }

      const tx = await this.treasuryManager!.openVoting(proposalId);
      
      res.json({
        success: true,
        proposalId,
        transactionId: tx.txId,
        blockHeight: tx.blockHeight
      });
    } catch (error: any) {
      this.logger.error('Error opening voting:', error);
      res.status(500).json({
        error: 'Failed to open voting',
        details: error.message
      });
    }
  }

  /**
   * POST /treasury/payout
   */
  async executePayout(req: Request, res: Response): Promise<void> {
    try {
      await this.initializeTreasuryManager();
      
      const tx = await this.treasuryManager!.payoutApprovedProposal();
      
      res.json({
        success: true,
        transactionId: tx.txId,
        blockHeight: tx.blockHeight,
        message: 'Payout executed successfully'
      });
    } catch (error: any) {
      this.logger.error('Error executing payout:', error);
      res.status(500).json({
        error: 'Failed to execute payout',
        details: error.message
      });
    }
  }
}

export { TreasuryController };