import { afterAll, describe, expect, it } from 'vitest';
import { getTestDb } from '../test-db';
import { checkMemberLogin } from './member-login';
import { completeMemberReset, requestMemberReset } from './member-reset';
import { processSignUp } from './signup';
import { VERIFY_TOKEN_LIFETIME_MS } from './tokens';
import { completeVerification, loadVerificationDetails } from './verify';

// Runs against the Neon test branch only. getTestDb refuses the main branch.
const db = getTestDb();
const run = `v${Date.now().toString(36)}`;
const email = (label: string) => `${run}-${label}@test.invalid`;
const PASSWORD = 'correct horse battery';

afterAll(async () => {
  const accounts = await db.account.findMany({
    where: { email: { startsWith: run } },
    select: { memberId: true },
  });
  await db.account.deleteMany({ where: { email: { startsWith: run } } });
  await db.member.deleteMany({
    where: { id: { in: accounts.flatMap((a) => (a.memberId ? [a.memberId] : [])) } },
  });
  await db.failedAttempt.deleteMany({ where: { key: { startsWith: run } } });
  await db.$disconnect();
});

// Signs up and returns the raw token from the email, the way a person would receive it.
async function signUpAs(label: string, claimsExistingMember = false) {
  const links: string[] = [];
  await processSignUp(
    db,
    { name: 'Ada Obi', email: email(label), phone: '2348074652543', claimsExistingMember },
    async (_kind, _to, link) => {
      links.push(link);
      return true;
    },
  );
  const token = new URL(links[0]).searchParams.get('token')!;
  return { token, email: email(label) };
}

const form = (token: string, over: Partial<Parameters<typeof completeVerification>[1]> = {}) => ({
  token,
  name: 'Ada Obi',
  phone: '0807 465 2543',
  answer: 'no',
  password: PASSWORD,
  confirm: PASSWORD,
  ...over,
});

describe('verification is atomic (gate: Verification is atomic)', () => {
  it('makes the member and the ACTIVE account together, with a membership ID', async () => {
    const { token, email: address } = await signUpAs('ok');
    const result = await completeVerification(db, form(token));
    expect(result.ok).toBe(true);

    const account = await db.account.findUniqueOrThrow({
      where: { email: address },
      include: { member: true },
    });
    expect(account.status).toBe('ACTIVE');
    expect(account.passwordHash).toMatch(/^\$argon2id\$/);
    expect(account.emailVerifiedAt).not.toBeNull();
    expect(account.member).not.toBeNull();
    expect(account.member!.membershipId).toMatch(/^SPT-[A-HJKMNP-Z2-9]{4}$/);
    expect(account.member).toMatchObject({
      name: 'Ada Obi',
      phone: '2348074652543',
      claimsExistingMember: false,
      paidUntil: null,
    });
  });

  it('uses the details as corrected on the page', async () => {
    const { token, email: address } = await signUpAs('fix', true);
    const result = await completeVerification(
      db,
      form(token, { name: 'Adaeze Obi', phone: '+234 801 111 2222', answer: 'no' }),
    );
    expect(result.ok).toBe(true);
    const account = await db.account.findUniqueOrThrow({
      where: { email: address },
      include: { member: true },
    });
    expect(account).toMatchObject({
      name: 'Adaeze Obi',
      phone: '2348011112222',
      claimsExistingMember: false,
    });
    expect(account.member).toMatchObject({
      name: 'Adaeze Obi',
      phone: '2348011112222',
      claimsExistingMember: false,
      openingBalanceSet: true,
    });
  });

  it('sets the opening-balance flag for No and leaves it unset for Yes (gate: Balance start)', async () => {
    const no = await signUpAs('no', false);
    const yes = await signUpAs('yes', true);
    await completeVerification(db, form(no.token, { answer: 'no' }));
    await completeVerification(db, form(yes.token, { answer: 'yes' }));
    const noMember = await db.member.findFirstOrThrow({ where: { account: { email: no.email } } });
    const yesMember = await db.member.findFirstOrThrow({
      where: { account: { email: yes.email } },
    });
    expect(noMember.openingBalanceSet).toBe(true);
    expect(noMember.claimsExistingMember).toBe(false);
    expect(yesMember.openingBalanceSet).toBe(false);
    expect(yesMember.claimsExistingMember).toBe(true);
    expect(yesMember.paidUntil).toBeNull();
    expect(
      await db.ledgerEntry.count({ where: { memberId: { in: [noMember.id, yesMember.id] } } }),
    ).toBe(0);
  });

  it('leaves the link working after a wrong password or detail', async () => {
    const { token, email: address } = await signUpAs('retry');
    const tries = [
      form(token, { password: 'short' }),
      form(token, { confirm: 'different password' }),
      form(token, { name: '  ' }),
      form(token, { phone: 'abc' }),
      form(token, { answer: '' }),
    ];
    const problems = [];
    for (const t of tries) {
      const result = await completeVerification(db, t);
      problems.push(result.ok ? 'ok' : result.problem);
    }
    expect(problems).toEqual(['short', 'mismatch', 'name', 'phone', 'answer']);

    const account = await db.account.findUniqueOrThrow({ where: { email: address } });
    expect(account.status).toBe('UNVERIFIED');
    expect(account.passwordHash).toBeNull();
    expect(account.memberId).toBeNull();
    expect(await loadVerificationDetails(db, token)).not.toBeNull();
    expect((await completeVerification(db, form(token))).ok).toBe(true);
  });

  it('makes one member when the link is used twice, and cannot set the password again', async () => {
    const { token, email: address } = await signUpAs('twice');
    expect((await completeVerification(db, form(token))).ok).toBe(true);
    const first = await db.account.findUniqueOrThrow({ where: { email: address } });

    const second = await completeVerification(
      db,
      form(token, { password: 'a different password', confirm: 'a different password' }),
    );
    expect(second).toEqual({ ok: false, problem: 'expired' });
    const after = await db.account.findUniqueOrThrow({ where: { email: address } });
    expect(after.passwordHash).toBe(first.passwordHash);
    expect(after.memberId).toBe(first.memberId);
    expect(await db.member.count({ where: { account: { email: address } } })).toBe(1);
  });

  it('makes one member when two requests arrive together', async () => {
    const { token, email: address } = await signUpAs('race');
    const results = await Promise.all([
      completeVerification(db, form(token)),
      completeVerification(db, form(token)),
    ]);
    expect(results.filter((r) => r.ok)).toHaveLength(1);
    expect(await db.member.count({ where: { account: { email: address } } })).toBe(1);
  });

  it('retries a membership ID collision and never saves two', async () => {
    const first = await signUpAs('collide-a');
    const firstResult = await completeVerification(db, form(first.token));
    expect(firstResult.ok).toBe(true);
    const takenId = firstResult.ok ? firstResult.membershipId : '';

    const second = await signUpAs('collide-b');
    const ids = [takenId, takenId, `SPT-${run.slice(-4).toUpperCase()}`];
    let calls = 0;
    const result = await completeVerification(db, form(second.token), () => ids[calls++]);
    expect(result.ok).toBe(true);
    expect(calls).toBe(3);
    expect(result.ok && result.membershipId).toBe(ids[2]);
    expect(await db.member.count({ where: { membershipId: takenId } })).toBe(1);
    expect(await db.member.count({ where: { account: { email: second.email } } })).toBe(1);
  });

  it('rolls everything back, link included, when the ID cannot be generated', async () => {
    const taken = await db.member.findFirstOrThrow({ where: { account: { email: email('ok') } } });
    const { token, email: address } = await signUpAs('rollback');
    await expect(
      completeVerification(db, form(token), () => taken.membershipId),
    ).rejects.toBeDefined();

    const account = await db.account.findUniqueOrThrow({ where: { email: address } });
    expect(account.status).toBe('UNVERIFIED');
    expect(account.passwordHash).toBeNull();
    expect(account.memberId).toBeNull();
    expect(await loadVerificationDetails(db, token)).not.toBeNull();
  });
});

describe('email links (gate: Email links)', () => {
  it('shows the sign-up details only for a valid, unused, unexpired link', async () => {
    const { token } = await signUpAs('page');
    expect(await loadVerificationDetails(db, token)).toEqual({
      name: 'Ada Obi',
      phone: '2348074652543',
      claimsExistingMember: false,
    });
    expect(await loadVerificationDetails(db, 'not-a-real-token')).toBeNull();
    expect(await loadVerificationDetails(db, '')).toBeNull();

    const later = new Date(Date.now() + VERIFY_TOKEN_LIFETIME_MS + 1000);
    expect(await loadVerificationDetails(db, token, later)).toBeNull();
    expect(await completeVerification(db, form(token), undefined, later)).toEqual({
      ok: false,
      problem: 'expired',
    });

    await completeVerification(db, form(token));
    expect(await loadVerificationDetails(db, token)).toBeNull();
  });

  it('does not accept a reset link as a verification link', async () => {
    const member = await signUpAs('swap');
    await completeVerification(db, form(member.token));
    const links: string[] = [];
    await requestMemberReset(db, member.email, async (_k, _t, link) => {
      links.push(link);
      return true;
    });
    const resetToken = new URL(links[0]).searchParams.get('token')!;
    expect(await loadVerificationDetails(db, resetToken)).toBeNull();
  });
});

describe('log in (gate: Unverified accounts reach nothing, No account enumeration)', () => {
  it('lets a verified member in', async () => {
    const { token, email: address } = await signUpAs('login');
    await completeVerification(db, form(token));
    const result = await checkMemberLogin(db, address.toUpperCase(), PASSWORD);
    expect(result.ok).toBe(true);
  });

  it('gives the same answer for an unknown email, a wrong password and an unverified account', async () => {
    const verified = await signUpAs('same-a');
    await completeVerification(db, form(verified.token));
    const unverified = await signUpAs('same-b');

    const answers = [
      await checkMemberLogin(db, email('nobody'), PASSWORD),
      await checkMemberLogin(db, verified.email, 'the wrong password'),
      await checkMemberLogin(db, unverified.email, PASSWORD),
      await checkMemberLogin(db, unverified.email, ''),
    ];
    for (const answer of answers) expect(answer).toEqual({ ok: false, reason: 'invalid' });
  });

  it('cannot sign an UNVERIFIED account in, whatever it is given', async () => {
    const { email: address } = await signUpAs('nopw');
    expect(await checkMemberLogin(db, address, 'anything at all')).toEqual({
      ok: false,
      reason: 'invalid',
    });
  });

  it('pauses an email after five wrong tries, for a real and an unknown email alike', async () => {
    const real = await signUpAs('pause');
    await completeVerification(db, form(real.token));
    for (const address of [real.email, email('pause-ghost')]) {
      for (let i = 0; i < 5; i++) {
        expect(await checkMemberLogin(db, address, 'wrong password')).toEqual({
          ok: false,
          reason: 'invalid',
        });
      }
      expect(await checkMemberLogin(db, address, PASSWORD)).toEqual({
        ok: false,
        reason: 'paused',
      });
    }
  });
});

describe('password reset (gate: A password is set only by a link, Email limits)', () => {
  async function activeMember(label: string) {
    const { token, email: address } = await signUpAs(label);
    await completeVerification(db, form(token));
    const links: string[] = [];
    const send = async (_k: string, _t: string, link: string) => {
      links.push(link);
      return true;
    };
    return {
      address,
      links,
      send,
      tokenOf: (i: number) => new URL(links[i]).searchParams.get('token')!,
    };
  }

  it('works once, ends every other session, and lets the new password in', async () => {
    const m = await activeMember('reset');
    expect(await requestMemberReset(db, m.address, m.send)).toBe('sent');
    const before = await db.account.findUniqueOrThrow({ where: { email: m.address } });

    expect(
      await completeMemberReset(db, m.tokenOf(0), 'a brand new password', 'a brand new password'),
    ).toEqual({ ok: true });
    const after = await db.account.findUniqueOrThrow({ where: { email: m.address } });
    expect(after.sessionVersion).toBe(before.sessionVersion + 1);
    expect(after.memberId).toBe(before.memberId);
    expect((await checkMemberLogin(db, m.address, PASSWORD)).ok).toBe(false);
    expect((await checkMemberLogin(db, m.address, 'a brand new password')).ok).toBe(true);

    expect(
      await completeMemberReset(db, m.tokenOf(0), 'another new password', 'another new password'),
    ).toEqual({
      ok: false,
      problem: 'expired',
    });
  });

  it('keeps the link working after a wrong password', async () => {
    const m = await activeMember('reset-wrong');
    await requestMemberReset(db, m.address, m.send);
    expect(await completeMemberReset(db, m.tokenOf(0), 'short', 'short')).toEqual({
      ok: false,
      problem: 'short',
    });
    expect(await completeMemberReset(db, m.tokenOf(0), 'password one', 'password two')).toEqual({
      ok: false,
      problem: 'mismatch',
    });
    expect(
      (await completeMemberReset(db, m.tokenOf(0), 'good new password', 'good new password')).ok,
    ).toBe(true);
  });

  it('sends nothing for an UNVERIFIED account or an unknown email, and a reset link cannot give one a password', async () => {
    const unverified = await signUpAs('reset-unverified');
    const sent: string[] = [];
    const send = async (_k: string, _t: string, link: string) => {
      sent.push(link);
      return true;
    };
    expect(await requestMemberReset(db, unverified.email, send)).toBe('no-account');
    expect(await requestMemberReset(db, email('reset-ghost'), send)).toBe('no-account');
    expect(sent).toHaveLength(0);

    // Even a reset token forced onto an UNVERIFIED account does nothing.
    const { issueToken } = await import('./tokens');
    const account = await db.account.findUniqueOrThrow({ where: { email: unverified.email } });
    const forced = await issueToken(db, { accountId: account.id }, 'RESET', 60_000);
    expect(await completeMemberReset(db, forced, 'a sneaky password', 'a sneaky password')).toEqual(
      {
        ok: false,
        problem: 'expired',
      },
    );
    const after = await db.account.findUniqueOrThrow({ where: { email: unverified.email } });
    expect(after.passwordHash).toBeNull();
    expect(after.status).toBe('UNVERIFIED');
  });

  it('sends three reset emails in an hour and then nothing', async () => {
    const m = await activeMember('reset-limit');
    const outcomes = [];
    for (let i = 0; i < 4; i++) outcomes.push(await requestMemberReset(db, m.address, m.send));
    expect(outcomes).toEqual(['sent', 'sent', 'sent', 'limited']);
    expect(m.links).toHaveLength(3);

    const ghost = email('limit-ghost');
    const ghostOutcomes = [];
    for (let i = 0; i < 4; i++) ghostOutcomes.push(await requestMemberReset(db, ghost, m.send));
    expect(ghostOutcomes).toEqual(['no-account', 'no-account', 'no-account', 'limited']);
  });
});
