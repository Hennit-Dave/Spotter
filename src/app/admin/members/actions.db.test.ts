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
vi.mock('next/navigation', () => ({
  redirect: (url: string) => {
    throw new Error(`REDIRECT ${url}`);
  },
}));

import { getDb } from '@/server/db';
import { getSessionSecret, signSession } from '@/server/auth/cookie';
import { startAdminSession } from '@/server/auth/admin-session';
import { addMember } from './actions';

const db = getDb();
const run = `t${Date.now().toString(36)}`;

function form(fields: Record<string, string>): FormData {
  const data = new FormData();
  for (const [key, value] of Object.entries(fields)) data.set(key, value);
  return data;
}

const farFuture = '2099-12-31';
const good = (label: string) => ({ name: `${run} ${label}`, tier: 'BASIC', expiry: farFuture, phone: '' });

async function memberCount() {
  return db.member.count({ where: { name: { startsWith: run } } });
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
  await db.member.deleteMany({ where: { name: { startsWith: run } } });
  await db.staff.deleteMany({ where: { email: { startsWith: run } } });
  await db.$disconnect();
});

describe('the add member action (FR-13, gate: admin read unreachable without a staff role)', () => {
  it('sends a visitor with no session to sign in and creates nothing', async () => {
    expect(await redirectOf(addMember(form(good('anon'))))).toBe('/admin/log-in');
    expect(await memberCount()).toBe(0);
  });

  it('refuses a member session cookie', async () => {
    const exp = Math.floor(Date.now() / 1000) + 600;
    cookieValue = signSession({ kind: 'member', id: staff.id, v: 0, exp }, getSessionSecret());
    expect(await redirectOf(addMember(form(good('member-cookie'))))).toBe('/admin/log-in');
    expect(await memberCount()).toBe(0);
  });

  it('lets STAFF create a member, and stores that staff member as the author', async () => {
    await startAdminSession(staff);
    const url = await redirectOf(addMember(form({ ...good('by-staff'), tier: 'PREMIUM', phone: '0803 123 4567' })));
    expect(url).toMatch(/^\/admin\/members\?created=SPT-[A-Z2-9]{4}$/);

    const member = await db.member.findFirstOrThrow({
      where: { name: `${run} by-staff` },
      include: { changes: true },
    });
    expect(url).toContain(member.membershipId);
    expect(member.tier).toBe('PREMIUM');
    expect(member.phone).toBe('0803 123 4567');
    expect(member.openingBalanceSet).toBe(false);
    expect(member.changes).toHaveLength(2);
    expect(member.changes.every((c) => c.authorId === staff.id)).toBe(true);
  });

  it('lets the OWNER create a member too', async () => {
    await startAdminSession(owner);
    const url = await redirectOf(addMember(form(good('by-owner'))));
    expect(url).toMatch(/created=SPT-/);
    const member = await db.member.findFirstOrThrow({ where: { name: `${run} by-owner` }, include: { changes: true } });
    expect(member.changes.every((c) => c.authorId === owner.id)).toBe(true);
  });

  it('rejects an invalid entry with a message and writes nothing', async () => {
    await startAdminSession(staff);
    const before = await memberCount();
    expect(await redirectOf(addMember(form({ ...good('x'), name: '   ' })))).toBe('/admin/members?e=name');
    expect(await redirectOf(addMember(form({ ...good('x'), tier: 'ADMIN' })))).toBe('/admin/members?e=tier');
    expect(await redirectOf(addMember(form({ ...good('x'), expiry: '2020-01-01' })))).toBe('/admin/members?e=expiry_past');
    expect(await redirectOf(addMember(form({ ...good('x'), expiry: 'soon' })))).toBe('/admin/members?e=expiry');
    expect(await redirectOf(addMember(form({ ...good('x'), phone: 'call me' })))).toBe('/admin/members?e=phone');
    expect(await memberCount()).toBe(before);
  });

  it('ignores a membership ID typed into the form: the system makes it', async () => {
    await startAdminSession(staff);
    const url = await redirectOf(addMember(form({ ...good('typed-id'), membershipId: 'SPT-AAAA' })));
    const member = await db.member.findFirstOrThrow({ where: { name: `${run} typed-id` } });
    expect(member.membershipId).not.toBe('SPT-AAAA');
    expect(url).toContain(member.membershipId);
  });
});
