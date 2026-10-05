'use server';

import { after } from 'next/server';
import { redirect } from 'next/navigation';
import { getDb } from '@/server/db';
import {
  buildLink,
  isPlausibleEmail,
  normaliseEmail,
  sendAccountEmail,
} from '@/server/auth/email';
import { RESET_TOKEN_LIFETIME_MS, issueToken } from '@/server/auth/tokens';

// The person always gets the same confirmation. The lookup and the email run after the
// response is sent, so how long the page takes does not reveal whether the email has an account.
export async function requestPasswordReset(formData: FormData): Promise<void> {
  const raw = formData.get('email');
  const email = normaliseEmail(typeof raw === 'string' ? raw : '');

  if (isPlausibleEmail(email)) {
    after(async () => {
      try {
        const db = getDb();
        const staff = await db.staff.findUnique({
          where: { email },
          select: { id: true, active: true },
        });
        if (!staff || !staff.active) return;
        const token = await issueToken(
          db,
          { staffId: staff.id },
          'RESET',
          RESET_TOKEN_LIFETIME_MS,
        );
        await sendAccountEmail(
          'reset',
          email,
          buildLink('/admin/reset-password', token),
        );
      } catch {
        console.error('Password reset email failed');
      }
    });
  }

  redirect('/admin/forgot-password?sent=1');
}
