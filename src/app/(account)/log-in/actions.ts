'use server';

import { redirect } from 'next/navigation';
import { getDb } from '@/server/db';
import { checkMemberLogin } from '@/server/auth/member-login';
import { startMemberSession } from '@/server/auth/member-session';

function text(formData: FormData, name: string): string {
  const value = formData.get(name);
  return typeof value === 'string' ? value : '';
}

export async function logIn(formData: FormData): Promise<void> {
  const result = await checkMemberLogin(
    getDb(),
    text(formData, 'email'),
    text(formData, 'password'),
  );
  if (!result.ok) redirect(`/log-in?e=${result.reason}`);

  await startMemberSession(result.account);
  redirect('/');
}
