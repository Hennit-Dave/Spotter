import type { PrismaClient } from '../../../generated/prisma/client';
import { normaliseEmail } from './email';
import { verifyPassword } from './password';
import { isPaused, recordFailure } from './throttle';

export type MemberLoginResult =
  | { ok: true; account: { id: string; sessionVersion: number } }
  | { ok: false; reason: 'invalid' | 'paused' };

// Every failure is the same answer, so the response does not say whether the email has an
// account, an unverified account or a wrong password. Wrong tries are counted per email
// whether or not the account exists, so the pause does not reveal that either. An account
// with no password, or one that is not ACTIVE with a member, can never sign in, and still
// costs the same hashing work as a real one.
export async function checkMemberLogin(
  db: PrismaClient,
  rawEmail: string,
  password: string,
  now: Date = new Date(),
): Promise<MemberLoginResult> {
  const email = normaliseEmail(rawEmail);
  if (email === '' || password === '') return { ok: false, reason: 'invalid' };

  if (await isPaused(db, 'MEMBER_LOGIN', email, now)) return { ok: false, reason: 'paused' };

  const account = await db.account.findUnique({
    where: { email },
    select: { id: true, status: true, memberId: true, passwordHash: true, sessionVersion: true },
  });
  const passwordOk = await verifyPassword(account?.passwordHash ?? null, password);

  if (!account || account.status !== 'ACTIVE' || account.memberId === null || !passwordOk) {
    await recordFailure(db, 'MEMBER_LOGIN', email, now);
    return { ok: false, reason: 'invalid' };
  }
  return { ok: true, account: { id: account.id, sessionVersion: account.sessionVersion } };
}
