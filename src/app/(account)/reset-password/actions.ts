'use server';

import { redirect } from 'next/navigation';
import { getDb } from '@/server/db';
import { completeMemberReset } from '@/server/auth/member-reset';

function text(formData: FormData, name: string): string {
  const value = formData.get(name);
  return typeof value === 'string' ? value : '';
}

export async function resetPassword(formData: FormData): Promise<void> {
  const token = text(formData, 'token');
  if (token === '') redirect('/forgot-password');
  const back = `/reset-password?token=${encodeURIComponent(token)}`;

  const result = await completeMemberReset(
    getDb(),
    token,
    text(formData, 'password'),
    text(formData, 'confirm'),
  );

  if (!result.ok) redirect(`${back}&e=${result.problem}`);
  redirect('/log-in?reset=1');
}
