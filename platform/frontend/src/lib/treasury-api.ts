/**
 * Treasury API Service
 * Handles all treasury and DAO-related API interactions
 */

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002/api';

export interface TreasuryProposal {
  id: string;
  title: string;
  description: string;
  proposer: string;
  recipient?: string;
  amount: number;
  status: 'pending' | 'voting' | 'approved' | 'rejected' | 'executed' | 'failed';
  votesFor: number;
  votesAgainst: number;
  totalVotes: number;
  quorum?: number;
  createdAt: string;
  votingEndsAt?: string;
  executedAt?: string;
  txHash?: string;
}

export interface TreasuryAnalytics {
  totalBalance: number;
  availableBalance: number;
  lockedInProposals: number;
  totalProposals: number;
  approvedProposals: number;
  rejectedProposals: number;
  successRate: number;
  totalDisbursed: number;
  memberCount: number;
  activeVoters: number;
  participationRate: number;
  recentActivity: ActivityItem[];
  balanceHistory: BalancePoint[];
}

export interface ActivityItem {
  id: string;
  type: 'deposit' | 'withdrawal' | 'proposal_created' | 'proposal_approved' | 'proposal_rejected' | 'vote_cast' | 'treasury_funded';
  description: string;
  amount?: number;
  actor?: string;
  timestamp: string;
  txHash?: string;
}

export interface BalancePoint {
  timestamp: string;
  balance: number;
  change: number;
}

export interface DaoState {
  isDeployed: boolean;
  treasuryAddress?: string;
  voteTokenAddress?: string;
  votingContractAddress?: string;
  memberCount: number;
  activeProposals: number;
  treasuryBalance?: number;
  governance: {
    proposalThreshold: number;
    quorumPercentage: number;
    votingPeriod: number;
  };
}

export interface BotTreasury {
  botId: string;
  botName: string;
  isDeployed: boolean;
  treasuryAddress?: string;
  balance?: number;
  memberCount?: number;
  activeProposals?: number;
  lastActivity?: string;
}

export interface CreateProposalParams {
  title: string;
  description: string;
  amount: number;
  recipient: string;
  category?: 'funding' | 'operational' | 'development' | 'marketing' | 'community';
}

export interface VoteParams {
  proposalId: string;
  vote: 'for' | 'against';
  reason?: string;
}

export interface DeployTreasuryParams {
  initialFunding?: number;
  governanceSettings?: {
    proposalThreshold?: number;
    quorumPercentage?: number;
    votingPeriod?: number;
  };
}

class TreasuryAPIService {
  private token: string | null = null;

  constructor() {
    if (typeof window !== 'undefined') {
      this.token = localStorage.getItem('auth_token');
    }
  }

  private async request<T>(
    endpoint: string, 
    options: RequestInit = {}
  ): Promise<T> {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    const response = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Request failed' }));
      throw new Error(error.error || `HTTP error! status: ${response.status}`);
    }

    return response.json();
  }

  // Bot Management
  async getBotsWithTreasury(): Promise<BotTreasury[]> {
    const response = await this.request<{ bots: any[] }>('/bots');
    
    // Filter bots with DAO feature enabled and map to treasury format
    return response.bots
      .filter(bot => bot.features?.dao)
      .map(bot => ({
        botId: bot.id,
        botName: bot.name,
        isDeployed: bot.status === 'deployed' && bot.treasuryAddress,
        treasuryAddress: bot.treasuryAddress,
        balance: bot.treasuryBalance || 0,
        memberCount: bot.memberCount || 0,
        activeProposals: bot.activeProposals || 0,
        lastActivity: bot.lastActivity,
      }));
  }

  // Treasury Operations
  async getTreasuryAnalytics(botId: string): Promise<TreasuryAnalytics> {
    try {
      return await this.request<TreasuryAnalytics>(`/bots/${botId}/treasury/analytics`);
    } catch (error) {
      // Return default analytics if not available
      return {
        totalBalance: 0,
        availableBalance: 0,
        lockedInProposals: 0,
        totalProposals: 0,
        approvedProposals: 0,
        rejectedProposals: 0,
        successRate: 0,
        totalDisbursed: 0,
        memberCount: 0,
        activeVoters: 0,
        participationRate: 0,
        recentActivity: [],
        balanceHistory: [],
      };
    }
  }

  async getProposals(botId: string, status?: string): Promise<TreasuryProposal[]> {
    try {
      const query = status ? `?status=${status}` : '';
      const response = await this.request<{ proposals: TreasuryProposal[] }>(
        `/bots/${botId}/treasury/proposals${query}`
      );
      return response.proposals || [];
    } catch (error) {
      return [];
    }
  }

  async createProposal(
    botId: string, 
    params: CreateProposalParams
  ): Promise<TreasuryProposal> {
    return await this.request<TreasuryProposal>(`/bots/${botId}/treasury/proposals`, {
      method: 'POST',
      body: JSON.stringify(params),
    });
  }

  async fundTreasury(botId: string, amount: number): Promise<{ txHash: string; newBalance: number }> {
    return await this.request(`/bots/${botId}/treasury/fund`, {
      method: 'POST',
      body: JSON.stringify({ amount }),
    });
  }

  // DAO Operations
  async getDaoState(botId: string): Promise<DaoState> {
    try {
      return await this.request<DaoState>(`/bots/${botId}/dao/state`);
    } catch (error) {
      return {
        isDeployed: false,
        memberCount: 0,
        activeProposals: 0,
        governance: {
          proposalThreshold: 100,
          quorumPercentage: 30,
          votingPeriod: 3 * 24 * 60 * 60, // 3 days in seconds
        },
      };
    }
  }

  async openElection(botId: string, proposalId: string): Promise<{ success: boolean; message: string }> {
    return await this.request(`/bots/${botId}/dao/open-election`, {
      method: 'POST',
      body: JSON.stringify({ proposalId }),
    });
  }

  async castVote(botId: string, params: VoteParams): Promise<{ success: boolean; txHash?: string }> {
    return await this.request(`/bots/${botId}/dao/cast-vote`, {
      method: 'POST',
      body: JSON.stringify(params),
    });
  }

  async deployTreasury(
    botId: string, 
    params?: DeployTreasuryParams
  ): Promise<{ 
    treasuryAddress: string; 
    voteTokenAddress: string; 
    votingContractAddress: string;
    txHash: string;
  }> {
    return await this.request(`/bots/${botId}/treasury/deploy`, {
      method: 'POST',
      body: JSON.stringify(params || {}),
    });
  }

  // Contract Operations
  async getContractInfo(botId: string): Promise<{
    treasuryAddress?: string;
    isDeployed: boolean;
    balance?: number;
  }> {
    return await this.request(`/bots/${botId}/contracts`);
  }

  async joinDao(botId: string, daoAddress: string): Promise<{ success: boolean; message: string }> {
    return await this.request(`/bots/${botId}/contracts/join-dao`, {
      method: 'POST',
      body: JSON.stringify({ daoAddress }),
    });
  }

  // Utility Methods
  setToken(token: string) {
    this.token = token;
    if (typeof window !== 'undefined') {
      localStorage.setItem('auth_token', token);
    }
  }

  clearToken() {
    this.token = null;
    if (typeof window !== 'undefined') {
      localStorage.removeItem('auth_token');
    }
  }

  // Real-time updates (for future WebSocket integration)
  subscribeToProposalUpdates(botId: string, callback: (proposal: TreasuryProposal) => void): () => void {
    // TODO: Implement WebSocket subscription
    console.log('WebSocket subscription not yet implemented');
    return () => {};
  }

  subscribeToTreasuryUpdates(botId: string, callback: (analytics: TreasuryAnalytics) => void): () => void {
    // TODO: Implement WebSocket subscription
    console.log('WebSocket subscription not yet implemented');
    return () => {};
  }
}

export const treasuryAPI = new TreasuryAPIService();