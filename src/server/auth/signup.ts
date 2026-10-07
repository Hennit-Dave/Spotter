import type { PrismaClient } from '../../../generated/prisma/client';
import { normalisePhone } from '../admin/phone';
import {
  buildLink,
  isPlausibleEmail,
  normaliseEmail,
  sendAccountEmail,
  type AccountEmailKind,
} from './email';
import { takeAttempt } from './throttle';
import { VERIFY_TOKEN_LIFETIME_MS, issueToken } from './tokens';

export const MAX_NAME_LENGTH = 100;
export const MIN_NAME_LENGTH = 2;
// A full name: at least two names separated by a space. The same rule runs in the form
// (components/account/full-name.ts), which server code is not allowed to share.
export const MIN_NAME_WORDS = 2;
// Unverified accounts older than this are deleted whenever a sign-up is written (privacy.md).
export const UNVERIFIED_RETENTION_MONTHS = 2;

export interface SignUpInput {
  name: string;
  email: string;
  phone: string;
  // The answer to "Already a member at the gym?". Anything but yes or no is rejected.
  answer: string;
  // Whether the terms box was ticked. Sign-up is refused without it.
  acceptedTerms: boolean;
}

export interface CleanSignUp {
  name: string;
  email: string;
  phone: string;
  claimsExistingMember: boolean;
}

export type SignUpProblem = 'name' | 'email' | 'phone' | 'answer' | 'terms';

export type Mailer = (kind: AccountEmailKind, to: string, link: string) => Promise<boolean>;

export function cleanName(raw: string): string | null {
  const name = raw.trim().replace(/\s+/g, ' ');
  if (name.length < MIN_NAME_LENGTH || name.length > MAX_NAME_LENGTH) return null;
  return name.split(' ').length >= MIN_NAME_WORDS ? name : null;
}

export function parseAnswer(raw: string): boolean | null {
  if (raw === 'yes') return true;
  if (raw === 'no') return false;
  return null;
}

// Checks the form before anything is written. A problem says which field is wrong and
// nothing about whether any account exists, so it can be shown straight to the person.
export function validateSignUp(
  input: SignUpInput,
): { ok: true; value: CleanSignUp } | { ok: false; problem: SignUpProblem } {
  const name = cleanName(input.name);
  if (name === null) return { ok: false, problem: 'name' };
  const email = normaliseEmail(input.email);
  if (!isPlausibleEmail(email)) return { ok: false, problem: 'email' };
  const phone = normalisePhone(input.phone);
  if (phone === null) return { ok: false, problem: 'phone' };
  const claimsExistingMember = parseAnswer(input.answer);
  if (claimsExistingMember === null) return { ok: false, problem: 'answer' };
  if (!input.acceptedTerms) return { ok: false, problem: 'terms' };
  return { ok: true, value: { name, email, phone, claimsExistingMember } };
}

export function isUniqueViolation(error: unknown): boolean {
  return (
    typeof error === 'object' && error !== null && (error as { code?: unknown }).code === 'P2002'
  );
}

export type SignUpOutcome = 'sent' | 'limited' | 'active' | 'not-sent';

// Deletes UNVERIFIED accounts older than the retention period, and their email tokens with
// them. It filters on status and age only, in the Account table only. An UNVERIFIED account
// has no member, so no member record is touched. There is no scheduled job: this runs inside
// the code that writes a sign-up.
export async function deleteStaleUnverified(db: PrismaClient, now: Date): Promise<number> {
  const cutoff = new Date(now);
  cutoff.setMonth(cutoff.getMonth() - UNVERIFIED_RETENTION_MONTHS);
  const { count } = await db.account.deleteMany({
    where: { status: 'UNVERIFIED', createdAt: { lt: cutoff } },
  });
  return count;
}

async function issueAndSend(
  db: PrismaClient,
  accountId: string,
  email: string,
  send: Mailer,
  now: Date,
): Promise<boolean> {
  const token = await issueToken(db, { accountId }, 'VERIFY', VERIFY_TOKEN_LIFETIME_MS, now);
  return send('verify', email, buildLink('/verify-email', token));
}

// Writes one sign-up. The caller shows the same confirmation whatever this returns, and runs
// this after the response is sent, so neither the message nor the timing says whether the
// email already had an account.
//
// A new email makes an UNVERIFIED account with no password and no member. An UNVERIFIED
// email has its name, phone and answer replaced and gets a fresh link. An ACTIVE account is
// never touched and nothing is sent. No path here sets a password.
export async function processSignUp(
  db: PrismaClient,
  input: CleanSignUp,
  send: Mailer = sendAccountEmail,
  now: Date = new Date(),
): Promise<SignUpOutcome> {
  await deleteStaleUnverified(db, now);

  // Every request is counted, whether or not the email has an account.
  if (!(await takeAttempt(db, 'VERIFICATION_EMAIL', input.email, now))) return 'limited';

  const details = {
    name: input.name,
    phone: input.phone,
    claimsExistingMember: input.claimsExistingMember,
  };
  let account = await db.account.findUnique({
    where: { email: input.email },
    select: { id: true, status: true },
  });
  if (account?.status === 'ACTIVE') return 'active';

  if (account) {
    await db.account.update({ where: { id: account.id }, data: details });
  } else {
    try {
      account = await db.account.create({
        data: { email: input.email, ...details },
        select: { id: true, status: true },
      });
    } catch (error) {
      // Two sign-ups for one new email arrived together. The other one made the account.
      if (!isUniqueViolation(error)) throw error;
      account = await db.account.findUnique({
        where: { email: input.email },
        select: { id: true, status: true },
      });
      if (!account || account.status === 'ACTIVE') return 'active';
      await db.account.update({ where: { id: account.id }, data: details });
    }
  }

  return (await issueAndSend(db, account.id, input.email, send, now)) ? 'sent' : 'not-sent';
}

// The "send me a fresh link" form on the check your email screen. Counted against the same
// limit as sign-up, whether or not an account exists. Only an UNVERIFIED account gets a link.
export async function requestFreshVerificationLink(
  db: PrismaClient,
  rawEmail: string,
  send: Mailer = sendAccountEmail,
  now: Date = new Date(),
): Promise<SignUpOutcome> {
  const email = normaliseEmail(rawEmail);
  if (!isPlausibleEmail(email)) return 'not-sent';
  if (!(await takeAttempt(db, 'VERIFICATION_EMAIL', email, now))) return 'limited';
  const account = await db.account.findUnique({
    where: { email },
    select: { id: true, status: true },
  });
  if (!account || account.status !== 'UNVERIFIED') return 'active';
  return (await issueAndSend(db, account.id, email, send, now)) ? 'sent' : 'not-sent';
}
