import type { PrismaClient } from '../../../generated/prisma/client';
import { normalisePhone } from '../admin/phone';
import { generateMembershipId } from './membership-id';
import { hashPassword, isAcceptablePassword } from './password';
import { cleanName, isUniqueViolation, parseAnswer } from './signup';
import { consumeToken, findUsableToken } from './tokens';

// A membership ID is four random characters from 31, so a collision is rare. The database
// refuses the duplicate, the whole transaction rolls back, and a fresh one is tried.
export const MEMBERSHIP_ID_ATTEMPTS = 5;

export interface VerificationDetails {
  name: string;
  phone: string;
  claimsExistingMember: boolean;
}

// What the verify page shows. Only a valid, unused, unexpired link gets anything. A used or
// expired link gets null, and the page says nothing about the account.
export async function loadVerificationDetails(
  db: PrismaClient,
  token: string,
  now: Date = new Date(),
): Promise<VerificationDetails | null> {
  if (token === '') return null;
  const usable = await findUsableToken(db, token, 'VERIFY', now);
  if (!usable?.accountId) return null;
  const account = await db.account.findUnique({
    where: { id: usable.accountId },
    select: {
      name: true,
      phone: true,
      claimsExistingMember: true,
      status: true,
    },
  });
  if (!account || account.status !== 'UNVERIFIED') return null;
  return {
    name: account.name,
    phone: account.phone,
    claimsExistingMember: account.claimsExistingMember,
  };
}

export interface VerificationInput {
  token: string;
  name: string;
  phone: string;
  answer: string;
  password: string;
  confirm: string;
}

export type VerificationResult =
  | { ok: true; memberId: string; membershipId: string }
  | {
      ok: false;
      problem: 'name' | 'phone' | 'answer' | 'short' | 'mismatch' | 'expired';
    };

// The one place a member is made. In one transaction it uses the link, sets the first
// password, makes the account ACTIVE, creates the member with its membership ID from the
// details as corrected on the page, and links the two. If any step fails, none persists.
//
// Everything the person typed is checked before the transaction starts, so a wrong password
// or detail leaves the link unused and still working.
export async function completeVerification(
  db: PrismaClient,
  input: VerificationInput,
  generateId: () => string = generateMembershipId,
  now: Date = new Date(),
): Promise<VerificationResult> {
  const name = cleanName(input.name);
  if (name === null) return { ok: false, problem: 'name' };
  const phone = normalisePhone(input.phone);
  if (phone === null) return { ok: false, problem: 'phone' };
  const claimsExistingMember = parseAnswer(input.answer);
  if (claimsExistingMember === null) return { ok: false, problem: 'answer' };
  if (!isAcceptablePassword(input.password)) return { ok: false, problem: 'short' };
  if (input.password !== input.confirm) return { ok: false, problem: 'mismatch' };

  const passwordHash = await hashPassword(input.password);

  for (let attempt = 0; attempt < MEMBERSHIP_ID_ATTEMPTS; attempt++) {
    try {
      return await db.$transaction(async (tx): Promise<VerificationResult> => {
        const owner = await consumeToken(tx, input.token, 'VERIFY', now);
        if (!owner?.accountId) return { ok: false, problem: 'expired' };

        const member = await tx.member.create({
          data: {
            membershipId: generateId(),
            name,
            phone,
            claimsExistingMember,
            // Someone who answered No starts with nothing outstanding, so their balance
            // can show at once. Someone who answered Yes waits for the owner's entry.
            openingBalanceSet: !claimsExistingMember,
          },
          select: { id: true, membershipId: true },
        });

        const { count } = await tx.account.updateMany({
          where: { id: owner.accountId, status: 'UNVERIFIED', memberId: null },
          data: {
            name,
            phone,
            claimsExistingMember,
            passwordHash,
            status: 'ACTIVE',
            emailVerifiedAt: now,
            memberId: member.id,
          },
        });
        if (count !== 1) throw new LinkNotUsable();

        return {
          ok: true,
          memberId: member.id,
          membershipId: member.membershipId,
        };
      });
    } catch (error) {
      if (error instanceof LinkNotUsable) return { ok: false, problem: 'expired' };
      if (isUniqueViolation(error) && attempt < MEMBERSHIP_ID_ATTEMPTS - 1) continue;
      throw error;
    }
  }
  throw new Error('Could not generate a unique membership ID');
}

// Thrown inside the transaction so everything it did, including using the link, rolls back.
class LinkNotUsable extends Error {}
