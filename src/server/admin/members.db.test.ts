import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { getTestDb } from '../test-db';
import { createMember, findDuplicateMembers } from './members';

// Runs against the Neon test branch only. getTestDb refuses the main branch.
const db = getTestDb();
const run = `t${Date.now().toString(36)}`;
const expiryDate = new Date(Date.UTC(2027, 0, 31));

let author: { id: string };

beforeAll(async () => {
  author = await db.staff.create({
    data: { name: 'Test author', email: `${run}-author@test.invalid`, phone: `${run}-author`, whatsappNumber: '0' },
  });
});

afterAll(async () => {
  await db.account.deleteMany({ where: { email: { startsWith: run } } });
  await db.member.deleteMany({ where: { name: { startsWith: run } } });
  await db.staff.deleteMany({ where: { email: { startsWith: run } } });
  await db.$disconnect();
});

function input(label: string, tier: 'BASIC' | 'PREMIUM' = 'BASIC') {
  return { name: `${run} ${label}`, tier, expiryDate, phone: null };
}

describe('createMember (FR-13)', () => {
  it('gives every new member a unique ID in the form SPT-XXXX, and stores the author in the audit rows', async () => {
    const a = await createMember(db, input('a'), author.id);
    const b = await createMember(db, input('b', 'PREMIUM'), author.id);
    expect(a.membershipId).toMatch(/^SPT-[ABCDEFGHJKMNPQRSTUVWXYZ2-9]{4}$/);
    expect(b.membershipId).toMatch(/^SPT-[ABCDEFGHJKMNPQRSTUVWXYZ2-9]{4}$/);
    expect(a.membershipId).not.toBe(b.membershipId);

    const stored = await db.member.findUniqueOrThrow({
      where: { id: b.id },
      include: { changes: true, ledgerEntries: true },
    });
    expect(stored.tier).toBe('PREMIUM');
    expect(stored.expiryDate.toISOString()).toBe('2027-01-31T00:00:00.000Z');
    // Creating a member never sets the opening balance and writes no ledger entry.
    expect(stored.openingBalanceSet).toBe(false);
    expect(stored.ledgerEntries).toHaveLength(0);
    // The audit rows record who set the starting values.
    expect(stored.changes).toHaveLength(2);
    const byField = Object.fromEntries(stored.changes.map((c) => [c.field, c]));
    expect(byField.TIER).toMatchObject({ oldValue: '', newValue: 'PREMIUM', authorId: author.id });
    expect(byField.EXPIRY).toMatchObject({ oldValue: '', newValue: '2027-01-31', authorId: author.id });
  });

  it('retries when the generated ID is taken, and never saves the taken ID twice', async () => {
    const first = await createMember(db, input('taken'), author.id);
    const ids = [first.membershipId, first.membershipId, 'SPT-ZZZZ'];
    const second = await createMember(db, input('retry'), author.id, () => ids.shift()!);
    expect(second.membershipId).toBe('SPT-ZZZZ');
    expect(await db.member.count({ where: { membershipId: first.membershipId } })).toBe(1);
    const unchanged = await db.member.findUniqueOrThrow({ where: { membershipId: first.membershipId } });
    expect(unchanged.name).toBe(`${run} taken`);
    // The failed attempts left nothing behind: one member row and two audit rows per member.
    const retried = await db.member.findUniqueOrThrow({ where: { id: second.id }, include: { changes: true } });
    expect(retried.changes).toHaveLength(2);
  });

  it('gives up with an error when every attempt collides, writing nothing', async () => {
    const taken = await createMember(db, input('always-taken'), author.id);
    const before = await db.member.count({ where: { name: { startsWith: run } } });
    await expect(
      createMember(db, input('never-saved'), author.id, () => taken.membershipId),
    ).rejects.toThrow('unused membership ID');
    expect(await db.member.count({ where: { name: { startsWith: run } } })).toBe(before);
  });

  it('saves nothing when the audit rows cannot be written', async () => {
    await expect(
      createMember(db, input('atomic'), 'no-such-staff-id', () => 'SPT-YYYY'),
    ).rejects.toThrow();
    expect(await db.member.count({ where: { membershipId: 'SPT-YYYY' } })).toBe(0);
  });

  it('cannot create two members with the same ID, even by bypassing createMember', async () => {
    const member = await createMember(db, input('unique'), author.id);
    await expect(
      db.member.create({
        data: { membershipId: member.membershipId, name: `${run} dupe`, tier: 'BASIC', expiryDate },
      }),
    ).rejects.toThrow();
  });
});

describe('findDuplicateMembers', () => {
  it('finds the same name ignoring case, and the same phone, and ranks the phone match first', async () => {
    const byName = await createMember(db, { ...input('Ada Obi'), name: `${run} Ada Obi`, phone: '2348000000001' }, author.id);
    const byPhone = await createMember(db, { ...input('someone else'), phone: '2348000000002' }, author.id);

    const matches = await findDuplicateMembers(db, { name: `${run} ADA OBI`, phone: '2348000000002' });
    expect(matches.map((m) => m.membershipId)).toEqual([byPhone.membershipId, byName.membershipId]);
    expect(matches[0]).toMatchObject({ phoneMatch: true, nameMatch: false });
    expect(matches[1]).toMatchObject({ phoneMatch: false, nameMatch: true });
  });

  it('reports a member with both the same name and the same phone as both matches', async () => {
    const both = await createMember(db, { ...input('Both Match'), phone: '2348000000003' }, author.id);
    const [match] = await findDuplicateMembers(db, { name: `${run} both match`, phone: '2348000000003' });
    expect(match).toMatchObject({ membershipId: both.membershipId, nameMatch: true, phoneMatch: true });
  });

  it('shows the linked account and its email, or none', async () => {
    const linked = await createMember(db, { ...input('Has Account'), phone: null }, author.id);
    const unlinked = await createMember(db, { ...input('Has Account'), phone: null }, author.id);
    await db.account.create({
      data: {
        name: 'Has Account',
        email: `${run}-linked@test.invalid`,
        passwordHash: 'x',
        claimedMembershipId: linked.membershipId,
        status: 'LINKED',
        memberId: linked.id,
      },
    });
    const matches = await findDuplicateMembers(db, { name: `${run} has account`, phone: null });
    const byId = Object.fromEntries(matches.map((m) => [m.membershipId, m]));
    expect(byId[linked.membershipId].account).toEqual({ email: `${run}-linked@test.invalid`, status: 'LINKED' });
    expect(byId[unlinked.membershipId].account).toBeNull();
  });

  it('returns nothing for a new name and a new phone, and ignores a null phone', async () => {
    expect(await findDuplicateMembers(db, { name: `${run} nobody by this name`, phone: '2348999999999' })).toEqual([]);
    expect(await findDuplicateMembers(db, { name: `${run} nobody by this name`, phone: null })).toEqual([]);
  });
});
