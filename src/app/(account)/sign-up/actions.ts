'use server';

import { after } from 'next/server';
import { redirect } from 'next/navigation';
import { getDb } from '@/server/db';
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
  });
  if (!checked.ok) redirect(`/sign-up?e=${checked.problem}`);

  after(async () => {
    try {
      await processSignUp(getDb(), checked.value);
    } catch {
      console.error('Sign up failed');
    }
  });
  redirect('/sign-up?sent=1');
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
  redirect('/sign-up?sent=1&again=1');
}
