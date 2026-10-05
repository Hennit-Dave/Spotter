import { describe, expect, it } from 'vitest';
import {
  ATTEMPT_LIMIT,
  ATTEMPT_WINDOW_MS,
  isPaused,
  recordFailure,
  type AttemptStore,
} from './throttle';

type Row = { kind: string; key: string; createdAt: Date };

function fakeStore(rows: Row[]): AttemptStore {
  return {
    failedAttempt: {
      async count({ where }) {
        return rows.filter(
          (r) =>
            r.kind === where.kind &&
            r.key === where.key &&
            r.createdAt > where.createdAt.gt,
        ).length;
      },
      async create({ data }) {
        rows.push({ ...data, createdAt: new Date() });
        return null;
      },
    },
  };
}

const NOW = new Date('2026-10-05T12:00:00Z');
const at = (msAgo: number) => new Date(NOW.getTime() - msAgo);

describe('isPaused', () => {
  it('is not paused below the limit', async () => {
    const rows = Array.from({ length: ATTEMPT_LIMIT - 1 }, () => ({
      kind: 'ADMIN_LOGIN',
      key: 'a@b.co',
      createdAt: at(1000),
    }));
    expect(await isPaused(fakeStore(rows), 'ADMIN_LOGIN', 'a@b.co', NOW)).toBe(false);
  });

  it('is paused at the limit inside the window', async () => {
    const rows = Array.from({ length: ATTEMPT_LIMIT }, () => ({
      kind: 'ADMIN_LOGIN',
      key: 'a@b.co',
      createdAt: at(1000),
    }));
    expect(await isPaused(fakeStore(rows), 'ADMIN_LOGIN', 'a@b.co', NOW)).toBe(true);
  });

  it('ignores failures older than the window', async () => {
    const rows = Array.from({ length: ATTEMPT_LIMIT }, () => ({
      kind: 'ADMIN_LOGIN',
      key: 'a@b.co',
      createdAt: at(ATTEMPT_WINDOW_MS + 1000),
    }));
    expect(await isPaused(fakeStore(rows), 'ADMIN_LOGIN', 'a@b.co', NOW)).toBe(false);
  });

  it('keeps kinds and emails apart', async () => {
    const rows = Array.from({ length: ATTEMPT_LIMIT }, () => ({
      kind: 'MEMBER_LOGIN',
      key: 'a@b.co',
      createdAt: at(1000),
    }));
    const store = fakeStore(rows);
    expect(await isPaused(store, 'ADMIN_LOGIN', 'a@b.co', NOW)).toBe(false);
    expect(await isPaused(store, 'MEMBER_LOGIN', 'other@b.co', NOW)).toBe(false);
    expect(await isPaused(store, 'MEMBER_LOGIN', 'a@b.co', NOW)).toBe(true);
  });
});

describe('recordFailure', () => {
  it('writes one row per failure', async () => {
    const rows: Row[] = [];
    await recordFailure(fakeStore(rows), 'ADMIN_LOGIN', 'a@b.co');
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ kind: 'ADMIN_LOGIN', key: 'a@b.co' });
  });
});
