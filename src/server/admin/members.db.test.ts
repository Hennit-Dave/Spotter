import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { getTestDb } from '../test-db';
import { findDuplicateMembers, listMembers } from './members';

// Runs against the Neon test branch only. getTestDb refuses the main branch. These tests need
// both plan-model migrations applied to the test branch.
const db = getTestDb();
const run = `t${Date.now().toString(36)}`;
let counter = 0;

function makeMember(label: string, extra: Partial<{ phone: string; paidUntil: Date; openingBalanceSet: boolean; claimsExistingMember: boolean; accessCardIssuedAt: Date }> = {}) {
  counter += 1;
  return db.member.create({
    data: {
      membershipId: `SPT-${run}-${counter}`,
      name: `${run} ${label}`,
      ...extra,
    },
  });
}

afterAll(async () => {
  await db.account.deleteMany({ where: { email: { startsWith: run } } });
  await db.member.deleteMany({ where: { name: { startsWith: run } } });
  await db.$disconnect();
});

const day = (text: string) => new Date(`${text}T00:00:00Z`);
const mine = <T extends { name: string }>(rows: T[]) => rows.filter((r) => r.name.startsWith(run));

describe('listMembers', () => {
  beforeAll(async () => {
    await makeMember('never paid');
    await makeMember('paid', { paidUntil: day('2099-12-31'), accessCardIssuedAt: new Date() });
    await makeMember('lapsed', { paidUntil: day('2020-01-31'), claimsExistingMember: true });
    await makeMember('balance set', { openingBalanceSet: true, phone: '2348000000010' });
  });

  it('works out each plan from the paid-until date, with nothing stored', async () => {
    const rows = Object.fromEntries(mine(await listMembers(db)).map((r) => [r.name.slice(run.length + 1), r]));
    expect(rows['never paid']).toMatchObject({ plan: 'FREE', paidThrough: null, accessCardIssued: false });
    expect(rows['paid']).toMatchObject({ plan: 'PAID', paidThrough: '2099-12-31', accessCardIssued: true });
    expect(rows['lapsed']).toMatchObject({ plan: 'FREE', paidThrough: '2020-01-31', claimsExistingMember: true });
    expect(rows['balance set']).toMatchObject({ openingBalanceSet: true, phone: '2348000000010' });
  });

  it('writes nothing when listing a lapsed member', async () => {
    const before = await db.member.findFirstOrThrow({ where: { name: `${run} lapsed` } });
    await listMembers(db);
    const after = await db.member.findFirstOrThrow({ where: { name: `${run} lapsed` } });
    expect(after.updatedAt.toISOString()).toBe(before.updatedAt.toISOString());
    expect(await db.memberChange.count({ where: { memberId: before.id } })).toBe(0);
  });

  it('starts a new member with the opening balance unset and no card', async () => {
    const member = await db.member.findFirstOrThrow({ where: { name: `${run} never paid` } });
    expect(member.openingBalanceSet).toBe(false);
    expect(member.claimsExistingMember).toBe(false);
    expect(member.accessCardIssuedAt).toBeNull();
  });
});

describe('findDuplicateMembers', () => {
  it('finds the same name ignoring case, and the same phone, and ranks the phone match first', async () => {
    const byName = await makeMember('Ada Obi', { phone: '2348000000001' });
    const byPhone = await makeMember('someone else', { phone: '2348000000002' });
    const matches = await findDuplicateMembers(db, { name: `${run} ADA  OBI`, phone: '2348000000002' });
    expect(matches.map((m) => m.membershipId)).toEqual([byPhone.membershipId, byName.membershipId]);
    expect(matches[0]).toMatchObject({ phoneMatch: true, nameMatch: false });
    expect(matches[1]).toMatchObject({ phoneMatch: false, nameMatch: true });
  });

  it('reports a member with both the same name and the same phone as both matches', async () => {
    const both = await makeMember('Both Match', { phone: '2348000000003' });
    const [match] = await findDuplicateMembers(db, { name: `${run} both match`, phone: '2348000000003' });
    expect(match).toMatchObject({ membershipId: both.membershipId, nameMatch: true, phoneMatch: true });
  });

  it('shows the plan and the linked account email, or none', async () => {
    const linked = await makeMember('Has Account', { paidUntil: day('2099-01-01') });
    const unlinked = await makeMember('Has Account');
    await db.account.create({
      data: {
        name: 'Has Account',
        email: `${run}-linked@test.invalid`,
        phone: '',
        claimsExistingMember: false,
        status: 'ACTIVE',
        memberId: linked.id,
      },
    });
    const matches = await findDuplicateMembers(db, { name: `${run} has account`, phone: null });
    const byId = Object.fromEntries(matches.map((m) => [m.membershipId, m]));
    expect(byId[linked.membershipId]).toMatchObject({ plan: 'PAID', paidThrough: '2099-01-01' });
    expect(byId[linked.membershipId].account).toEqual({ email: `${run}-linked@test.invalid`, status: 'ACTIVE' });
    expect(byId[unlinked.membershipId]).toMatchObject({ plan: 'FREE', account: null });
  });

  it('returns nothing for a new name and a new phone, and ignores a null phone', async () => {
    expect(await findDuplicateMembers(db, { name: `${run} nobody by this name`, phone: '2348999999999' })).toEqual([]);
    expect(await findDuplicateMembers(db, { name: `${run} nobody by this name`, phone: null })).toEqual([]);
  });
});
