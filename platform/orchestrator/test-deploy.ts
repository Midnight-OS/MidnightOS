#!/usr/bin/env tsx

/**
 * Test contract deployment through orchestrator
 */

import { PlatformContractDeployer } from './src/contractDeployer.js';

async function testDeploy() {
  console.log('Testing contract deployment through orchestrator...\n');
  
  // Import and initialize admin wallet
  const { adminWallet } = await import('./src/adminWallet.js');
  console.log('💰 Initializing admin wallet...');
  await adminWallet.initialize();
  
  const deployer = new PlatformContractDeployer();
  const testTenantId = `test-tenant-${Date.now()}`;
  
  try {
    console.log(`🚀 Deploying contracts for tenant: ${testTenantId}`);
    console.log('Network: Undeployed (local standalone)');
    console.log('Auto-funding: enabled (from genesis wallet)\n');
    
    const result = await deployer.deployContractsForTenant(
      testTenantId,
      'Undeployed',
      true // auto-fund enabled - will fund from genesis wallet
    );
    
    console.log('\n✅ Deployment successful!\n');
    console.log('📦 Deployed Contracts:');
    console.log(`  - Funding Token: ${result.fundingToken}`);
    console.log(`  - Vote Token: ${result.voteToken}`);
    console.log(`  - DAO Voting: ${result.daoVoting}`);
    console.log(`  - Marketplace: ${result.marketplace}`);
    console.log(`  - User Address: ${result.address}`);
    
    // Check if DAO config was generated
    const daoConfig = await deployer.generateDaoConfig(testTenantId);
    if (daoConfig) {
      console.log(`\n🏛️  DAO Configuration:`);
      console.log(`  ${daoConfig}`);
    }
    
    console.log('\n✨ Test completed successfully!');
    
  } catch (error) {
    console.error('\n❌ Deployment failed:', error);
    process.exit(1);
  }
}

testDeploy().catch(console.error);