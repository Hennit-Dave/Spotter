import { cache } from 'react';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import type { StaffRole } from '../../../generated/prisma/enums';
import { getDb } from '../db';
import {
  COOKIE_NAMES,
  SESSION_LIFETIME_SECONDS,
  getSessionSecret,
  isSessionCurrent,
  sessionCookieOptions,
  signSession,
  verifySession,
} from './cookie';

export interface AdminStaff {
  id: string;
  name: string;
  email: string;
  role: StaffRole;
}

export async function startAdminSession(staff: {
  id: string;
  sessionVersion: number;
}): Promise<void> {
  const exp = Math.floor(Date.now() / 1000) + SESSION_LIFETIME_SECONDS.admin;
  const value = signSession(
    { kind: 'admin', id: staff.id, v: staff.sessionVersion, exp },
    getSessionSecret(),
  );
  (await cookies()).set(COOKIE_NAMES.admin, value, sessionCookieOptions('admin'));
}

export async function endAdminSession(): Promise<void> {
  (await cookies()).set(COOKIE_NAMES.admin, '', {
    ...sessionCookieOptions('admin'),
    maxAge: 0,
  });
}

// Reads the admin cookie, then loads the staff row fresh from the database. A removed,
// deactivated or password-reset staff member loses access on their very next request.
export const getAdminStaff = cache(async (): Promise<AdminStaff | null> => {
  const value = (await cookies()).get(COOKIE_NAMES.admin)?.value;
  const payload = verifySession(
    value,
    getSessionSecret(),
    'admin',
    Math.floor(Date.now() / 1000),
  );
  if (!payload) return null;

  const staff = await getDb().staff.findUnique({
    where: { id: payload.id },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      active: true,
      sessionVersion: true,
    },
  });
  if (!staff || !isSessionCurrent(payload, staff)) return null;
  return { id: staff.id, name: staff.name, email: staff.email, role: staff.role };
});

// Every admin read and write starts here. Without a valid admin session the person goes to
// sign in. A role the screen does not allow goes back to the admin home.
export async function requireAdmin(role?: StaffRole): Promise<AdminStaff> {
  const staff = await getAdminStaff();
  if (!staff) redirect('/admin/log-in');
  if (role && staff.role !== role) redirect('/admin');
  return staff;
}
