/**
 * Treasury Contract Deployment Tools for MCP
 * Provides tools for deploying actual DAO treasury contracts to Midnight blockchain
 */

import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { ContractDeploymentService } from './contract-deployment-service.js';
import { createLogger } from '../logger/index.js';
import { WalletServiceMCP } from '../mcp/index.js';

// Contract deployment tools
export const CONTRACT_DEPLOYMENT_TOOLS: Tool[] = [
  {
    name: 'deployFullTreasuryDAO',
    description: 'Deploy a complete DAO with treasury, funding tokens, and voting tokens to Midnight blockchain',
    inputSchema: {
      type: 'object',
      properties: {
        initialFunding: {
          type: 'string',
          description: 'Initial funding amount to mint (optional)'
        },
        adminPublicKey: {
          type: 'string',
          description: 'Admin public key (optional, defaults to wallet owner)'
        }
      }
    }
  },
  {
    name: 'joinExistingDAO',
    description: 'Join an already deployed DAO contract to interact with it',
    inputSchema: {
      type: 'object',
      properties: {
        daoAddress: {
          type: 'string',
          description: 'Address of the DAO voting contract'
        },
        fundingTokenAddress: {
          type: 'string',
          description: 'Address of the funding token contract'
        },
        voteTokenAddress: {
          type: 'string',
          description: 'Address of the vote token contract'
        }
      },
      required: ['daoAddress']
    }
  },
  {
    name: 'getDeployedContracts',
    description: 'Get list of all contracts deployed by this instance',
    inputSchema: {
      type: 'object',
      properties: {}
    }
  },
  {
    name: 'verifyContractDeployment',
    description: 'Verify that a contract is properly deployed and accessible',
    inputSchema: {
      type: 'object',
      properties: {
        contractAddress: {
          type: 'string',
          description: 'Address of the contract to verify'
        }
      },
      required: ['contractAddress']
    }
  }
];

export class ContractDeploymentToolHandlers {
  private deploymentService?: ContractDeploymentService;
  private walletService: WalletServiceMCP;
  private deployedDAOs: Map<string, any> = new Map();

  constructor(walletService: WalletServiceMCP) {
    this.walletService = walletService;
  }

  async initializeDeploymentService(): Promise<void> {
    const config = {
      network: process.env.NETWORK_ID === 'MainNet' ? 'mainnet' as const : 'testnet' as const,
      indexerUrl: process.env.INDEXER || 'https://indexer.testnet-02.midnight.network/api/v1/graphql',
      indexerWsUrl: process.env.INDEXER_WS || 'wss://indexer.testnet-02.midnight.network/api/v1/graphql/ws',
      nodeUrl: process.env.MN_NODE || 'https://rpc.testnet-02.midnight.network',
      proofServerUrl: process.env.PROOF_SERVER || 'https://rpc-proof-devnet.midnight.network:8443'
    };

    const logger = createLogger('contract-deployment');
    this.deploymentService = new ContractDeploymentService(logger, config);
    const walletProvider = await this.walletService.getWalletProvider();
    await this.deploymentService.initialize(walletProvider);
  }

  async handleDeploymentTool(toolName: string, args: any): Promise<any> {
    // Initialize deployment service if not ready
    if (!this.deploymentService) {
      await this.initializeDeploymentService();
    }

    switch (toolName) {
      case 'deployFullTreasuryDAO':
        return this.deployFullTreasuryDAO(args);
      
      case 'joinExistingDAO':
        return this.joinExistingDAO(args);
      
      case 'getDeployedContracts':
        return this.getDeployedContracts();
      
      case 'verifyContractDeployment':
        return this.verifyContractDeployment(args);
      
      default:
        throw new Error(`Unknown deployment tool: ${toolName}`);
    }
  }

  private async deployFullTreasuryDAO(args: any): Promise<any> {
    const logger = createLogger('contract-deployment');
    logger.info('=== DEPLOYING REAL DAO CONTRACTS TO MIDNIGHT BLOCKCHAIN ===');
    
    try {
      const initialFunding = args.initialFunding ? BigInt(args.initialFunding) : 0n;
      
      // Deploy the contracts
      const deployment = await this.deploymentService!.deployTreasuryDAO(
        args.adminPublicKey,
        initialFunding
      );

      // Store deployment info
      this.deployedDAOs.set(deployment.daoVotingContract.contractAddress, deployment);

      // Generate user-friendly response
      return {
        success: true,
        message: 'DAO Treasury successfully deployed to Midnight blockchain!',
        contracts: {
          dao: {
            address: deployment.daoVotingContract.contractAddress,
            txId: deployment.daoVotingContract.deploymentTxId,
            block: deployment.daoVotingContract.deploymentBlock,
            type: 'DAO Voting with Treasury'
          },
          fundingToken: {
            address: deployment.fundingTokenContract.contractAddress,
            txId: deployment.fundingTokenContract.deploymentTxId,
            block: deployment.fundingTokenContract.deploymentBlock,
            type: 'Funding Shield Token'
          },
          voteToken: {
            address: deployment.voteTokenContract.contractAddress,
            txId: deployment.voteTokenContract.deploymentTxId,
            block: deployment.voteTokenContract.deploymentBlock,
            type: 'DAO Vote Token'
          }
        },
        treasuryAddress: deployment.treasuryAddress,
        network: process.env.NETWORK_ID || 'TestNet',
        proofServer: process.env.PROOF_SERVER,
        instructions: {
          fundTreasury: `Use 'fundTreasury' with token address: ${deployment.fundingTokenContract.contractAddress}`,
          createProposal: `Use 'createTreasuryProposal' to create funding requests`,
          openVoting: `Use 'openProposalVoting' to start voting on proposals`,
          castVote: `Token holders at ${deployment.voteTokenContract.contractAddress} can vote`
        }
      };
      
    } catch (error: any) {
      logger.error('Contract deployment failed:', error);
      return {
        success: false,
        error: error.message,
        details: 'Failed to deploy contracts to Midnight blockchain',
        troubleshooting: [
          'Check wallet has sufficient balance for deployment',
          'Verify proof server is accessible',
          'Ensure network connection is stable',
          'Check indexer and node URLs are correct'
        ]
      };
    }
  }

  private async joinExistingDAO(args: any): Promise<any> {
    const logger = createLogger('contract-deployment');
    logger.info(`Joining existing DAO at ${args.daoAddress}...`);
    
    try {
      // Join the DAO voting contract
      const daoContract = await this.deploymentService!.joinExistingContract(
        args.daoAddress,
        'DaoVoting'
      );

      // Join funding token if provided
      let fundingContract;
      if (args.fundingTokenAddress) {
        fundingContract = await this.deploymentService!.joinExistingContract(
          args.fundingTokenAddress,
          'FundingToken'
        );
      }

      // Join vote token if provided
      let voteContract;
      if (args.voteTokenAddress) {
        voteContract = await this.deploymentService!.joinExistingContract(
          args.voteTokenAddress,
          'VoteToken'
        );
      }

      return {
        success: true,
        message: 'Successfully joined existing DAO contracts',
        dao: {
          address: args.daoAddress,
          status: 'connected'
        },
        fundingToken: args.fundingTokenAddress ? {
          address: args.fundingTokenAddress,
          status: 'connected'
        } : null,
        voteToken: args.voteTokenAddress ? {
          address: args.voteTokenAddress,
          status: 'connected'
        } : null,
        capabilities: [
          'View treasury balance',
          'Create proposals',
          'Vote on proposals',
          'Fund treasury',
          'Execute payouts'
        ]
      };
      
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
        details: 'Failed to join existing DAO contracts'
      };
    }
  }

  private async getDeployedContracts(): Promise<any> {
    const contracts = this.deploymentService?.getDeployedContracts() || [];
    const daos = Array.from(this.deployedDAOs.values());
    
    return {
      totalDeployed: contracts.length,
      contracts: contracts.map(c => ({
        address: c.contractAddress,
        type: c.contractType,
        deployedAt: c.deploymentTimestamp,
        txId: c.deploymentTxId,
        block: c.deploymentBlock
      })),
      daos: daos.map(d => ({
        daoAddress: d.daoVotingContract.contractAddress,
        fundingToken: d.fundingTokenContract.contractAddress,
        voteToken: d.voteTokenContract.contractAddress,
        treasury: d.treasuryAddress
      })),
      network: process.env.NETWORK_ID || 'TestNet'
    };
  }

  private async verifyContractDeployment(args: any): Promise<any> {
    const logger = createLogger('contract-deployment');
    logger.info(`Verifying contract at ${args.contractAddress}...`);
    
    try {
      // Try to query the contract state
      const providers = await this.walletService.getProviders();
      const contractState = await providers.publicDataProvider.queryContractState(
        args.contractAddress
      );
      
      if (contractState) {
        return {
          success: true,
          verified: true,
          address: args.contractAddress,
          state: 'deployed',
          data: contractState.data ? 'Contract has state data' : 'No state data',
          network: process.env.NETWORK_ID || 'TestNet',
          message: 'Contract is deployed and accessible on Midnight blockchain'
        };
      } else {
        return {
          success: false,
          verified: false,
          address: args.contractAddress,
          state: 'not found',
          message: 'Contract not found at this address'
        };
      }
      
    } catch (error: any) {
      return {
        success: false,
        verified: false,
        error: error.message,
        message: 'Unable to verify contract deployment'
      };
    }
  }
}