/**
 * DAO Treasury Management Integration for MidnightOS
 * 
 * This module provides treasury management capabilities for DAOs on Midnight blockchain,
 * including funding operations, payout management, and treasury analytics.
 * 
 * Based on the midnight-dao-contract implementation
 */

import { ContractAddress, encodeContractAddress } from '@midnight-ntwrk/compact-runtime';
import { 
  type FinalizedTxData,
  type MidnightProvider,
  type WalletProvider 
} from '@midnight-ntwrk/midnight-js-types';
// Import from the local compiled contracts  
import { DaoVoting, FundingShieldToken, witnesses } from './dao/contract/index.js';

type DaoVotingPrivateState = any; // We'll use any for now since the types are in the contract
type FundingShieldTokenPrivateState = any;
import { deployContract, findDeployedContract } from '@midnight-ntwrk/midnight-js-contracts';
import { type Logger } from 'pino';
import { CoinInfo, QualifiedCoinInfo } from '@midnight-ntwrk/ledger';

export interface TreasuryConfig {
  fundingTokenAddress: string;
  daoVoteTokenAddress: string;
  daoVotingAddress?: string;
  minVotesForApproval?: number;
}

export interface TreasuryState {
  balance: bigint;
  totalFunded: bigint;
  totalPaidOut: bigint;
  pendingProposals: number;
  approvedProposals: number;
  treasury: QualifiedCoinInfo | null;
  electionOpen: boolean;
  electionId?: string;
  votingResults?: {
    yes: number;
    no: number;
    absent: number;
    total: number;
  };
}

export interface TreasuryProposal {
  id: string;
  description: string;
  amount: bigint;
  recipient: string;
  status: 'pending' | 'voting' | 'approved' | 'rejected' | 'paid';
  votes?: {
    yes: number;
    no: number;
    absent: number;
  };
  createdAt: Date;
  votingEndAt?: Date;
}

export class DaoTreasuryManager {
  private logger: Logger;
  private providers: any;
  private daoVotingContract?: any;
  private fundingTokenContract?: any;
  private config: TreasuryConfig;
  private proposals: Map<string, TreasuryProposal> = new Map();

  constructor(
    logger: Logger,
    providers: any,
    config: TreasuryConfig
  ) {
    this.logger = logger;
    this.providers = providers;
    this.config = config;
  }

  /**
   * Initialize the treasury manager by connecting to contracts
   */
  async initialize(): Promise<void> {
    this.logger.info('Initializing DAO Treasury Manager...');

    // Connect to existing DAO voting contract if address provided
    if (this.config.daoVotingAddress) {
      await this.joinDaoVotingContract(this.config.daoVotingAddress);
    } else {
      // Deploy new DAO voting contract
      await this.deployDaoVotingContract();
    }

    // Connect to funding token contract
    await this.joinFundingTokenContract(this.config.fundingTokenAddress);

    this.logger.info('DAO Treasury Manager initialized successfully');
  }

  /**
   * Deploy a new DAO voting contract with treasury capabilities
   */
  async deployDaoVotingContract(): Promise<string> {
    this.logger.info('Deploying new DAO voting contract with treasury...');
    
    const fundingTokenBytes = encodeContractAddress(this.config.fundingTokenAddress);
    const daoVoteTokenBytes = encodeContractAddress(this.config.daoVoteTokenAddress);

    const contract = await deployContract(this.providers, {
      contract: new DaoVoting.Contract(witnesses as any),
      privateStateId: 'daoVotingTreasuryPrivateState',
      initialPrivateState: {},
      args: [
        { bytes: fundingTokenBytes },
        { bytes: daoVoteTokenBytes }
      ]
    });

    this.daoVotingContract = contract;
    const address = contract.deployTxData.public.contractAddress;
    
    this.logger.info(`DAO voting contract deployed at: ${address}`);
    return address;
  }

  /**
   * Join an existing DAO voting contract
   */
  async joinDaoVotingContract(contractAddress: string): Promise<void> {
    this.logger.info(`Joining DAO voting contract at ${contractAddress}...`);
    
    this.daoVotingContract = await findDeployedContract(this.providers, {
      contractAddress,
      contract: new DaoVoting.Contract(witnesses as any),
      privateStateId: 'daoVotingTreasuryPrivateState',
      initialPrivateState: {}
    });

    this.logger.info('Successfully joined DAO voting contract');
  }

  /**
   * Join funding token contract
   */
  async joinFundingTokenContract(contractAddress: string): Promise<void> {
    this.logger.info(`Joining funding token contract at ${contractAddress}...`);
    
    this.fundingTokenContract = await findDeployedContract(this.providers, {
      contractAddress,
      contract: new FundingShieldToken.Contract(witnesses as any),
      privateStateId: 'fundingTokenPrivateState',
      initialPrivateState: {}
    });

    this.logger.info('Successfully joined funding token contract');
  }

  /**
   * Fund the DAO treasury with tokens
   */
  async fundTreasury(fundCoin: CoinInfo): Promise<FinalizedTxData> {
    this.logger.info(`Funding treasury with ${fundCoin.value} tokens...`);
    
    if (!this.daoVotingContract) {
      throw new Error('DAO voting contract not initialized');
    }

    const finalizedTx = await this.daoVotingContract.callTx.fund_treasury(fundCoin);
    
    this.logger.info(`Treasury funded successfully. Tx: ${finalizedTx.public.txId}`);
    return finalizedTx.public;
  }

  /**
   * Get current treasury state
   */
  async getTreasuryState(): Promise<TreasuryState> {
    this.logger.info('Fetching treasury state...');
    
    if (!this.daoVotingContract) {
      throw new Error('DAO voting contract not initialized');
    }

    const contractAddress = this.daoVotingContract.deployTxData.public.contractAddress;
    const state = await this.providers.publicDataProvider
      .queryContractState(contractAddress)
      .then((contractState: any) => 
        contractState != null ? DaoVoting.ledger(contractState.data) : null
      );

    if (!state) {
      throw new Error('Unable to fetch treasury state');
    }

    return {
      balance: state.treasury?.value || 0n,
      totalFunded: 0n, // Calculate from transaction history
      totalPaidOut: 0n, // Calculate from transaction history
      pendingProposals: this.getPendingProposalsCount(),
      approvedProposals: this.getApprovedProposalsCount(),
      treasury: state.treasury,
      electionOpen: state.election_open,
      electionId: state.election_id ? Buffer.from(state.election_id).toString('hex') : undefined,
      votingResults: state.election_open ? undefined : {
        yes: Number(state.yes_votes),
        no: Number(state.no_votes),
        absent: Number(state.absent_votes),
        total: Number(state.total_votes)
      }
    };
  }

  /**
   * Create a new treasury funding proposal
   */
  async createProposal(
    description: string,
    amount: bigint,
    recipient: string
  ): Promise<TreasuryProposal> {
    this.logger.info(`Creating treasury proposal: ${description}`);
    
    const proposalId = this.generateProposalId();
    const proposal: TreasuryProposal = {
      id: proposalId,
      description,
      amount,
      recipient,
      status: 'pending',
      createdAt: new Date()
    };

    this.proposals.set(proposalId, proposal);
    
    this.logger.info(`Proposal ${proposalId} created successfully`);
    return proposal;
  }

  /**
   * Open voting for a proposal
   */
  async openVoting(proposalId: string): Promise<FinalizedTxData> {
    this.logger.info(`Opening voting for proposal ${proposalId}...`);
    
    const proposal = this.proposals.get(proposalId);
    if (!proposal) {
      throw new Error('Proposal not found');
    }

    if (!this.daoVotingContract) {
      throw new Error('DAO voting contract not initialized');
    }

    // Convert proposal ID to bytes32
    const idBytes = this.pad(proposalId, 32);
    const finalizedTx = await this.daoVotingContract.callTx.open_election(idBytes);
    
    proposal.status = 'voting';
    proposal.votingEndAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
    
    this.logger.info(`Voting opened for proposal ${proposalId}. Tx: ${finalizedTx.public.txId}`);
    return finalizedTx.public;
  }

  /**
   * Close voting for current election
   */
  async closeVoting(): Promise<FinalizedTxData> {
    this.logger.info('Closing current voting...');
    
    if (!this.daoVotingContract) {
      throw new Error('DAO voting contract not initialized');
    }

    const finalizedTx = await this.daoVotingContract.callTx.close_election();
    
    // Update proposal status based on voting results
    await this.updateProposalFromVotingResults();
    
    this.logger.info(`Voting closed. Tx: ${finalizedTx.public.txId}`);
    return finalizedTx.public;
  }

  /**
   * Payout approved proposal from treasury
   */
  async payoutApprovedProposal(): Promise<FinalizedTxData> {
    this.logger.info('Processing payout for approved proposal...');
    
    if (!this.daoVotingContract) {
      throw new Error('DAO voting contract not initialized');
    }

    const finalizedTx = await this.daoVotingContract.callTx.payout_approved_proposal();
    
    // Update proposal status
    const approvedProposal = this.getLatestApprovedProposal();
    if (approvedProposal) {
      approvedProposal.status = 'paid';
    }
    
    this.logger.info(`Payout processed. Tx: ${finalizedTx.public.txId}`);
    return finalizedTx.public;
  }

  /**
   * Cancel a payout (emergency function)
   */
  async cancelPayout(): Promise<FinalizedTxData> {
    this.logger.info('Cancelling payout...');
    
    if (!this.daoVotingContract) {
      throw new Error('DAO voting contract not initialized');
    }

    const finalizedTx = await this.daoVotingContract.callTx.cancel_payout();
    
    this.logger.info(`Payout cancelled. Tx: ${finalizedTx.public.txId}`);
    return finalizedTx.public;
  }

  /**
   * Get all proposals
   */
  getProposals(): TreasuryProposal[] {
    return Array.from(this.proposals.values());
  }

  /**
   * Get proposal by ID
   */
  getProposal(proposalId: string): TreasuryProposal | undefined {
    return this.proposals.get(proposalId);
  }

  /**
   * Generate treasury analytics
   */
  async getTreasuryAnalytics(): Promise<{
    totalValue: bigint;
    monthlyInflow: bigint;
    monthlyOutflow: bigint;
    proposalApprovalRate: number;
    averageVoterTurnout: number;
  }> {
    const state = await this.getTreasuryState();
    const proposals = this.getProposals();
    
    const approvedCount = proposals.filter(p => p.status === 'approved' || p.status === 'paid').length;
    const totalProposals = proposals.length;
    
    return {
      totalValue: state.balance,
      monthlyInflow: 0n, // Calculate from transaction history
      monthlyOutflow: 0n, // Calculate from transaction history
      proposalApprovalRate: totalProposals > 0 ? (approvedCount / totalProposals) * 100 : 0,
      averageVoterTurnout: 0 // Calculate from voting history
    };
  }

  // Helper methods
  private generateProposalId(): string {
    return `proposal_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private pad(str: string, length: number): Uint8Array {
    const bytes = new TextEncoder().encode(str);
    const padded = new Uint8Array(length);
    padded.set(bytes.slice(0, Math.min(bytes.length, length)));
    return padded;
  }

  private getPendingProposalsCount(): number {
    return Array.from(this.proposals.values())
      .filter(p => p.status === 'pending' || p.status === 'voting').length;
  }

  private getApprovedProposalsCount(): number {
    return Array.from(this.proposals.values())
      .filter(p => p.status === 'approved').length;
  }

  private getLatestApprovedProposal(): TreasuryProposal | undefined {
    return Array.from(this.proposals.values())
      .filter(p => p.status === 'approved')
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())[0];
  }

  private async updateProposalFromVotingResults(): Promise<void> {
    const state = await this.getTreasuryState();
    if (state.votingResults) {
      // Find the proposal that was being voted on
      const votingProposal = Array.from(this.proposals.values())
        .find(p => p.status === 'voting');
      
      if (votingProposal) {
        votingProposal.votes = {
          yes: state.votingResults.yes,
          no: state.votingResults.no,
          absent: state.votingResults.absent
        };
        
        // Determine if approved
        if (state.votingResults.yes > state.votingResults.no) {
          votingProposal.status = 'approved';
        } else {
          votingProposal.status = 'rejected';
        }
      }
    }
  }
}