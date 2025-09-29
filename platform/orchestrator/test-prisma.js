import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function testConnection() {
  try {
    // Test connection by running a simple query
    await prisma.$queryRaw`SELECT 1`;
    console.log('✅ Prisma connection successful!');
    
    // Try to count users
    const userCount = await prisma.user.count();
    console.log(`Found ${userCount} users in database`);
    
    return true;
  } catch (error) {
    console.error('❌ Prisma connection failed:', error.message);
    return false;
  } finally {
    await prisma.$disconnect();
  }
}

testConnection();