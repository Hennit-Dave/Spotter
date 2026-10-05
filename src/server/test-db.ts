import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../../generated/prisma/client';

// Neon gives every branch its own endpoint. This returns that endpoint's name, with the
// pooler marker removed, so the pooled and direct strings of one branch compare as equal.
export function endpointOf(connectionString: string): string {
  const host = new URL(connectionString).host;
  return host.split('.')[0].replace(/-pooler$/, '');
}

// Database-backed tests may write, so this refuses to hand out a connection unless it is
// sure the string is not the main branch. AGENTS.md allows writes to the test branch only.
export function assertSafeTestUrl(
  testUrl: string | undefined,
  protectedUrls: Array<string | undefined>,
  nodeEnv: string | undefined,
): string {
  if (!testUrl) {
    throw new Error('TEST_DATABASE_URL is not set. Database-backed tests need the Neon test branch.');
  }
  if (nodeEnv === 'production') {
    throw new Error('Database-backed tests never run in production.');
  }
  const testEndpoint = endpointOf(testUrl);
  for (const url of protectedUrls) {
    if (url && endpointOf(url) === testEndpoint) {
      throw new Error(
        'TEST_DATABASE_URL points at the same database endpoint as DATABASE_URL or DIRECT_URL. Refusing to write.',
      );
    }
  }
  return testUrl;
}

export function getTestConnectionString(): string {
  return assertSafeTestUrl(
    process.env.TEST_DATABASE_URL,
    [process.env.DATABASE_URL, process.env.DIRECT_URL],
    process.env.NODE_ENV,
  );
}

export function getTestDb(): PrismaClient {
  return new PrismaClient({
    adapter: new PrismaPg({ connectionString: getTestConnectionString() }),
    transactionOptions: { maxWait: 10_000, timeout: 10_000 },
  });
}
