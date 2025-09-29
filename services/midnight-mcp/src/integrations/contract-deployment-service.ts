/**
 * Contract Deployment Service for MidnightOS
 * 
 * This service handles the actual deployment of compiled Midnight contracts
 * to the blockchain, including:
 * - DAO Voting Contract (with treasury)
 * - Funding Shield Token Contract
 * - DAO Shielded Token Contract
 * - Marketplace Registry Contract
 */

import * as crypto from 'crypto';
import { type ContractAddress } from '@midnight-ntwrk/compact-runtime';
import { type MidnightProvider, type WalletProvider } from '@midnight-ntwrk/midnight-js-types';
import { deployContract, findDeployedContract } from '@midnight-ntwrk/midnight-js-contracts';
import { httpClientProofProvider } from '@midnight-ntwrk/midnight-js-http-client-proof-provider';
import { indexerPublicDataProvider } from '@midnight-ntwrk/midnight-js-indexer-public-data-provider';
import { NodeZkConfigProvider } from '@midnight-ntwrk/midnight-js-node-zk-config-provider';
import { type Logger } from 'pino';
import * as path from 'path';
import * as fs from 'fs';

// Import the actual compiled contracts
import { DaoVoting, FundingShieldToken, DaoShieldedToken, witnesses } from './dao/contract/index.js';
import { MarketplaceRegistry } from './marketplace/contract/index.js';

export interface ContractDeploymentConfig {
  network: 'testnet' | 'mainnet' | 'local';
  indexerUrl: string;
  indexerWsUrl: string;
  nodeUrl: string;
  proofServerUrl: string;
}

export interface DeployedContractInfo {
  contractAddress: string;
  contractType: string;
  deploymentTxId: string;
  deploymentBlock: number;
  deploymentTimestamp: Date;
  zkConfigPath?: string;
}

export interface TreasuryDAODeployment {
  daoVotingContract: DeployedContractInfo;
  fundingTokenContract: DeployedContractInfo;
  voteTokenContract: DeployedContractInfo;
  treasuryAddress: string;
}

export class ContractDeploymentService {
  private logger: Logger;
  private config: ContractDeploymentConfig;
  private providers: any;
  private deployedContracts: Map<string, DeployedContractInfo> = new Map();

  constructor(logger: Logger, config: ContractDeploymentConfig) {
    this.logger = logger;
    this.config = config;
  }

  /**
   * Initialize the deployment service with providers
   */
  async initialize(walletProvider: WalletProvider): Promise<void> {
    this.logger.info('Initializing Contract Deployment Service...');
    
    // Setup providers based on configuration
    const publicDataProvider = await indexerPublicDataProvider(
      this.config.indexerUrl,
      this.config.indexerWsUrl
    );

    const proofProvider = httpClientProofProvider(this.config.proofServerUrl);
    
    const zkConfigProvider = await this.getZkConfigProvider();

    this.providers = {
      walletProvider,
      publicDataProvider,
      proofProvider,
      zkConfigProvider
    };

    this.logger.info('Contract Deployment Service initialized');
  }

  /**
   * Deploy a complete DAO with Treasury Management
   * This deploys all three contracts needed for a functional treasury DAO
   */
  async deployTreasuryDAO(
    adminPublicKey?: string,
    initialFunding?: bigint
  ): Promise<TreasuryDAODeployment> {
    this.logger.info('=== Starting Treasury DAO Deployment ===');
    
    try {
      // Step 1: Deploy Funding Shield Token Contract
      this.logger.info('Step 1/3: Deploying Funding Shield Token Contract...');
      const fundingToken = await this.deployFundingShieldToken();
      this.logger.info(`✅ Funding Token deployed at: ${fundingToken.contractAddress}`);
      
      // Step 2: Deploy DAO Vote Token Contract
      this.logger.info('Step 2/3: Deploying DAO Vote Token Contract...');
      const voteToken = await this.deployDaoShieldedToken();
      this.logger.info(`✅ Vote Token deployed at: ${voteToken.contractAddress}`);
      
      // Step 3: Deploy DAO Voting Contract with Treasury
      this.logger.info('Step 3/3: Deploying DAO Voting Contract with Treasury...');
      const daoVoting = await this.deployDaoVotingContract(
        fundingToken.contractAddress,
        voteToken.contractAddress
      );
      this.logger.info(`✅ DAO Voting deployed at: ${daoVoting.contractAddress}`);
      
      // Step 4: Mint initial tokens if requested
      if (initialFunding && initialFunding > 0n) {
        this.logger.info(`Minting initial funding tokens: ${initialFunding}`);
        await this.mintFundingTokens(fundingToken.contractAddress, initialFunding);
      }
      
      const deployment: TreasuryDAODeployment = {
        daoVotingContract: daoVoting,
        fundingTokenContract: fundingToken,
        voteTokenContract: voteToken,
        treasuryAddress: daoVoting.contractAddress // Treasury is part of DAO voting contract
      };
      
      // Save deployment info
      this.saveDeploymentInfo(deployment);
      
      this.logger.info('=== Treasury DAO Deployment Complete ===');
      this.logger.info(`Treasury DAO Address: ${daoVoting.contractAddress}`);
      this.logger.info(`Funding Token: ${fundingToken.contractAddress}`);
      this.logger.info(`Vote Token: ${voteToken.contractAddress}`);
      
      return deployment;
      
    } catch (error) {
      this.logger.error('Treasury DAO deployment failed:', error);
      throw error;
    }
  }

  /**
   * Deploy DAO Voting Contract (includes treasury)
   */
  private async deployDaoVotingContract(
    fundingTokenAddress: string,
    voteTokenAddress: string
  ): Promise<DeployedContractInfo> {
    this.logger.info('Deploying DAO Voting Contract...');
    
    // Use the actual compiled contract from midnight-dao-contract
    const contract = new DaoVoting.Contract(witnesses as any);
    
    // Convert addresses to bytes for contract constructor
    const fundingTokenBytes = this.encodeAddress(fundingTokenAddress);
    const voteTokenBytes = this.encodeAddress(voteTokenAddress);
    
    const deployment = await deployContract(this.providers, {
      contract,
      privateStateId: 'daoVotingPrivateState',
      initialPrivateState: {},
      args: [
        { bytes: fundingTokenBytes },
        { bytes: voteTokenBytes }
      ]
    });
    
    const info: DeployedContractInfo = {
      contractAddress: deployment.deployTxData.public.contractAddress,
      contractType: 'DaoVoting',
      deploymentTxId: deployment.deployTxData.public.txId,
      deploymentBlock: deployment.deployTxData.public.blockHeight,
      deploymentTimestamp: new Date(),
      zkConfigPath: this.getZkConfigPath('dao-voting')
    };
    
    this.deployedContracts.set(info.contractAddress, info);
    return info;
  }

  /**
   * Deploy Funding Shield Token Contract
   */
  private async deployFundingShieldToken(): Promise<DeployedContractInfo> {
    this.logger.info('Deploying Funding Shield Token Contract...');
    
    const contract = new FundingShieldToken.Contract(witnesses as any);
    
    const deployment = await deployContract(this.providers, {
      contract,
      privateStateId: 'fundingTokenPrivateState',
      initialPrivateState: {},
      args: [new Uint8Array(32).fill(0)] // initNonce
    });
    
    const info: DeployedContractInfo = {
      contractAddress: deployment.deployTxData.public.contractAddress,
      contractType: 'FundingShieldToken',
      deploymentTxId: deployment.deployTxData.public.txId,
      deploymentBlock: deployment.deployTxData.public.blockHeight,
      deploymentTimestamp: new Date(),
      zkConfigPath: this.getZkConfigPath('funding-shield-token')
    };
    
    this.deployedContracts.set(info.contractAddress, info);
    return info;
  }

  /**
   * Deploy DAO Shielded Token Contract (for voting)
   */
  private async deployDaoShieldedToken(): Promise<DeployedContractInfo> {
    this.logger.info('Deploying DAO Shielded Token Contract...');
    
    const contract = new DaoShieldedToken.Contract(witnesses as any);
    
    // Generate a random nonce for token initialization
    const initNonce = crypto.randomBytes(32);
    
    const deployment = await deployContract(this.providers, {
      contract,
      privateStateId: 'daoVoteTokenPrivateState',
      initialPrivateState: {},
      args: [initNonce] // Pass init nonce for vote token
    });
    
    const info: DeployedContractInfo = {
      contractAddress: deployment.deployTxData.public.contractAddress,
      contractType: 'DaoShieldedToken',
      deploymentTxId: deployment.deployTxData.public.txId,
      deploymentBlock: deployment.deployTxData.public.blockHeight,
      deploymentTimestamp: new Date(),
      zkConfigPath: this.getZkConfigPath('dao-shielded-token')
    };
    
    this.deployedContracts.set(info.contractAddress, info);
    return info;
  }

  /**
   * Deploy Marketplace Registry Contract
   */
  async deployMarketplaceRegistry(): Promise<DeployedContractInfo> {
    this.logger.info('Deploying Marketplace Registry Contract...');
    
    const contract = new MarketplaceRegistry.Contract(witnesses as any);
    
    const deployment = await deployContract(this.providers, {
      contract,
      privateStateId: 'marketplaceRegistryPrivateState',
      initialPrivateState: {}
    });
    
    const info: DeployedContractInfo = {
      contractAddress: deployment.deployTxData.public.contractAddress,
      contractType: 'MarketplaceRegistry',
      deploymentTxId: deployment.deployTxData.public.txId,
      deploymentBlock: deployment.deployTxData.public.blockHeight,
      deploymentTimestamp: new Date(),
      zkConfigPath: this.getZkConfigPath('marketplace-registry')
    };
    
    this.deployedContracts.set(info.contractAddress, info);
    return info;
  }

  /**
   * Join an existing deployed contract
   */
  async joinExistingContract(
    contractAddress: string,
    contractType: 'DaoVoting' | 'FundingToken' | 'VoteToken' | 'MarketplaceRegistry'
  ): Promise<any> {
    this.logger.info(`Joining existing ${contractType} at ${contractAddress}...`);
    
    let contract: any;
    let privateStateId: string;
    
    switch (contractType) {
      case 'DaoVoting':
        contract = new DaoVoting.Contract(witnesses as any);
        privateStateId = 'daoVotingPrivateState';
        break;
      case 'FundingToken':
        contract = new FundingShieldToken.Contract(witnesses as any);
        privateStateId = 'fundingTokenPrivateState';
        break;
      case 'VoteToken':
        contract = new DaoShieldedToken.Contract(witnesses as any);
        privateStateId = 'voteTokenPrivateState';
        break;
      case 'MarketplaceRegistry':
        contract = new MarketplaceRegistry.Contract(witnesses as any);
        privateStateId = 'marketplaceRegistryPrivateState';
        break;
      default:
        throw new Error(`Unknown contract type: ${contractType}`);
    }
    
    const deployedContract = await findDeployedContract(this.providers, {
      contractAddress,
      contract,
      privateStateId,
      initialPrivateState: {}
    });
    
    this.logger.info(`Successfully joined ${contractType} contract`);
    return deployedContract;
  }

  /**
   * Mint funding tokens (admin operation)
   */
  private async mintFundingTokens(
    tokenContractAddress: string,
    amount: bigint
  ): Promise<void> {
    this.logger.info(`Minting ${amount} funding tokens...`);
    
    const contract = await this.joinExistingContract(tokenContractAddress, 'FundingToken');
    const tx = await contract.callTx.mint();
    
    this.logger.info(`Tokens minted. Tx: ${tx.public.txId}`);
  }

  /**
   * Get ZK config provider for contracts
   */
  private async getZkConfigProvider(): Promise<any> {
    // Use local contracts path in dao integration
    const zkConfigBasePath = path.resolve(
      process.cwd(),
      'src/integrations/dao/contract/managed'
    );
    
    return new NodeZkConfigProvider(zkConfigBasePath);
  }

  /**
   * Get ZK config path for specific contract
   */
  private getZkConfigPath(contractName: string): string {
    // Check if it's a marketplace contract
    if (contractName === 'marketplace-registry') {
      return path.resolve(
        process.cwd(),
        `src/integrations/marketplace/contract/managed/${contractName}/zkir`
      );
    }
    // Otherwise it's a DAO contract
    return path.resolve(
      process.cwd(),
      `src/integrations/dao/contract/managed/${contractName}/zkir`
    );
  }

  /**
   * Encode address to bytes for contract
   */
  private encodeAddress(address: string): Uint8Array {
    // Remove 0x prefix if present
    const cleanAddress = address.startsWith('0x') ? address.slice(2) : address;
    return new Uint8Array(Buffer.from(cleanAddress, 'hex'));
  }

  /**
   * Save deployment info to file for persistence
   */
  private saveDeploymentInfo(deployment: TreasuryDAODeployment): void {
    const deploymentFile = path.resolve(
      process.cwd(),
      '../../deployments',
      `treasury-dao-${Date.now()}.json`
    );
    
    // Create deployments directory if it doesn't exist
    const dir = path.dirname(deploymentFile);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    
    fs.writeFileSync(deploymentFile, JSON.stringify(deployment, null, 2));
    this.logger.info(`Deployment info saved to: ${deploymentFile}`);
  }

  /**
   * Get all deployed contracts
   */
  getDeployedContracts(): DeployedContractInfo[] {
    return Array.from(this.deployedContracts.values());
  }

  /**
   * Get specific deployed contract info
   */
  getDeployedContract(address: string): DeployedContractInfo | undefined {
    return this.deployedContracts.get(address);
  }
}