'use server';

import { after } from 'next/server';
import { redirect } from 'next/navigation';
import { getDb } from '@/server/db';
import { requestMemberReset } from '@/server/auth/member-reset';

// The person always gets the same confirmation. The limit, the lookup and the email run after
// the response is sent, so neither the page's timing nor its message reveals whether the email
// has an account.
export async function requestPasswordReset(formData: FormData): Promise<void> {
  const raw = formData.get('email');
  const email = typeof raw === 'string' ? raw : '';

  after(async () => {
    try {
      await requestMemberReset(getDb(), email);
    } catch {
      console.error('Password reset email failed');
    }
  });

  redirect('/forgot-password?sent=1');
}
