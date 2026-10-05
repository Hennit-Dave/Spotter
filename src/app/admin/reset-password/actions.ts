'use server';

import { redirect } from 'next/navigation';
import { getDb } from '@/server/db';
import { hashPassword, isAcceptablePassword } from '@/server/auth/password';
import { consumeToken, findUsableToken } from '@/server/auth/tokens';

function text(formData: FormData, name: string): string {
  const value = formData.get(name);
  return typeof value === 'string' ? value : '';
}

export async function resetPassword(formData: FormData): Promise<void> {
  const token = text(formData, 'token');
  const password = text(formData, 'password');
  const confirm = text(formData, 'confirm');
  const back = `/admin/reset-password?token=${encodeURIComponent(token)}`;

  if (token === '') redirect('/admin/forgot-password');
  if (!isAcceptablePassword(password)) redirect(`${back}&e=short`);
  if (password !== confirm) redirect(`${back}&e=mismatch`);

  const passwordHash = await hashPassword(password);

  // Using the link and setting the password are one transaction. Adding one to the session
  // version ends every other session for this person. A link that belongs to a member
  // account is left alone: it is not usable here.
  const done = await getDb().$transaction(async (tx) => {
    const usable = await findUsableToken(tx, token, 'RESET');
    if (!usable?.staffId) return false;
    const owner = await consumeToken(tx, token, 'RESET');
    if (!owner?.staffId) return false;
    await tx.staff.update({
      where: { id: owner.staffId },
      data: { passwordHash, sessionVersion: { increment: 1 } },
    });
    return true;
  });

  if (!done) redirect(`${back}&e=expired`);
  redirect('/admin/log-in?reset=1');
}
