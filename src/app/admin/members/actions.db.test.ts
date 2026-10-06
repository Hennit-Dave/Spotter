import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

// Runs against the Neon test branch only. The action calls getDb(), so getDb is replaced with
// the guarded test client. DATABASE_URL is never changed.
vi.mock('@/server/db', async () => {
  const { getTestDb } = await import('@/server/test-db');
  const testDb = getTestDb();
  return { getDb: () => testDb };
});
vi.stubEnv('SESSION_SECRET', 'a-test-secret-that-is-at-least-32-characters-long');

let cookieValue: string | undefined;
vi.mock('next/headers', () => ({
  cookies: async () => ({
    get: (name: string) =>
      name === 'spotter_admin' && cookieValue ? { name, value: cookieValue } : undefined,
    set: (_name: string, value: string) => {
      cookieValue = value || undefined;
    },
  }),
}));
vi.mock('next/cache', () => ({ revalidatePath: () => {} }));
vi.mock('next/navigation', () => ({
  redirect: (url: string) => {
    throw new Error(`REDIRECT ${url}`);
  },
}));

import { getDb } from '@/server/db';
import { getSessionSecret, signSession } from '@/server/auth/cookie';
import { startAdminSession } from '@/server/auth/admin-session';
import { addMember } from './actions';
import { initialState, type AddMemberState } from './form-state';

const db = getDb();
const run = `t${Date.now().toString(36)}`;

function form(fields: Record<string, string>): FormData {
  const data = new FormData();
  for (const [key, value] of Object.entries(fields)) data.set(key, value);
  return data;
}

const farFuture = '2099-12-31';
const lapsed = '2020-01-31';
const good = (label: string) => ({ name: `${run} ${label}`, tier: 'BASIC', expiry: farFuture, phone: '' });

// Each call is a new submit with its own creation key, unless the test gives one.
const submit = (fields: Record<string, string>): Promise<AddMemberState> =>
  addMember(initialState('unused'), form({ creationKey: randomUUID(), ...fields }));

async function memberCount() {
  return db.member.count({ where: { name: { startsWith: run } } });
}

function done(state: AddMemberState): string {
  if (state.step !== 'form' || !state.done) throw new Error(`expected a saved member, got ${JSON.stringify(state).slice(0, 200)}`);
  return state.done;
}

async function redirectOf(promise: Promise<unknown>): Promise<string> {
  try {
    await promise;
  } catch (error) {
    const match = /^REDIRECT (.*)$/.exec((error as Error).message);
    if (match) return match[1];
    throw error;
  }
  throw new Error('expected a redirect');
}

let owner: { id: string; sessionVersion: number };
let staff: { id: string; sessionVersion: number };

beforeAll(async () => {
  owner = await db.staff.create({
    data: { name: 'Test owner', email: `${run}-owner@test.invalid`, phone: `${run}-o`, whatsappNumber: '0', role: 'OWNER' },
  });
  staff = await db.staff.create({
    data: { name: 'Test staff', email: `${run}-staff@test.invalid`, phone: `${run}-s`, whatsappNumber: '0', role: 'STAFF' },
  });
});

beforeEach(() => {
  cookieValue = undefined;
});

afterAll(async () => {
  await db.account.deleteMany({ where: { email: { startsWith: run } } });
  await db.member.deleteMany({ where: { name: { startsWith: run } } });
  await db.staff.deleteMany({ where: { email: { startsWith: run } } });
  await db.$disconnect();
});

describe('who may use the add member action (gate: admin read unreachable without a staff role)', () => {
  it('sends a visitor with no session to sign in and creates nothing', async () => {
    expect(await redirectOf(submit(good('anon')))).toBe('/admin/log-in');
    expect(await memberCount()).toBe(0);
  });

  it('refuses a member session cookie', async () => {
    const exp = Math.floor(Date.now() / 1000) + 600;
    cookieValue = signSession({ kind: 'member', id: staff.id, v: 0, exp }, getSessionSecret());
    expect(await redirectOf(submit(good('member-cookie')))).toBe('/admin/log-in');
    expect(await memberCount()).toBe(0);
  });

  it('lets STAFF create a member, and stores that staff member as the author', async () => {
    await startAdminSession(staff);
    const message = done(await submit({ ...good('by-staff'), tier: 'PREMIUM', phone: '0803 123 4567' }));
    const member = await db.member.findFirstOrThrow({ where: { name: `${run} by-staff` }, include: { changes: true } });
    expect(message).toContain(member.membershipId);
    expect(member.tier).toBe('PREMIUM');
    expect(member.phone).toBe('2348031234567');
    expect(member.openingBalanceSet).toBe(false);
    expect(member.changes).toHaveLength(2);
    expect(member.changes.every((c) => c.authorId === staff.id)).toBe(true);
  });

  it('lets the OWNER create a member too', async () => {
    await startAdminSession(owner);
    done(await submit(good('by-owner')));
    const member = await db.member.findFirstOrThrow({ where: { name: `${run} by-owner` }, include: { changes: true } });
    expect(member.changes.every((c) => c.authorId === owner.id)).toBe(true);
  });
});

describe('validation', () => {
  it('rejects an invalid entry with a message, keeps what was typed, and writes nothing', async () => {
    await startAdminSession(staff);
    const before = await memberCount();
    for (const bad of [{ name: '   ' }, { tier: 'ADMIN' }, { expiry: 'soon' }, { phone: 'call me' }, { phone: '0803123456' }]) {
      const state = await submit({ ...good('x'), ...bad });
      expect(state.step).toBe('form');
      if (state.step === 'form') {
        expect(state.error).not.toBeNull();
        expect(state.values.name).toBe(bad.name ?? `${run} x`);
      }
    }
    expect(await memberCount()).toBe(before);
  });

  it('ignores a membership ID typed into the form: the system makes it', async () => {
    await startAdminSession(staff);
    done(await submit({ ...good('typed-id'), membershipId: 'SPT-AAAA' }));
    const member = await db.member.findFirstOrThrow({ where: { name: `${run} typed-id` } });
    expect(member.membershipId).not.toBe('SPT-AAAA');
  });
});

describe('an expiry before today', () => {
  it('asks first, saves nothing until confirmed, then saves the lapsed member', async () => {
    await startAdminSession(staff);
    const asked = await submit({ ...good('lapsed'), expiry: lapsed });
    expect(asked.step).toBe('confirmExpired');
    expect(await db.member.count({ where: { name: `${run} lapsed` } })).toBe(0);

    done(await submit({ ...good('lapsed'), expiry: lapsed, confirmExpired: '1' }));
    const member = await db.member.findFirstOrThrow({ where: { name: `${run} lapsed` } });
    expect(member.expiryDate.toISOString()).toBe('2020-01-31T00:00:00.000Z');
  });

  it('"Go back" keeps what was typed and saves nothing', async () => {
    await startAdminSession(staff);
    const state = await submit({ ...good('back'), expiry: lapsed, back: '1' });
    expect(state).toMatchObject({ step: 'form', error: null, values: { name: `${run} back`, expiry: lapsed } });
    expect(await db.member.count({ where: { name: `${run} back` } })).toBe(0);
  });
});

describe('possible duplicates warn, and never block', () => {
  it('warns about the same name, ignoring case, and shows the existing member', async () => {
    await startAdminSession(staff);
    done(await submit({ ...good('Grace Eze'), name: `${run} Grace Eze`, phone: '0803 000 0001' }));
    const existing = await db.member.findFirstOrThrow({ where: { name: `${run} Grace Eze` } });
    const before = await memberCount();

    const state = await submit({ ...good('x'), name: `${run} GRACE  EZE` });
    expect(state.step).toBe('duplicates');
    if (state.step !== 'duplicates') return;
    expect(state.matches).toHaveLength(1);
    expect(state.matches[0]).toMatchObject({
      membershipId: existing.membershipId,
      phone: '2348030000001',
      tier: 'BASIC',
      nameMatch: true,
      phoneMatch: false,
      accountEmail: null,
    });
    expect(await memberCount()).toBe(before);
  });

  it('treats the same phone typed another way as a stronger match, and shows a linked account email', async () => {
    await startAdminSession(staff);
    done(await submit({ ...good('Phone Owner'), phone: '+234 803 000 0002' }));
    const existing = await db.member.findFirstOrThrow({ where: { name: `${run} Phone Owner` } });
    await db.account.create({
      data: {
        name: 'Phone Owner',
        email: `${run}-phone@test.invalid`,
        passwordHash: 'x',
        claimedMembershipId: existing.membershipId,
        status: 'LINKED',
        memberId: existing.id,
      },
    });

    const state = await submit({ ...good('A different name'), phone: '0803 000 0002' });
    expect(state.step).toBe('duplicates');
    if (state.step !== 'duplicates') return;
    expect(state.matches[0]).toMatchObject({
      membershipId: existing.membershipId,
      phoneMatch: true,
      nameMatch: false,
      accountEmail: `${run}-phone@test.invalid`,
    });
  });

  it('"Use this member" saves nothing and shows that member\'s ID', async () => {
    await startAdminSession(staff);
    done(await submit({ ...good('Use Me') }));
    const existing = await db.member.findFirstOrThrow({ where: { name: `${run} Use Me` } });
    const before = await memberCount();

    const message = done(await submit({ ...good('Use Me'), useMember: existing.id }));
    expect(message).toContain(existing.membershipId);
    expect(await memberCount()).toBe(before);
  });

  it('"No, create a new member" saves a second record, so a warning never blocks', async () => {
    await startAdminSession(staff);
    done(await submit({ ...good('Twin') }));
    const asked = await submit({ ...good('Twin') });
    expect(asked.step).toBe('duplicates');
    done(await submit({ ...good('Twin'), confirmNew: '1' }));
    expect(await db.member.count({ where: { name: `${run} Twin` } })).toBe(2);
  });

  it('carries the expired confirmation through the duplicate step', async () => {
    await startAdminSession(staff);
    done(await submit({ ...good('Both Warnings') }));
    const first = await submit({ ...good('Both Warnings'), expiry: lapsed });
    expect(first.step).toBe('confirmExpired');
    const second = await submit({ ...good('Both Warnings'), expiry: lapsed, confirmExpired: '1' });
    expect(second).toMatchObject({ step: 'duplicates', confirmedExpired: true });
    done(await submit({ ...good('Both Warnings'), expiry: lapsed, confirmExpired: '1', confirmNew: '1' }));
    expect(await db.member.count({ where: { name: `${run} Both Warnings` } })).toBe(2);
  });
});

describe('the creation key (idempotency)', () => {
  it('creates nothing when the same key is sent again, and shows the member it made', async () => {
    await startAdminSession(staff);
    const creationKey = randomUUID();
    const first = done(await submit({ ...good('once'), creationKey }));
    const second = done(await submit({ ...good('once'), creationKey }));
    const member = await db.member.findFirstOrThrow({ where: { name: `${run} once` } });
    expect(first).toContain('Added');
    expect(second).toContain('Already added');
    expect(second).toContain(member.membershipId);
    expect(second).toContain('Nothing new was saved');
    expect(await db.member.count({ where: { name: `${run} once` } })).toBe(1);
    expect(await db.memberChange.count({ where: { memberId: member.id } })).toBe(2);
  });

  it('lets exactly one of two simultaneous submits create the member', async () => {
    await startAdminSession(staff);
    const creationKey = randomUUID();
    const [a, b] = await Promise.all([
      submit({ ...good('double tap'), creationKey, confirmNew: '1' }),
      submit({ ...good('double tap'), creationKey, confirmNew: '1' }),
    ]);
    const member = await db.member.findFirstOrThrow({ where: { name: `${run} double tap` } });
    expect(await db.member.count({ where: { name: `${run} double tap` } })).toBe(1);
    expect(done(a)).toContain(member.membershipId);
    expect(done(b)).toContain(member.membershipId);
  });

  it('refuses a missing or made-up key, saves nothing, and hands back a fresh valid key', async () => {
    await startAdminSession(staff);
    for (const bad of ['', 'not-a-key', '123e4567-e89b-12d3-a456-42661417400']) {
      const state = await addMember(initialState('unused'), form({ ...good('stale'), creationKey: bad }));
      expect(state.step).toBe('form');
      if (state.step === 'form') {
        expect(state.error).toContain('out of date');
        expect(state.key).toMatch(/^[0-9a-f-]{36}$/);
        expect(state.key).not.toBe(bad);
      }
    }
    expect(await db.member.count({ where: { name: `${run} stale` } })).toBe(0);
  });

  it('keeps the same key through errors, warnings and "Go back"', async () => {
    await startAdminSession(staff);
    const creationKey = randomUUID();
    const invalid = await submit({ ...good('keep'), name: '  ', creationKey });
    expect(invalid.key).toBe(creationKey);
    const asked = await submit({ ...good('keep'), expiry: lapsed, creationKey });
    expect(asked).toMatchObject({ step: 'confirmExpired', key: creationKey });
    const back = await submit({ ...good('keep'), expiry: lapsed, creationKey, back: '1' });
    expect(back.key).toBe(creationKey);
    expect(await db.member.count({ where: { name: `${run} keep` } })).toBe(0);
  });

  it('gives the form a fresh key after a save, so the next member is not blocked', async () => {
    await startAdminSession(staff);
    const creationKey = randomUUID();
    const saved = await submit({ ...good('fresh one'), creationKey });
    done(saved);
    expect(saved.key).not.toBe(creationKey);
    const next = await submit({ ...good('fresh two'), creationKey: saved.key });
    expect(done(next)).toContain('Added');
    expect(await db.member.count({ where: { name: { startsWith: `${run} fresh` } } })).toBe(2);
  });

  it('still lets a person create a second member with the same name, using a new key', async () => {
    await startAdminSession(staff);
    done(await submit({ ...good('same name') }));
    expect((await submit({ ...good('same name') })).step).toBe('duplicates');
    done(await submit({ ...good('same name'), confirmNew: '1' }));
    expect(await db.member.count({ where: { name: `${run} same name` } })).toBe(2);
  });
});
