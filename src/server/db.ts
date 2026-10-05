import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../../generated/prisma/client';

const globalForDb = globalThis as unknown as { spotterDb?: PrismaClient };

function createClient(): PrismaClient {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('DATABASE_URL is not set');
  }
  return new PrismaClient({
    adapter: new PrismaPg({ connectionString }),
    // Prisma waits 2 seconds by default for a transaction to get a connection. The first
    // request after the Neon database has been idle takes longer than that (PRD 8.4).
    transactionOptions: { maxWait: 10_000, timeout: 10_000 },
  });
}

// One client per server instance, created on first use and reused. Kept on globalThis so
// development hot reloads do not open a new connection pool each time.
export function getDb(): PrismaClient {
  globalForDb.spotterDb ??= createClient();
  return globalForDb.spotterDb;
}
