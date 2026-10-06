import { describe, expect, it } from 'vitest';
import {
  ATTEMPT_LIMIT,
  ATTEMPT_RETENTION_MS,
  ATTEMPT_RULES,
  ATTEMPT_WINDOW_MS,
  isPaused,
  recordFailure,
  takeAttempt,
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
      async deleteMany({ where }) {
        for (let i = rows.length - 1; i >= 0; i--) {
          if (rows[i].createdAt < where.createdAt.lt) rows.splice(i, 1);
        }
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

describe('the password reset email limit', () => {
  const HOUR = 60 * 60 * 1000;

  it('is three per hour, and wrong tries stay at five in ten minutes', () => {
    expect(ATTEMPT_RULES.PASSWORD_RESET_EMAIL).toEqual({ limit: 3, windowMs: HOUR });
    expect(ATTEMPT_RULES.ADMIN_LOGIN).toEqual({ limit: ATTEMPT_LIMIT, windowMs: ATTEMPT_WINDOW_MS });
  });

  it('allows three requests and refuses the fourth', async () => {
    const rows: Row[] = [];
    const store = fakeStore(rows);
    expect(await takeAttempt(store, 'PASSWORD_RESET_EMAIL', 'a@b.co')).toBe(true);
    expect(await takeAttempt(store, 'PASSWORD_RESET_EMAIL', 'a@b.co')).toBe(true);
    expect(await takeAttempt(store, 'PASSWORD_RESET_EMAIL', 'a@b.co')).toBe(true);
    expect(await takeAttempt(store, 'PASSWORD_RESET_EMAIL', 'a@b.co')).toBe(false);
    expect(rows).toHaveLength(3);
  });

  it('does not record a refused request, so trying again does not extend the pause', async () => {
    const rows: Row[] = Array.from({ length: 3 }, () => ({
      kind: 'PASSWORD_RESET_EMAIL',
      key: 'a@b.co',
      createdAt: at(1000),
    }));
    const store = fakeStore(rows);
    await takeAttempt(store, 'PASSWORD_RESET_EMAIL', 'a@b.co', NOW);
    await takeAttempt(store, 'PASSWORD_RESET_EMAIL', 'a@b.co', NOW);
    expect(rows).toHaveLength(3);
  });

  it('allows a request again once the hour has passed', async () => {
    const rows: Row[] = Array.from({ length: 3 }, () => ({
      kind: 'PASSWORD_RESET_EMAIL',
      key: 'a@b.co',
      createdAt: at(HOUR + 1000),
    }));
    expect(await takeAttempt(fakeStore(rows), 'PASSWORD_RESET_EMAIL', 'a@b.co', NOW)).toBe(true);
  });

  it('counts each email address separately', async () => {
    const store = fakeStore([]);
    for (let i = 0; i < 3; i++) await takeAttempt(store, 'PASSWORD_RESET_EMAIL', 'a@b.co');
    expect(await takeAttempt(store, 'PASSWORD_RESET_EMAIL', 'other@b.co')).toBe(true);
  });
});

describe('the FailedAttempt cleanup', () => {
  it('deletes rows older than 24 hours when a row is written, and keeps newer ones', async () => {
    const ago = (ms: number) => new Date(Date.now() - ms);
    const rows: Row[] = [
      { kind: 'ADMIN_LOGIN', key: 'old@b.co', createdAt: ago(ATTEMPT_RETENTION_MS + 1000) },
      { kind: 'PASSWORD_RESET_EMAIL', key: 'old2@b.co', createdAt: ago(ATTEMPT_RETENTION_MS * 3) },
      { kind: 'ADMIN_LOGIN', key: 'recent@b.co', createdAt: ago(ATTEMPT_RETENTION_MS - 60_000) },
    ];
    await recordFailure(fakeStore(rows), 'ADMIN_LOGIN', 'new@b.co');
    expect(rows.map((r) => r.key).sort()).toEqual(['new@b.co', 'recent@b.co']);
  });

  it('still records the failure when the cleanup fails', async () => {
    const rows: Row[] = [];
    const store = fakeStore(rows);
    store.failedAttempt.deleteMany = async () => {
      throw new Error('boom');
    };
    await expect(recordFailure(store, 'ADMIN_LOGIN', 'a@b.co')).resolves.toBeUndefined();
    expect(rows).toHaveLength(1);
  });
});
