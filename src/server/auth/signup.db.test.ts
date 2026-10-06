import { afterAll, describe, expect, it } from 'vitest';
import { getTestDb } from '../test-db';
import { deleteStaleUnverified, processSignUp, requestFreshVerificationLink } from './signup';
import { hashToken } from './tokens';

// Runs against the Neon test branch only. getTestDb refuses the main branch.
const db = getTestDb();
const run = `s${Date.now().toString(36)}`;
const email = (label: string) => `${run}-${label}@test.invalid`;

const base = { name: 'Ada Obi', phone: '2348074652543', claimsExistingMember: false };

function mailer() {
  const sent: Array<{ kind: string; to: string; link: string }> = [];
  return {
    sent,
    send: async (kind: string, to: string, link: string) => {
      sent.push({ kind, to, link });
      return true;
    },
  };
}

afterAll(async () => {
  await db.account.deleteMany({ where: { email: { startsWith: run } } });
  await db.failedAttempt.deleteMany({ where: { key: { startsWith: run } } });
  await db.$disconnect();
});

describe('sign-up (gate: Sign-up makes no member and sets no password)', () => {
  it('makes an UNVERIFIED account with no password and no member, and sends one verify link', async () => {
    const mail = mailer();
    const address = email('new');
    expect(await processSignUp(db, { ...base, email: address }, mail.send)).toBe('sent');

    const account = await db.account.findUniqueOrThrow({ where: { email: address } });
    expect(account.status).toBe('UNVERIFIED');
    expect(account.passwordHash).toBeNull();
    expect(account.memberId).toBeNull();
    expect(account.emailVerifiedAt).toBeNull();
    expect(mail.sent).toHaveLength(1);
    expect(mail.sent[0].kind).toBe('verify');
    expect(mail.sent[0].to).toBe(address);
    expect(mail.sent[0].link).toContain('/verify-email?token=');
  });

  it('updates an UNVERIFIED account, sends a new link, ends the old one, and sets no password', async () => {
    const mail = mailer();
    const address = email('again');
    await processSignUp(db, { ...base, email: address }, mail.send);
    await processSignUp(
      db,
      {
        ...base,
        email: address,
        name: 'Ada Obi-Eze',
        phone: '2348011112222',
        claimsExistingMember: true,
      },
      mail.send,
    );

    const account = await db.account.findUniqueOrThrow({ where: { email: address } });
    expect(account).toMatchObject({
      name: 'Ada Obi-Eze',
      phone: '2348011112222',
      claimsExistingMember: true,
      status: 'UNVERIFIED',
      passwordHash: null,
      memberId: null,
    });
    expect(mail.sent).toHaveLength(2);
    const live = await db.emailToken.count({ where: { accountId: account.id, usedAt: null } });
    expect(live).toBe(1);
  });

  it('never touches an ACTIVE account and sends nothing', async () => {
    const mail = mailer();
    const address = email('active');
    const member = await db.member.create({
      data: { membershipId: `SPT-${run.slice(-4).toUpperCase()}`, name: 'Real Member' },
    });
    await db.account.create({
      data: {
        email: address,
        name: 'Real Member',
        phone: '2348000000001',
        claimsExistingMember: true,
        status: 'ACTIVE',
        passwordHash: 'a-real-hash',
        memberId: member.id,
      },
    });
    const before = await db.account.findUniqueOrThrow({ where: { email: address } });

    const outcome = await processSignUp(
      db,
      { ...base, email: address, name: 'Someone Else', claimsExistingMember: false },
      mail.send,
    );
    expect(outcome).toBe('active');
    expect(mail.sent).toHaveLength(0);
    const after = await db.account.findUniqueOrThrow({ where: { email: address } });
    expect(after).toEqual(before);
    expect(await db.emailToken.count({ where: { accountId: before.id } })).toBe(0);

    await db.account.delete({ where: { email: address } });
    await db.member.delete({ where: { id: member.id } });
  });

  it('stores only a hash of the verify token', async () => {
    const mail = mailer();
    const address = email('hash');
    await processSignUp(db, { ...base, email: address }, mail.send);
    const token = new URL(mail.sent[0].link).searchParams.get('token')!;
    expect(await db.emailToken.findFirst({ where: { tokenHash: token } })).toBeNull();
    expect(
      await db.emailToken.findFirst({ where: { tokenHash: hashToken(token) } }),
    ).not.toBeNull();
  });
});

describe('verification email limit (gate: Email limits)', () => {
  it('sends three in an hour, then nothing, and counts an address with no account the same', async () => {
    const mail = mailer();
    const address = email('limit');
    const outcomes = [];
    for (let i = 0; i < 4; i++) {
      outcomes.push(await processSignUp(db, { ...base, email: address }, mail.send));
    }
    expect(outcomes).toEqual(['sent', 'sent', 'sent', 'limited']);
    expect(mail.sent).toHaveLength(3);

    const fresh = await requestFreshVerificationLink(db, address, mail.send);
    expect(fresh).toBe('limited');
    expect(mail.sent).toHaveLength(3);

    // An address that never had an account uses up its three requests the same way.
    const ghost = email('ghost');
    const ghostOutcomes = [];
    for (let i = 0; i < 4; i++) {
      ghostOutcomes.push(await requestFreshVerificationLink(db, ghost, mail.send));
    }
    expect(ghostOutcomes).toEqual(['active', 'active', 'active', 'limited']);
    expect(mail.sent).toHaveLength(3);
    expect(
      await db.failedAttempt.count({ where: { kind: 'VERIFICATION_EMAIL', key: ghost } }),
    ).toBe(3);
  });

  it('sends a fresh link to an UNVERIFIED account and none to an unknown address', async () => {
    const mail = mailer();
    const address = email('fresh');
    await processSignUp(db, { ...base, email: address }, mail.send);
    expect(await requestFreshVerificationLink(db, address.toUpperCase(), mail.send)).toBe('sent');
    expect(mail.sent).toHaveLength(2);
    expect(await requestFreshVerificationLink(db, email('nobody'), mail.send)).toBe('active');
    expect(mail.sent).toHaveLength(2);
  });
});

describe('cleanup is narrow (gate: Cleanup is narrow)', () => {
  it('deletes only UNVERIFIED accounts older than 2 months, with their tokens', async () => {
    const now = new Date();
    const old = new Date(now);
    old.setMonth(old.getMonth() - 3);
    const recent = new Date(now);
    recent.setMonth(recent.getMonth() - 1);

    const member = await db.member.create({
      data: { membershipId: `SPT-${run.slice(-3).toUpperCase()}9`, name: 'Old Active' },
    });
    const mk = (label: string, createdAt: Date, extra: object = {}) =>
      db.account.create({
        data: {
          email: email(label),
          name: label,
          phone: '2348000000002',
          claimsExistingMember: false,
          createdAt,
          ...extra,
        },
      });
    const oldUnverified = await mk('old-unverified', old);
    await db.emailToken.create({
      data: {
        accountId: oldUnverified.id,
        type: 'VERIFY',
        tokenHash: `${run}-old-token`,
        expiresAt: new Date(now.getTime() + 60_000),
      },
    });
    await mk('recent-unverified', recent);
    await mk('old-active', old, { status: 'ACTIVE', passwordHash: 'h', memberId: member.id });

    await deleteStaleUnverified(db, now);

    expect(await db.account.findUnique({ where: { email: email('old-unverified') } })).toBeNull();
    expect(await db.emailToken.count({ where: { tokenHash: `${run}-old-token` } })).toBe(0);
    expect(
      await db.account.findUnique({ where: { email: email('recent-unverified') } }),
    ).not.toBeNull();
    expect(await db.account.findUnique({ where: { email: email('old-active') } })).not.toBeNull();
    expect(await db.member.findUnique({ where: { id: member.id } })).not.toBeNull();

    await db.account.deleteMany({ where: { email: { in: [email('old-active')] } } });
    await db.member.delete({ where: { id: member.id } });
  });

  it('runs inside a sign-up', async () => {
    const old = new Date();
    old.setMonth(old.getMonth() - 3);
    await db.account.create({
      data: {
        email: email('stale'),
        name: 'Stale',
        phone: '2348000000003',
        claimsExistingMember: false,
        createdAt: old,
      },
    });
    await processSignUp(db, { ...base, email: email('trigger') }, mailer().send);
    expect(await db.account.findUnique({ where: { email: email('stale') } })).toBeNull();
  });
});
