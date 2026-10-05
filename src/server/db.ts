import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../../generated/prisma/client';

const globalForDb = globalThis as unknown as { spotterDb?: PrismaClient };

function createClient(): PrismaClient {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('DATABASE_URL is not set');
  }
  return new PrismaClient({ adapter: new PrismaPg({ connectionString }) });
}

// One client per server instance, created on first use and reused. Kept on globalThis so
// development hot reloads do not open a new connection pool each time.
export function getDb(): PrismaClient {
  globalForDb.spotterDb ??= createClient();
  return globalForDb.spotterDb;
}
