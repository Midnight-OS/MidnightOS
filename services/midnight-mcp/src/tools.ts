/* istanbul ignore file */
import { McpError, ErrorCode } from "@modelcontextprotocol/sdk/types.js";
import { httpClient } from './utils/http-client.js';

// Define tools with their schemas
export const ALL_TOOLS = [
  // Midnight wallet tools
  {
    name: "walletStatus",
    description: "Get the current status of the wallet",
    inputSchema: {
      type: "object",
      properties: {},
      required: []
    },
  },
  {
    name: "walletAddress",
    description: "Get the wallet address",
    inputSchema: {
      type: "object",
      properties: {},
      required: []
    },
  },
  {
    name: "walletBalance",
    description: "Get the current balance of the wallet",
    inputSchema: {
      type: "object",
      properties: {},
      required: []
    },
  },
  {
    name: "send",
    description: "Send funds or tokens to another wallet address. Can send native tokens (tDUST) or shielded tokens by name/symbol",
    inputSchema: {
      type: "object",
      properties: {
        destinationAddress: { type: "string" },
        amount: { type: "string" },
        token: { type: "string", description: "Token name, symbol, or 'native'/'tDUST' for native tokens. If not specified, defaults to native tokens." }
      },
      required: ["destinationAddress", "amount"]
    }
  },
  {
    name: "verifyTransaction",
    description: "Verify if a transaction has been received",
    inputSchema: {
      type: "object",
      properties: {
        identifier: { type: "string" }
      },
      required: ["identifier"]
    }
  },
  {
    name: "getTransactionStatus",
    description: "Get the status of a transaction by ID",
    inputSchema: {
      type: "object",
      properties: {
        transactionId: { type: "string" }
      },
      required: ["transactionId"]
    }
  },
  {
    name: "getTransactions",
    description: "Get all transactions, optionally filtered by state",
    inputSchema: {
      type: "object",
      properties: {},
      required: []
    }
  },
  {
    name:"getWalletConfig",
    description: "Get the configuration of the wallet NODE and Indexer",
    inputSchema: {
      type: "object",
      properties: {},
      required: []
    },
  },
  // Token balance tool
  {
    name: "getTokenBalance",
    description: "Get the balance of a specific token by name or symbol. Use 'native' or 'tDUST' for native tokens",
    inputSchema: {
      type: "object",
      properties: {
        tokenName: { type: "string" }
      },
      required: ["tokenName"]
    }
  },
  // Marketplace tools
  {
    name: "registerInMarketplace",
    description: "Register a user in the marketplace",
    inputSchema: {
      type: "object",
      properties: {
        userId: { type: "string" },
        userData: { type: "object" }
      },
      required: ["userId", "userData"]
    }
  },
  {
    name: "verifyUserInMarketplace",
    description: "Verify a user in the marketplace",
    inputSchema: {
      type: "object",
      properties: {
        userId: { type: "string" },
        verificationData: { type: "object" }
      },
      required: ["userId", "verificationData"]
    }
  },
  // DAO tools
  {
    name: "openDaoElection",
    description: "Open a new election in the DAO voting contract. DAO configuration is set via environment variables.",
    inputSchema: {
      type: "object",
      properties: {
        electionId: { type: "string", description: "Unique identifier for the election" }
      },
      required: ["electionId"]
    }
  },
  {
    name: "closeDaoElection",
    description: "Close the current election in the DAO voting contract. DAO configuration is set via environment variables.",
    inputSchema: {
      type: "object",
      properties: {},
      required: []
    }
  },
  {
    name: "castDaoVote",
    description: "Cast a vote in the DAO election. Accepts natural language vote strings: 'yes', 'no', or 'absence' (case-insensitive). DAO configuration is set via environment variables.",
    inputSchema: {
      type: "object",
      properties: {
        voteType: { 
          type: "string", 
          enum: ["yes", "no", "absence"], 
          description: "Type of vote to cast. Must be one of: 'yes' (vote for), 'no' (vote against), or 'absence' (abstain/absent). Case-insensitive." 
        }
      },
      required: ["voteType"]
    }
  },
  {
    name: "fundDaoTreasury",
    description: "Fund the DAO treasury with tokens. DAO configuration is set via environment variables.",
    inputSchema: {
      type: "object",
      properties: {
        amount: { type: "string", description: "Amount to fund the treasury" }
      },
      required: ["amount"]
    }
  },
  {
    name: "payoutDaoProposal",
    description: "Payout an approved proposal from the DAO treasury. DAO configuration is set via environment variables.",
    inputSchema: {
      type: "object",
      properties: {},
      required: []
    }
  },
  {
    name: "getDaoElectionStatus",
    description: "Get the current status of the DAO election. DAO configuration is set via environment variables.",
    inputSchema: {
      type: "object",
      properties: {},
      required: []
    }
  },
  {
    name: "getDaoState",
    description: "Get the full state of the DAO voting contract. DAO configuration is set via environment variables.",
    inputSchema: {
      type: "object",
      properties: {},
      required: []
    }
  },
  // Enhanced Treasury Management Tools
  {
    name: "createTreasuryProposal",
    description: "Create a new treasury funding proposal with description, amount, and recipient",
    inputSchema: {
      type: "object",
      properties: {
        description: { type: "string", description: "Description of the proposal" },
        amount: { type: "string", description: "Amount of tokens requested" },
        recipient: { type: "string", description: "Recipient address for the funds" }
      },
      required: ["description", "amount", "recipient"]
    }
  },
  {
    name: "getTreasuryProposals",
    description: "Get list of all treasury proposals, optionally filtered by status",
    inputSchema: {
      type: "object",
      properties: {
        status: { 
          type: "string", 
          enum: ["pending", "voting", "approved", "rejected", "paid"],
          description: "Filter proposals by status (optional)" 
        }
      }
    }
  },
  {
    name: "getTreasuryAnalytics",
    description: "Get treasury analytics including total value, inflow/outflow, and approval rates",
    inputSchema: {
      type: "object",
      properties: {}
    }
  },
  {
    name: "deployTreasuryDAO",
    description: "Deploy a new DAO with advanced treasury management capabilities",
    inputSchema: {
      type: "object",
      properties: {
        fundingTokenAddress: { type: "string", description: "Address of the funding token contract" },
        voteTokenAddress: { type: "string", description: "Address of the voting token contract" },
        minVotesForApproval: { type: "number", description: "Minimum votes required for proposal approval" }
      },
      required: ["fundingTokenAddress", "voteTokenAddress"]
    }
  },
  {
    name: "getTreasuryBalance",
    description: "Get detailed treasury balance including pending and available funds",
    inputSchema: {
      type: "object",
      properties: {}
    }
  },
  // Contract Deployment Tools - Deploy REAL contracts to Midnight blockchain
  {
    name: "deployFullTreasuryDAO",
    description: "Deploy a complete DAO with treasury, funding tokens, and voting tokens to Midnight blockchain. This deploys 3 real contracts!",
    inputSchema: {
      type: "object",
      properties: {
        initialFunding: { type: "string", description: "Initial funding amount to mint (optional)" },
        adminPublicKey: { type: "string", description: "Admin public key (optional)" }
      }
    }
  },
  {
    name: "joinExistingDAO",
    description: "Join an already deployed DAO contract to interact with it",
    inputSchema: {
      type: "object",
      properties: {
        daoAddress: { type: "string", description: "Address of the DAO voting contract" },
        fundingTokenAddress: { type: "string", description: "Address of the funding token contract" },
        voteTokenAddress: { type: "string", description: "Address of the vote token contract" }
      },
      required: ["daoAddress"]
    }
  },
  {
    name: "verifyContractDeployment",
    description: "Verify that a contract is properly deployed and accessible on Midnight blockchain",
    inputSchema: {
      type: "object",
      properties: {
        contractAddress: { type: "string", description: "Address of the contract to verify" }
      },
      required: ["contractAddress"]
    }
  }
];

// Create a singleton wallet service instance for tools
let walletServiceInstance: any = null;

async function getWalletService() {
  if (!walletServiceInstance) {
    const { WalletServiceMCP } = await import('./mcp/index.js');
    const { config } = await import('./config.js');
    const { SeedManager } = await import('./utils/seed-manager.js');
    
    // Use static method to get agent seed
    const seed = SeedManager.getAgentSeed(config.agentId);
    
    walletServiceInstance = new WalletServiceMCP(
      config.networkId,
      seed,
      config.walletFilename,
      config
    );
  }
  return walletServiceInstance;
}

// Define tool handlers
export async function handleToolCall(toolName: string, toolArgs: any, log: (...args: any[]) => void) {
  try {
    switch (toolName) {
      // Midnight wallet tool handlers
      case "walletStatus":
        const status = await httpClient.get('/wallet/status');
        return {
          "content": [
            {
              "type": "text",
              "text": JSON.stringify(status, null, 2),
              "mimeType": "application/json"
            }
          ]
        };
        
      case "walletAddress":
        const address = await httpClient.get('/wallet/address');
        return {
          "content": [
            {
              "type": "text",
              "text": JSON.stringify(address, null, 2),
              "mimeType": "application/json"
            }
          ]
        };
        
      case "walletBalance":
        const balance = await httpClient.get('/wallet/balance');
        return {
          "content": [
            {
              "type": "text",
              "text": JSON.stringify(balance, null, 2),
              "mimeType": "application/json"
            }
          ]
        };
        
      case "send":
        const { destinationAddress, amount: sendAmount, token } = toolArgs;
        if (!destinationAddress || !sendAmount) {
          throw new McpError(
            ErrorCode.InvalidParams,
            "Missing required parameters: destinationAddress and amount"
          );
        }
        
        // Determine if this is a native token or shielded token
        const isNativeToken = !token || 
          token.toLowerCase() === 'native' || 
          token.toLowerCase() === 'tdust' || 
          token.toLowerCase() === 'dust';
        
        if (isNativeToken) {
          // Send native tokens
          const sendResult = await httpClient.post('/wallet/send', { destinationAddress, amount: sendAmount });
          return {
            "content": [
              {
                "type": "text",
                "text": JSON.stringify(sendResult, null, 2),
                "mimeType": "application/json"
              }
            ]
          };
        } else {
          // Send shielded tokens
          const sendTokenResult = await httpClient.post('/wallet/tokens/send', { 
            tokenName: token, 
            toAddress: destinationAddress, 
            amount: sendAmount 
          });
          return {
            "content": [
              {
                "type": "text",
                "text": JSON.stringify(sendTokenResult, null, 2),
                "mimeType": "application/json"
              }
            ]
          };
        }
        
      case "verifyTransaction":
        const { identifier } = toolArgs;
        if (!identifier) {
          throw new McpError(
            ErrorCode.InvalidParams,
            "Missing required parameter: identifier"
          );
        }
        const txVerifyResult = await httpClient.post('/wallet/verify-transaction', { identifier });
        return {
          "content": [
            {
              "type": "text",
              "text": JSON.stringify(txVerifyResult, null, 2),
              "mimeType": "application/json"
            }
          ]
        };
        
      case "getTransactionStatus":
        const { transactionId } = toolArgs;
        if (!transactionId) {
          throw new McpError(
            ErrorCode.InvalidParams,
            "Missing required parameter: transactionId"
          );
        }
        const statusResult = await httpClient.get(`/wallet/transaction/${transactionId}`);
        return {
          "content": [
            {
              "type": "text",
              "text": JSON.stringify(statusResult, null, 2),
              "mimeType": "application/json"
            }
          ]
        };
        
      case "getTransactions":
        const transactions = await httpClient.get('/wallet/transactions');
        return {
          "content": [
            {
              "type": "text",
              "text": JSON.stringify(transactions, null, 2),
              "mimeType": "application/json"
            }
          ]
        };
        
      case "getPendingTransactions":
        const pendingTransactions = await httpClient.get('/wallet/pending-transactions');
        return {
          "content": [
            {
              "type": "text",
              "text": JSON.stringify(pendingTransactions, null, 2),
              "mimeType": "application/json"
            }
          ]
        };
      
      case "getWalletConfig":
        const config = await httpClient.get('/wallet/config');
        return {
          "content": [
            {
              "type": "text",
              "text": JSON.stringify(config, null, 2),
              "mimeType": "application/json"
            }
          ]
        };
        
      // Token balance tool handler
      case "getTokenBalance":
        const { tokenName: balanceTokenName } = toolArgs;
        if (!balanceTokenName) {
          throw new McpError(
            ErrorCode.InvalidParams,
            "Missing required parameter: tokenName"
          );
        }
        
        // Check if this is a native token request
        const isNativeTokenBalance = balanceTokenName.toLowerCase() === 'native' || 
          balanceTokenName.toLowerCase() === 'tdust' || 
          balanceTokenName.toLowerCase() === 'dust';
        
        if (isNativeTokenBalance) {
          // Get native token balance
          const nativeBalance = await httpClient.get('/wallet/balance');
          return {
            "content": [
              {
                "type": "text",
                "text": JSON.stringify(nativeBalance, null, 2),
                "mimeType": "application/json"
              }
            ]
          };
        } else {
          // Get shielded token balance
          const tokenBalance = await httpClient.get(`/wallet/tokens/balance/${balanceTokenName}`);
          return {
            "content": [
              {
                "type": "text",
                "text": JSON.stringify(tokenBalance, null, 2),
                "mimeType": "application/json"
              }
            ]
          };
        }
      
      // Marketplace tool handlers
      case "registerInMarketplace":
        const { userId, userData } = toolArgs;
        if (!userId || !userData) {
          throw new McpError(
            ErrorCode.InvalidParams,
            "Missing required parameters: userId and userData"
          );
        }
        const registerResult = await httpClient.post('/marketplace/register', { userId, userData });
        return {
          "content": [
            {
              "type": "text",
              "text": JSON.stringify(registerResult, null, 2),
              "mimeType": "application/json"
            }
          ]
        };
      
      case "verifyUserInMarketplace":
        const { userId: verifyUserId, verificationData } = toolArgs;
        if (!verifyUserId || !verificationData) {
          throw new McpError(
            ErrorCode.InvalidParams,
            "Missing required parameters: userId and verificationData"
          );
        }
        const verifyUserResult = await httpClient.post('/marketplace/verify', { userId: verifyUserId, verificationData });
        return {
          "content": [
            {
              "type": "text",
              "text": JSON.stringify(verifyUserResult, null, 2),
              "mimeType": "application/json"
            }
          ]
        };
      
      // DAO tool handlers
      case "openDaoElection":
        const { electionId } = toolArgs;
        if (!electionId) {
          throw new McpError(
            ErrorCode.InvalidParams,
            "Missing required parameter: electionId"
          );
        }
        const openElectionResult = await httpClient.post('/dao/open-election', { electionId });
        return {
          "content": [
            {
              "type": "text",
              "text": JSON.stringify(openElectionResult, null, 2),
              "mimeType": "application/json"
            }
          ]
        };
      
      case "closeDaoElection":
        const closeElectionResult = await httpClient.post('/dao/close-election', {});
        return {
          "content": [
            {
              "type": "text",
              "text": JSON.stringify(closeElectionResult, null, 2),
              "mimeType": "application/json"
            }
          ]
        };
      
      case "castDaoVote":
        const { voteType } = toolArgs;
        if (!voteType) {
          throw new McpError(
            ErrorCode.InvalidParams,
            "Missing required parameter: voteType"
          );
        }
        const castVoteResult = await httpClient.post('/dao/cast-vote', { voteType });
        return {
          "content": [
            {
              "type": "text",
              "text": JSON.stringify(castVoteResult, null, 2),
              "mimeType": "application/json"
            }
          ]
        };
      
      case "fundDaoTreasury":
        const { amount: fundAmount } = toolArgs;
        if (!fundAmount) {
          throw new McpError(
            ErrorCode.InvalidParams,
            "Missing required parameter: amount"
          );
        }
        const fundTreasuryResult = await httpClient.post('/dao/fund-treasury', { amount: fundAmount });
        return {
          "content": [
            {
              "type": "text",
              "text": JSON.stringify(fundTreasuryResult, null, 2),
              "mimeType": "application/json"
            }
          ]
        };
      
      case "payoutDaoProposal":
        const payoutResult = await httpClient.post('/dao/payout-proposal', {});
        return {
          "content": [
            {
              "type": "text",
              "text": JSON.stringify(payoutResult, null, 2),
              "mimeType": "application/json"
            }
          ]
        };
      
      case "getDaoElectionStatus":
        const electionStatusResult = await httpClient.get('/dao/election-status');
        return {
          "content": [
            {
              "type": "text",
              "text": JSON.stringify(electionStatusResult, null, 2),
              "mimeType": "application/json"
            }
          ]
        };
      
      case "getDaoState":
        const daoStateResult = await httpClient.get('/dao/state');
        return {
          "content": [
            {
              "type": "text",
              "text": JSON.stringify(daoStateResult, null, 2),
              "mimeType": "application/json"
            }
          ]
        };
      
      // Enhanced Treasury Management Tool Handlers
      case "createTreasuryProposal":
        const { description, amount: proposalAmount, recipient } = toolArgs;
        if (!description || !proposalAmount || !recipient) {
          throw new McpError(
            ErrorCode.InvalidParams,
            "Missing required parameters: description, amount, recipient"
          );
        }
        const proposalResult = await httpClient.post('/treasury/create-proposal', {
          description,
          amount: proposalAmount,
          recipient
        });
        return {
          "content": [
            {
              "type": "text",
              "text": JSON.stringify(proposalResult, null, 2),
              "mimeType": "application/json"
            }
          ]
        };
      
      case "getTreasuryProposals":
        const { status: proposalStatus } = toolArgs;
        const proposalsResult = await httpClient.get(
          proposalStatus ? `/treasury/proposals?status=${proposalStatus}` : '/treasury/proposals'
        );
        return {
          "content": [
            {
              "type": "text",
              "text": JSON.stringify(proposalsResult, null, 2),
              "mimeType": "application/json"
            }
          ]
        };
      
      case "getTreasuryAnalytics":
        const analyticsResult = await httpClient.get('/treasury/analytics');
        return {
          "content": [
            {
              "type": "text",
              "text": JSON.stringify(analyticsResult, null, 2),
              "mimeType": "application/json"
            }
          ]
        };
      
      case "getTreasuryBalance":
        const balanceResult = await httpClient.get('/treasury/balance');
        return {
          "content": [
            {
              "type": "text",
              "text": JSON.stringify(balanceResult, null, 2),
              "mimeType": "application/json"
            }
          ]
        };
      
      // Contract Deployment Tool Handlers - REAL blockchain deployment
      case "deployFullTreasuryDAO":
        log("🚀 DEPLOYING REAL DAO CONTRACTS TO MIDNIGHT BLOCKCHAIN...");
        const { initialFunding, adminPublicKey } = toolArgs;
        
        // Import and use deployment service
        const { ContractDeploymentToolHandlers } = await import('./integrations/treasury-deployment-tools.js');
        const walletService = await getWalletService();
        const deploymentHandler = new ContractDeploymentToolHandlers(walletService);
        
        const deployResult = await deploymentHandler.handleDeploymentTool('deployFullTreasuryDAO', {
          initialFunding,
          adminPublicKey
        });
        
        return {
          "content": [
            {
              "type": "text",
              "text": JSON.stringify(deployResult, null, 2),
              "mimeType": "application/json"
            }
          ]
        };
      
      case "joinExistingDAO":
        const { daoAddress, fundingTokenAddress, voteTokenAddress } = toolArgs;
        if (!daoAddress) {
          throw new McpError(
            ErrorCode.InvalidParams,
            "Missing required parameter: daoAddress"
          );
        }
        
        const { ContractDeploymentToolHandlers: JoinHandlers } = await import('./integrations/treasury-deployment-tools.js');
        const ws2 = await getWalletService();
        const joinHandler = new JoinHandlers(ws2);
        
        const joinResult = await joinHandler.handleDeploymentTool('joinExistingDAO', {
          daoAddress,
          fundingTokenAddress,
          voteTokenAddress
        });
        
        return {
          "content": [
            {
              "type": "text",
              "text": JSON.stringify(joinResult, null, 2),
              "mimeType": "application/json"
            }
          ]
        };
      
      case "verifyContractDeployment":
        const { contractAddress } = toolArgs;
        if (!contractAddress) {
          throw new McpError(
            ErrorCode.InvalidParams,
            "Missing required parameter: contractAddress"
          );
        }
        
        const { ContractDeploymentToolHandlers: VerifyHandlers } = await import('./integrations/treasury-deployment-tools.js');
        const ws3 = await getWalletService();
        const verifyHandler = new VerifyHandlers(ws3);
        
        const contractVerifyResult = await verifyHandler.handleDeploymentTool('verifyContractDeployment', {
          contractAddress
        });
        
        return {
          "content": [
            {
              "type": "text",
              "text": JSON.stringify(contractVerifyResult, null, 2),
              "mimeType": "application/json"
            }
          ]
        };
      
      case "deployTreasuryDAO":
        // Legacy deployment tool - redirect to new full deployment
        const { fundingTokenAddress: ftAddr, voteTokenAddress: vtAddr, minVotesForApproval } = toolArgs;
        if (!ftAddr || !vtAddr) {
          throw new McpError(
            ErrorCode.InvalidParams,
            "Missing required parameters: fundingTokenAddress, voteTokenAddress"
          );
        }
        
        // Use the full deployment for new DAOs
        log("Note: Using deployFullTreasuryDAO for complete contract deployment");
        const { ContractDeploymentToolHandlers: LegacyHandlers } = await import('./integrations/treasury-deployment-tools.js');
        const ws4 = await getWalletService();
        const legacyHandler = new LegacyHandlers(ws4);
        
        const legacyResult = await legacyHandler.handleDeploymentTool('deployFullTreasuryDAO', {
          initialFunding: "0"
        });
        
        return {
          "content": [
            {
              "type": "text",
              "text": JSON.stringify(legacyResult, null, 2),
              "mimeType": "application/json"
            }
          ]
        };
      
      default:
        throw new McpError(
          ErrorCode.InvalidParams,
          `Unknown tool: ${toolName}`
        );
    }
  } catch (error) {
    log(`Error handling tool call for ${toolName}:`, error);
    throw error;
  }
}
