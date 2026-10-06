import type { PrismaClient } from '../../../generated/prisma/client';
import { PLAN_FIELDS, paidThrough, planFor, type Plan } from '../plan/plan';

// Admin code. It reads across members, so it runs only after the role check in the route or
// action that calls it. It never uses a member-scoped helper (privacy.md). Members are not created
// here: they make themselves by signing up (FR-13 is removed).

export interface MemberRow {
  id: string;
  membershipId: string;
  name: string;
  // International digits only.
  phone: string | null;
  plan: Plan;
  // The date the member is paid through as YYYY-MM-DD, or null if they have never paid.
  paidThrough: string | null;
  claimsExistingMember: boolean;
  openingBalanceSet: boolean;
  accessCardIssued: boolean;
}

export const MEMBER_LIST_LIMIT = 100;

export async function listMembers(db: PrismaClient, now: Date = new Date()): Promise<MemberRow[]> {
  const rows = await db.member.findMany({
    orderBy: { createdAt: 'desc' },
    take: MEMBER_LIST_LIMIT,
    select: {
      id: true,
      membershipId: true,
      name: true,
      phone: true,
      claimsExistingMember: true,
      openingBalanceSet: true,
      accessCardIssuedAt: true,
      ...PLAN_FIELDS,
    },
  });
  return rows.map((row) => ({
    id: row.id,
    membershipId: row.membershipId,
    name: row.name,
    phone: row.phone,
    plan: planFor(row, { now }),
    paidThrough: paidThrough(row),
    claimsExistingMember: row.claimsExistingMember,
    openingBalanceSet: row.openingBalanceSet,
    accessCardIssued: row.accessCardIssuedAt !== null,
  }));
}

export interface DuplicateMember {
  id: string;
  membershipId: string;
  name: string;
  phone: string | null;
  plan: Plan;
  paidThrough: string | null;
  nameMatch: boolean;
  phoneMatch: boolean;
  // The account this member belongs to, with its email.
  account: { email: string; status: string } | null;
}

const DUPLICATE_LIMIT = 10;

// Finds other members with the same name (ignoring case) or the same normalised phone number.
// Phone matches come first, because they are the stronger sign it is the same person. This only
// warns. The owner uses it to catch one person who signed up twice before entering a balance.
export async function findDuplicateMembers(
  db: PrismaClient,
  candidate: { name: string; phone: string | null },
  now: Date = new Date(),
): Promise<DuplicateMember[]> {
  const name = candidate.name.trim().replace(/\s+/g, ' ');
  const rows = await db.member.findMany({
    where: {
      OR: [
        { name: { equals: name, mode: 'insensitive' } },
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
      account: { select: { email: true, status: true } },
      ...PLAN_FIELDS,
    },
  });
  const wanted = name.toLowerCase();
  return rows
    .map((row) => ({
      id: row.id,
      membershipId: row.membershipId,
      name: row.name,
      phone: row.phone,
      plan: planFor(row, { now }),
      paidThrough: paidThrough(row),
      account: row.account,
      nameMatch: row.name.trim().replace(/\s+/g, ' ').toLowerCase() === wanted,
      phoneMatch: candidate.phone !== null && row.phone === candidate.phone,
    }))
    .sort((a, b) => Number(b.phoneMatch) - Number(a.phoneMatch));
}
