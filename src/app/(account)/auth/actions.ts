'use server';

import { after } from 'next/server';
import { redirect } from 'next/navigation';
import { getDb } from '@/server/db';
import { checkMemberLogin } from '@/server/auth/member-login';
import { requestMemberReset } from '@/server/auth/member-reset';
import { startMemberSession } from '@/server/auth/member-session';
import { processSignUp, requestFreshVerificationLink, validateSignUp } from '@/server/auth/signup';

function text(formData: FormData, name: string): string {
  const value = formData.get(name);
  return typeof value === 'string' ? value : '';
}

// The person gets the same confirmation for a new email, an unverified one and an active one.
// A form that cannot be read is sent back with the field to fix, which says nothing about any
// account. The write, the limit and the email run after the response, so the page's timing
// does not reveal whether the email already has an account.
export async function signUp(formData: FormData): Promise<void> {
  const checked = validateSignUp({
    name: text(formData, 'name'),
    email: text(formData, 'email'),
    phone: text(formData, 'phone'),
    answer: text(formData, 'answer'),
    acceptedTerms: text(formData, 'terms') === 'accepted',
  });
  if (!checked.ok) redirect(`/auth?view=sign-up&e=${checked.problem}`);

  after(async () => {
    try {
      await processSignUp(getDb(), checked.value);
    } catch {
      console.error('Sign up failed');
    }
  });
  redirect('/auth?view=sign-up&sent=1');
}

export async function resendLink(formData: FormData): Promise<void> {
  const email = text(formData, 'email');
  after(async () => {
    try {
      await requestFreshVerificationLink(getDb(), email);
    } catch {
      console.error('Verification email failed');
    }
  });
  redirect('/auth?view=sign-up&sent=1&again=1');
}

export async function logIn(formData: FormData): Promise<void> {
  const result = await checkMemberLogin(
    getDb(),
    text(formData, 'email'),
    text(formData, 'password'),
  );
  if (!result.ok) redirect(`/auth?view=log-in&e=${result.reason}`);

  await startMemberSession(result.account);
  redirect('/');
}

// The person always gets the same confirmation. The limit, the lookup and the email run after
// the response is sent, so neither the page's timing nor its message reveals whether the email
// has an account.
export async function requestPasswordReset(formData: FormData): Promise<void> {
  const email = text(formData, 'email');

  after(async () => {
    try {
      await requestMemberReset(getDb(), email);
    } catch {
      console.error('Password reset email failed');
    }
  });

  redirect('/auth?view=forgot-password&sent=1');
}
