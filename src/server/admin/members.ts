import type { PrismaClient } from '../../../generated/prisma/client';
import type { Tier } from '../../../generated/prisma/enums';
import { generateMembershipId } from '../auth/membership-id';
import { calendarDateText, parseCalendarDate } from '../time';

// Admin code. It reads and writes across members, so it runs only after the role check in the
// route or action that calls it. It never uses a member-scoped helper (privacy.md).

export const MAX_NAME_LENGTH = 100;
const PHONE_PATTERN = /^[0-9+()\-\s]{6,20}$/;
const MAX_ID_ATTEMPTS = 10;

export type MemberFormError = 'name' | 'tier' | 'expiry' | 'expiry_past' | 'phone';

export interface NewMemberInput {
  name: string;
  tier: Tier;
  expiryDate: Date;
  phone: string | null;
}

export type MemberValidation =
  | { ok: true; value: NewMemberInput }
  | { ok: false; error: MemberFormError };

// Checks every field before anything is written. `today` is the Africa/Lagos calendar date as
// YYYY-MM-DD. An expiry before today is refused, which catches a mistyped year.
export function validateNewMember(
  raw: { name: string; tier: string; expiry: string; phone: string },
  today: string,
): MemberValidation {
  const name = raw.name.trim().replace(/\s+/g, ' ');
  if (name === '' || name.length > MAX_NAME_LENGTH) return { ok: false, error: 'name' };

  if (raw.tier !== 'BASIC' && raw.tier !== 'PREMIUM') return { ok: false, error: 'tier' };

  const expiryDate = parseCalendarDate(raw.expiry.trim());
  if (!expiryDate) return { ok: false, error: 'expiry' };
  if (calendarDateText(expiryDate) < today) return { ok: false, error: 'expiry_past' };

  const phoneText = raw.phone.trim();
  if (phoneText !== '' && !PHONE_PATTERN.test(phoneText)) return { ok: false, error: 'phone' };

  return {
    ok: true,
    value: { name, tier: raw.tier, expiryDate, phone: phoneText === '' ? null : phoneText },
  };
}

function isUniqueViolation(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    (error as { code?: unknown }).code === 'P2002'
  );
}

export interface CreatedMember {
  id: string;
  membershipId: string;
}

// Creates a member with a system-generated membership ID. The member row and the audit rows
// for the initial tier and expiry are written in one transaction, so none persists without the
// others. Creating a member never sets the opening balance and writes no ledger entry.
//
// If the generated ID is already taken, the database refuses the insert, the transaction rolls
// back, and a new ID is generated in a fresh transaction. A taken ID is never saved twice.
// Nothing here changes an existing member's ID, so an ID is permanent.
export async function createMember(
  db: PrismaClient,
  input: NewMemberInput,
  authorId: string,
  generateId: () => string = generateMembershipId,
): Promise<CreatedMember> {
  for (let attempt = 1; attempt <= MAX_ID_ATTEMPTS; attempt++) {
    const membershipId = generateId();
    try {
      return await db.$transaction(async (tx) => {
        const member = await tx.member.create({
          data: {
            membershipId,
            name: input.name,
            phone: input.phone,
            tier: input.tier,
            expiryDate: input.expiryDate,
          },
          select: { id: true, membershipId: true },
        });
        await tx.memberChange.createMany({
          data: [
            {
              memberId: member.id,
              field: 'TIER',
              oldValue: '',
              newValue: input.tier,
              authorId,
            },
            {
              memberId: member.id,
              field: 'EXPIRY',
              oldValue: '',
              newValue: calendarDateText(input.expiryDate),
              authorId,
            },
          ],
        });
        return member;
      });
    } catch (error) {
      if (isUniqueViolation(error)) continue;
      throw error;
    }
  }
  throw new Error('Could not find an unused membership ID');
}

export interface MemberRow {
  id: string;
  membershipId: string;
  name: string;
  phone: string | null;
  tier: Tier;
  expiryDate: Date;
}

export const MEMBER_LIST_LIMIT = 100;

export function listMembers(db: PrismaClient): Promise<MemberRow[]> {
  return db.member.findMany({
    orderBy: { createdAt: 'desc' },
    take: MEMBER_LIST_LIMIT,
    select: {
      id: true,
      membershipId: true,
      name: true,
      phone: true,
      tier: true,
      expiryDate: true,
    },
  });
}

export function findMemberByMembershipId(
  db: PrismaClient,
  membershipId: string,
): Promise<{ name: string; membershipId: string } | null> {
  return db.member.findUnique({
    where: { membershipId },
    select: { name: true, membershipId: true },
  });
}
