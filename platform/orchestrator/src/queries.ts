import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Running database queries...');
  
  try {
    // Create a test bot
    const bot = await prisma.bot.create({
      data: {
        name: 'Test Bot',
        userId: 'test-user-001',
        tenantId: 'tenant-001',
        walletAddress: 'mn1qtest123456789abcdefghijklmnopqrstuvwxyz',
        walletPort: 3003,
        status: 'active',
        features: {
          wallet: true,
          dao: true,
          marketplace: false
        },
        platforms: {
          discord: { token: 'test-discord-token' }
        }
      }
    });
    
    console.log('Created bot:', bot);
    
    // List all bots
    const allBots = await prisma.bot.findMany();
    console.log('All bots:', allBots);
    
  } catch (error) {
    console.error('Error running queries:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch(console.error);