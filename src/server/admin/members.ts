import type { PrismaClient } from '../../../generated/prisma/client';
import type { Tier } from '../../../generated/prisma/enums';
import { generateMembershipId } from '../auth/membership-id';
import { calendarDateText, parseCalendarDate } from '../time';
import { normalisePhone } from './phone';

// Admin code. It reads and writes across members, so it runs only after the role check in the
// route or action that calls it. It never uses a member-scoped helper (privacy.md).

export const MAX_NAME_LENGTH = 100;
const MAX_ID_ATTEMPTS = 10;

export type MemberFormError = 'name' | 'tier' | 'expiry' | 'phone';

export interface NewMemberInput {
  name: string;
  tier: Tier;
  expiryDate: Date;
  // International digits only, for example 2348074652543, or null when left blank.
  phone: string | null;
}

export type MemberValidation =
  | { ok: true; value: NewMemberInput; expired: boolean }
  | { ok: false; error: MemberFormError };

// Checks every field before anything is written. `today` is the Africa/Lagos calendar date as
// YYYY-MM-DD. An expiry before today is allowed, because lapsed members must be enterable, but
// the result says so, and the screen asks for a confirmation before it saves.
export function validateNewMember(
  raw: { name: string; tier: string; expiry: string; phone: string },
  today: string,
): MemberValidation {
  const name = raw.name.trim().replace(/\s+/g, ' ');
  if (name === '' || name.length > MAX_NAME_LENGTH) return { ok: false, error: 'name' };

  if (raw.tier !== 'BASIC' && raw.tier !== 'PREMIUM') return { ok: false, error: 'tier' };

  const expiryDate = parseCalendarDate(raw.expiry.trim());
  if (!expiryDate) return { ok: false, error: 'expiry' };

  const phoneText = raw.phone.trim();
  let phone: string | null = null;
  if (phoneText !== '') {
    phone = normalisePhone(phoneText);
    if (phone === null) return { ok: false, error: 'phone' };
  }

  return {
    ok: true,
    value: { name, tier: raw.tier, expiryDate, phone },
    expired: calendarDateText(expiryDate) < today,
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

export interface DuplicateMember {
  id: string;
  membershipId: string;
  name: string;
  phone: string | null;
  tier: Tier;
  expiryDate: Date;
  nameMatch: boolean;
  phoneMatch: boolean;
  // The account linked to this member, if any, with its email.
  account: { email: string; status: string } | null;
}

const DUPLICATE_LIMIT = 10;

// Finds existing members with the same name (ignoring case, with extra spaces already
// collapsed) or the same normalised phone number. Phone matches come first, because they are
// the stronger sign it is the same person. This only warns. It never blocks.
export async function findDuplicateMembers(
  db: PrismaClient,
  candidate: { name: string; phone: string | null },
): Promise<DuplicateMember[]> {
  const rows = await db.member.findMany({
    where: {
      OR: [
        { name: { equals: candidate.name, mode: 'insensitive' } },
        ...(candidate.phone ? [{ phone: candidate.phone }] : []),
      ],
    },
    orderBy: { createdAt: 'desc' },
    take: DUPLICATE_LIMIT,
    select: {
      id: true,
      membershipId: true,
      name: true,
      phone: true,
      tier: true,
      expiryDate: true,
      account: { select: { email: true, status: true } },
    },
  });
  const wanted = candidate.name.toLowerCase();
  return rows
    .map((row) => ({
      ...row,
      nameMatch: row.name.trim().replace(/\s+/g, ' ').toLowerCase() === wanted,
      phoneMatch: candidate.phone !== null && row.phone === candidate.phone,
    }))
    .sort((a, b) => Number(b.phoneMatch) - Number(a.phoneMatch));
}

export function findMemberSummaryById(
  db: PrismaClient,
  id: string,
): Promise<{ name: string; membershipId: string } | null> {
  return db.member.findUnique({ where: { id }, select: { name: true, membershipId: true } });
}
