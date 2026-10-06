import type { PrismaClient } from '../../../generated/prisma/client';
import { buildLink, isPlausibleEmail, normaliseEmail, sendAccountEmail } from './email';
import { hashPassword, isAcceptablePassword } from './password';
import type { Mailer } from './signup';
import { takeAttempt } from './throttle';
import { RESET_TOKEN_LIFETIME_MS, consumeToken, findUsableToken, issueToken } from './tokens';

export type ResetRequestOutcome = 'sent' | 'limited' | 'no-account' | 'not-sent';

// Every request is counted, whether or not the email has an account. Only an ACTIVE account
// gets a link: an UNVERIFIED account has no password to reset and uses its verification link.
export async function requestMemberReset(
  db: PrismaClient,
  rawEmail: string,
  send: Mailer = sendAccountEmail,
  now: Date = new Date(),
): Promise<ResetRequestOutcome> {
  const email = normaliseEmail(rawEmail);
  if (!isPlausibleEmail(email)) return 'not-sent';
  if (!(await takeAttempt(db, 'PASSWORD_RESET_EMAIL', email, now))) return 'limited';

  const account = await db.account.findUnique({
    where: { email },
    select: { id: true, status: true },
  });
  if (!account || account.status !== 'ACTIVE') return 'no-account';

  const token = await issueToken(
    db,
    { accountId: account.id },
    'RESET',
    RESET_TOKEN_LIFETIME_MS,
    now,
  );
  return (await send('reset', email, buildLink('/reset-password', token))) ? 'sent' : 'not-sent';
}

export type ResetResult = { ok: true } | { ok: false; problem: 'short' | 'mismatch' | 'expired' };

// Thrown inside the transaction so the link is not used up when it cannot be honoured.
class LinkNotUsable extends Error {}

// Using the link and setting the password are one transaction. Adding one to the session
// version ends every other session for this person. A desk link, and an account that is not
// ACTIVE, cannot use a member reset.
export async function completeMemberReset(
  db: PrismaClient,
  token: string,
  password: string,
  confirm: string,
  now: Date = new Date(),
): Promise<ResetResult> {
  if (!isAcceptablePassword(password)) return { ok: false, problem: 'short' };
  if (password !== confirm) return { ok: false, problem: 'mismatch' };

  const passwordHash = await hashPassword(password);

  try {
    return await db.$transaction(async (tx): Promise<ResetResult> => {
      const usable = await findUsableToken(tx, token, 'RESET', now);
      if (!usable?.accountId) return { ok: false, problem: 'expired' };
      const owner = await consumeToken(tx, token, 'RESET', now);
      if (!owner?.accountId) return { ok: false, problem: 'expired' };
      const { count } = await tx.account.updateMany({
        where: { id: owner.accountId, status: 'ACTIVE' },
        data: { passwordHash, sessionVersion: { increment: 1 } },
      });
      if (count !== 1) throw new LinkNotUsable();
      return { ok: true };
    });
  } catch (error) {
    if (error instanceof LinkNotUsable) return { ok: false, problem: 'expired' };
    throw error;
  }
}
