import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { getTestDb } from '../test-db';
import { ATTEMPT_LIMIT, ATTEMPT_WINDOW_MS, isPaused, recordFailure, takeAttempt } from './throttle';
import {
  RESET_TOKEN_LIFETIME_MS,
  consumeToken,
  findUsableToken,
  hashToken,
  issueToken,
} from './tokens';

// Runs against the Neon test branch only. getTestDb refuses the main branch.
const db = getTestDb();
const run = `t${Date.now().toString(36)}`;

async function makeStaff(label: string) {
  return db.staff.create({
    data: {
      name: `Test ${label}`,
      email: `${run}-${label}@test.invalid`,
      phone: `${run}-${label}`,
      whatsappNumber: '0',
    },
  });
}

afterAll(async () => {
  await db.staff.deleteMany({ where: { email: { startsWith: run } } });
  await db.account.deleteMany({ where: { email: { startsWith: run } } });
  await db.failedAttempt.deleteMany({ where: { key: { startsWith: run } } });
  await db.$disconnect();
});

describe('email links (gate: Email links)', () => {
  let staffId: string;
  beforeAll(async () => {
    staffId = (await makeStaff('links')).id;
  });

  it('stores only a hash of the token', async () => {
    const token = await issueToken(db, { staffId }, 'RESET', RESET_TOKEN_LIFETIME_MS);
    expect(await db.emailToken.findFirst({ where: { tokenHash: token } })).toBeNull();
    expect(await db.emailToken.findFirst({ where: { tokenHash: hashToken(token) } })).not.toBeNull();
  });

  it('works once', async () => {
    const token = await issueToken(db, { staffId }, 'RESET', RESET_TOKEN_LIFETIME_MS);
    expect(await consumeToken(db, token, 'RESET')).toEqual({ accountId: null, staffId });
    expect(await consumeToken(db, token, 'RESET')).toBeNull();
  });

  it('lets exactly one of two simultaneous requests use the link', async () => {
    const token = await issueToken(db, { staffId }, 'RESET', RESET_TOKEN_LIFETIME_MS);
    const results = await Promise.all([
      consumeToken(db, token, 'RESET'),
      consumeToken(db, token, 'RESET'),
    ]);
    expect(results.filter((r) => r !== null)).toHaveLength(1);
  });

  it('does nothing once it has expired', async () => {
    const token = await issueToken(db, { staffId }, 'RESET', RESET_TOKEN_LIFETIME_MS);
    const later = new Date(Date.now() + RESET_TOKEN_LIFETIME_MS + 1000);
    expect(await findUsableToken(db, token, 'RESET', later)).toBeNull();
    expect(await consumeToken(db, token, 'RESET', later)).toBeNull();
  });

  it('ends the older link when a newer one is issued', async () => {
    const first = await issueToken(db, { staffId }, 'RESET', RESET_TOKEN_LIFETIME_MS);
    const second = await issueToken(db, { staffId }, 'RESET', RESET_TOKEN_LIFETIME_MS);
    expect(await consumeToken(db, first, 'RESET')).toBeNull();
    expect(await consumeToken(db, second, 'RESET')).not.toBeNull();
  });

  it('does not let a reset link act as a verify link', async () => {
    const token = await issueToken(db, { staffId }, 'RESET', RESET_TOKEN_LIFETIME_MS);
    expect(await consumeToken(db, token, 'VERIFY')).toBeNull();
  });
});

describe('an email token has exactly one owner', () => {
  it('rejects a token with no owner', async () => {
    await expect(
      db.emailToken.create({
        data: {
          type: 'RESET',
          tokenHash: `${run}-none`,
          expiresAt: new Date(Date.now() + 1000),
        },
      }),
    ).rejects.toThrow();
  });

  it('rejects a token owned by both an account and a staff member', async () => {
    const staff = await makeStaff('both');
    const account = await db.account.create({
      data: {
        name: 'Test both',
        email: `${run}-both@test.invalid`,
        passwordHash: 'x',
        claimedMembershipId: 'SPT-TEST',
      },
    });
    await expect(
      db.emailToken.create({
        data: {
          accountId: account.id,
          staffId: staff.id,
          type: 'RESET',
          tokenHash: `${run}-both`,
          expiresAt: new Date(Date.now() + 1000),
        },
      }),
    ).rejects.toThrow();
  });
});

describe('the sign-in pause (stored in FailedAttempt)', () => {
  it('pauses an email after five failures, and only that email and kind', async () => {
    const key = `${run}-pause@test.invalid`;
    for (let i = 0; i < ATTEMPT_LIMIT - 1; i++) {
      await recordFailure(db, 'ADMIN_LOGIN', key);
    }
    expect(await isPaused(db, 'ADMIN_LOGIN', key)).toBe(false);
    await recordFailure(db, 'ADMIN_LOGIN', key);
    expect(await isPaused(db, 'ADMIN_LOGIN', key)).toBe(true);
    expect(await isPaused(db, 'MEMBER_LOGIN', key)).toBe(false);
    expect(await isPaused(db, 'ADMIN_LOGIN', `${key}.other`)).toBe(false);
  });

  it('forgets failures older than the window', async () => {
    const key = `${run}-old@test.invalid`;
    const old = new Date(Date.now() - ATTEMPT_WINDOW_MS - 60_000);
    await db.failedAttempt.createMany({
      data: Array.from({ length: ATTEMPT_LIMIT }, () => ({
        kind: 'ADMIN_LOGIN' as const,
        key,
        createdAt: old,
      })),
    });
    expect(await isPaused(db, 'ADMIN_LOGIN', key)).toBe(false);
  });
});

describe('the password reset email limit (needs the PASSWORD_RESET_EMAIL migration)', () => {
  it('allows three requests per email per hour, then refuses, with one row per allowed request', async () => {
    const key = `${run}-reset@test.invalid`;
    expect(await takeAttempt(db, 'PASSWORD_RESET_EMAIL', key)).toBe(true);
    expect(await takeAttempt(db, 'PASSWORD_RESET_EMAIL', key)).toBe(true);
    expect(await takeAttempt(db, 'PASSWORD_RESET_EMAIL', key)).toBe(true);
    expect(await takeAttempt(db, 'PASSWORD_RESET_EMAIL', key)).toBe(false);
    expect(await takeAttempt(db, 'PASSWORD_RESET_EMAIL', key)).toBe(false);
    expect(await db.failedAttempt.count({ where: { kind: 'PASSWORD_RESET_EMAIL', key } })).toBe(3);
    expect(await takeAttempt(db, 'PASSWORD_RESET_EMAIL', `${key}.other`)).toBe(true);
  });

  it('counts an email with no account the same as one with an account', async () => {
    const key = `${run}-noaccount@test.invalid`;
    for (let i = 0; i < 3; i++) expect(await takeAttempt(db, 'PASSWORD_RESET_EMAIL', key)).toBe(true);
    expect(await takeAttempt(db, 'PASSWORD_RESET_EMAIL', key)).toBe(false);
  });
});

describe('staff email', () => {
  it('is unique', async () => {
    const staff = await makeStaff('dupe');
    await expect(
      db.staff.create({
        data: { name: 'Again', email: staff.email, phone: `${run}-dupe2`, whatsappNumber: '0' },
      }),
    ).rejects.toThrow();
  });
});
