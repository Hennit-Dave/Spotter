import { describe, expect, it } from 'vitest';
import {
  RESET_TOKEN_LIFETIME_MS,
  consumeToken,
  findUsableToken,
  generateToken,
  hashToken,
  issueToken,
  type TokenStore,
} from './tokens';

type Row = {
  accountId: string | null;
  staffId: string | null;
  type: string;
  tokenHash: string;
  expiresAt: Date;
  usedAt: Date | null;
};

function fakeStore(rows: Row[]): TokenStore {
  return {
    emailToken: {
      async create({ data }) {
        rows.push({
          accountId: data.accountId ?? null,
          staffId: data.staffId ?? null,
          type: data.type,
          tokenHash: data.tokenHash,
          expiresAt: data.expiresAt,
          usedAt: null,
        });
        return null;
      },
      async updateMany({ where, data }) {
        let count = 0;
        for (const r of rows) {
          if (
            r.type === where.type &&
            r.usedAt === null &&
            (where.accountId === undefined || r.accountId === where.accountId) &&
            (where.staffId === undefined || r.staffId === where.staffId) &&
            (where.tokenHash === undefined || r.tokenHash === where.tokenHash) &&
            (where.expiresAt === undefined || r.expiresAt > where.expiresAt.gt)
          ) {
            r.usedAt = data.usedAt;
            count++;
          }
        }
        return { count };
      },
      async findFirst({ where }) {
        const r = rows.find(
          (x) =>
            x.tokenHash === where.tokenHash &&
            x.type === where.type &&
            x.usedAt === null &&
            x.expiresAt > where.expiresAt.gt,
        );
        return r ? { accountId: r.accountId, staffId: r.staffId } : null;
      },
    },
  };
}

const NOW = new Date('2026-10-05T12:00:00Z');

describe('tokens', () => {
  it('generates long, different tokens and stores only a hash', async () => {
    expect(generateToken().length).toBeGreaterThanOrEqual(43);
    expect(generateToken()).not.toBe(generateToken());

    const rows: Row[] = [];
    const token = await issueToken(
      fakeStore(rows),
      { staffId: 's1' },
      'RESET',
      RESET_TOKEN_LIFETIME_MS,
      NOW,
    );
    expect(rows).toHaveLength(1);
    expect(rows[0].tokenHash).toBe(hashToken(token));
    expect(rows[0].tokenHash).not.toBe(token);
    expect(rows[0].expiresAt.getTime()).toBe(NOW.getTime() + RESET_TOKEN_LIFETIME_MS);
  });

  it('works once', async () => {
    const store = fakeStore([]);
    const token = await issueToken(store, { staffId: 's1' }, 'RESET', RESET_TOKEN_LIFETIME_MS, NOW);
    expect(await consumeToken(store, token, 'RESET', NOW)).toEqual({
      accountId: null,
      staffId: 's1',
    });
    expect(await consumeToken(store, token, 'RESET', NOW)).toBeNull();
  });

  it('does nothing once it has expired', async () => {
    const store = fakeStore([]);
    const token = await issueToken(store, { staffId: 's1' }, 'RESET', RESET_TOKEN_LIFETIME_MS, NOW);
    const later = new Date(NOW.getTime() + RESET_TOKEN_LIFETIME_MS);
    expect(await findUsableToken(store, token, 'RESET', later)).toBeNull();
    expect(await consumeToken(store, token, 'RESET', later)).toBeNull();
  });

  it('does not work as another type, and unknown tokens do nothing', async () => {
    const store = fakeStore([]);
    const token = await issueToken(store, { staffId: 's1' }, 'RESET', RESET_TOKEN_LIFETIME_MS, NOW);
    expect(await consumeToken(store, token, 'VERIFY', NOW)).toBeNull();
    expect(await consumeToken(store, 'not-a-real-token', 'RESET', NOW)).toBeNull();
  });

  it('ends the older link when a new one is issued', async () => {
    const store = fakeStore([]);
    const first = await issueToken(store, { staffId: 's1' }, 'RESET', RESET_TOKEN_LIFETIME_MS, NOW);
    const second = await issueToken(store, { staffId: 's1' }, 'RESET', RESET_TOKEN_LIFETIME_MS, NOW);
    expect(await consumeToken(store, first, 'RESET', NOW)).toBeNull();
    expect(await consumeToken(store, second, 'RESET', NOW)).not.toBeNull();
  });

  it('does not end another staff member\'s link', async () => {
    const store = fakeStore([]);
    const other = await issueToken(store, { staffId: 's2' }, 'RESET', RESET_TOKEN_LIFETIME_MS, NOW);
    await issueToken(store, { staffId: 's1' }, 'RESET', RESET_TOKEN_LIFETIME_MS, NOW);
    expect(await consumeToken(store, other, 'RESET', NOW)).not.toBeNull();
  });
});
