'use server';

import { redirect } from 'next/navigation';
import { getDb } from '@/server/db';
import { completeVerification } from '@/server/auth/verify';

function text(formData: FormData, name: string): string {
  const value = formData.get(name);
  return typeof value === 'string' ? value : '';
}

// Everything the person typed is checked before the link is used, so a wrong password or
// detail sends them back with the link still working. The page then shows the details from
// sign-up again, because nothing personal is ever put in an address.
export async function verifyEmail(formData: FormData): Promise<void> {
  const token = text(formData, 'token');
  if (token === '') redirect('/sign-up');
  const back = `/verify-email?token=${encodeURIComponent(token)}`;

  const result = await completeVerification(getDb(), {
    token,
    name: text(formData, 'name'),
    phone: text(formData, 'phone'),
    answer: text(formData, 'answer'),
    password: text(formData, 'password'),
    confirm: text(formData, 'confirm'),
  });

  if (!result.ok) {
    if (result.problem === 'expired') redirect(back);
    redirect(`${back}&e=${result.problem}`);
  }
  redirect('/log-in?verified=1');
}
