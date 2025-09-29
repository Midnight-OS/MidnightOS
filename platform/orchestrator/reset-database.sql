-- Drop all tables in the correct order (respecting foreign key constraints)
DROP TABLE IF EXISTS "CommandLog" CASCADE;
DROP TABLE IF EXISTS "Transaction" CASCADE;
DROP TABLE IF EXISTS "Bot" CASCADE;
DROP TABLE IF EXISTS "ApiKey" CASCADE;
DROP TABLE IF EXISTS "User" CASCADE;

-- Drop any remaining tables that might exist
DROP TABLE IF EXISTS "_prisma_migrations" CASCADE;

-- Now the database is completely clean and ready for fresh schema