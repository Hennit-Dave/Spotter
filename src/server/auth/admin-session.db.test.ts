import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { getDb } from '../db';

// Runs against the Neon test branch only. requireAdmin calls getDb(), so getDb is replaced
// with the guarded test client. DATABASE_URL is never changed.
vi.mock('../db', async () => {
  const { getTestDb } = await import('../test-db');
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

import { getSessionSecret, signSession } from './cookie';
import { endAdminSession, getAdminStaff, requireAdmin, startAdminSession } from './admin-session';

const db = getDb();
const run = `t${Date.now().toString(36)}`;

async function makeStaff(label: string, role: 'OWNER' | 'STAFF', active = true) {
  return db.staff.create({
    data: {
      name: `Test ${label}`,
      email: `${run}-${label}@test.invalid`,
      phone: `${run}-${label}`,
      whatsappNumber: '0',
      role,
      active,
    },
  });
}

beforeEach(() => {
  cookieValue = undefined;
});

afterAll(async () => {
  await db.staff.deleteMany({ where: { email: { startsWith: run } } });
  await db.$disconnect();
});

describe('the admin role check (gate: private isolation, admin side)', () => {
  let owner: Awaited<ReturnType<typeof makeStaff>>;
  let staff: Awaited<ReturnType<typeof makeStaff>>;
  let inactive: Awaited<ReturnType<typeof makeStaff>>;

  beforeAll(async () => {
    owner = await makeStaff('owner', 'OWNER');
    staff = await makeStaff('staff', 'STAFF');
    inactive = await makeStaff('inactive', 'STAFF', false);
  });

  it('sends a visitor with no cookie to sign in', async () => {
    await expect(requireAdmin()).rejects.toThrow('REDIRECT /admin/log-in');
  });

  it('sends a visitor with a forged or member cookie to sign in', async () => {
    const secret = getSessionSecret();
    const exp = Math.floor(Date.now() / 1000) + 600;
    cookieValue = signSession({ kind: 'member', id: owner.id, v: 0, exp }, secret);
    await expect(requireAdmin()).rejects.toThrow('REDIRECT /admin/log-in');
    cookieValue = signSession({ kind: 'admin', id: owner.id, v: 0, exp }, 'another-secret-that-is-also-32-characters-long');
    await expect(requireAdmin()).rejects.toThrow('REDIRECT /admin/log-in');
  });

  it('lets a signed-in owner through', async () => {
    await startAdminSession(owner);
    expect(await requireAdmin('OWNER')).toMatchObject({ id: owner.id, role: 'OWNER' });
  });

  it('keeps a STAFF role out of an owner-only screen', async () => {
    await startAdminSession(staff);
    expect(await requireAdmin()).toMatchObject({ id: staff.id });
    await expect(requireAdmin('OWNER')).rejects.toThrow(/^REDIRECT \/admin$/);
  });

  it('refuses a deactivated staff member immediately', async () => {
    await startAdminSession(inactive);
    expect(await getAdminStaff()).toBeNull();
  });

  it('ends the session when the session version changes (a password reset)', async () => {
    await startAdminSession(owner);
    expect(await getAdminStaff()).not.toBeNull();
    await db.staff.update({ where: { id: owner.id }, data: { sessionVersion: { increment: 1 } } });
    expect(await getAdminStaff()).toBeNull();
  });

  it('refuses a session after sign out', async () => {
    const fresh = await makeStaff('signout', 'OWNER');
    await startAdminSession(fresh);
    expect(await getAdminStaff()).not.toBeNull();
    await endAdminSession();
    expect(await getAdminStaff()).toBeNull();
  });

  it('refuses a session for a staff row that was deleted', async () => {
    const gone = await makeStaff('gone', 'OWNER');
    await startAdminSession(gone);
    await db.staff.delete({ where: { id: gone.id } });
    expect(await getAdminStaff()).toBeNull();
  });
});
