'use server';

import { redirect } from 'next/navigation';
import { getDb } from '@/server/db';
import { startAdminSession } from '@/server/auth/admin-session';
import { normaliseEmail } from '@/server/auth/email';
import { verifyPassword } from '@/server/auth/password';
import { isPaused, recordFailure } from '@/server/auth/throttle';

function text(formData: FormData, name: string): string {
  const value = formData.get(name);
  return typeof value === 'string' ? value : '';
}

// Every failure gives the same answer, so the response does not say whether the email has
// an account. Wrong tries are counted per email whether or not the account exists, so the
// pause does not reveal that either.
export async function signIn(formData: FormData): Promise<void> {
  const email = normaliseEmail(text(formData, 'email'));
  const password = text(formData, 'password');
  const db = getDb();

  if (email === '' || password === '') redirect('/admin/log-in?e=invalid');

  if (await isPaused(db, 'ADMIN_LOGIN', email)) redirect('/admin/log-in?e=paused');

  const staff = await db.staff.findUnique({
    where: { email },
    select: { id: true, active: true, passwordHash: true, sessionVersion: true },
  });
  const passwordOk = await verifyPassword(staff?.passwordHash ?? null, password);

  if (!staff || !staff.active || !passwordOk) {
    await recordFailure(db, 'ADMIN_LOGIN', email);
    redirect('/admin/log-in?e=invalid');
  }

  await startAdminSession(staff);
  redirect('/admin');
}
