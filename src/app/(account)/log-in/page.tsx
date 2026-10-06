import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import {
  AuthCard,
  Form,
  NavLink,
  PendingButton,
  TextField,
  type AuthNotice,
} from '@/components/account/AuthCard';
import { getSignedInMember } from '@/server/auth/member-session';
import { logIn } from './actions';

const NOTICES: Record<string, AuthNotice> = {
  invalid: { tone: 'error', text: 'That email and password did not match.' },
  paused: {
    tone: 'error',
    text: 'Too many tries. Wait ten minutes and try again.',
  },
  reset: { tone: 'info', text: 'Your password is changed. Log in.' },
  verified: { tone: 'info', text: 'Your account is ready. Log in.' },
};

export const metadata: Metadata = { title: 'Log in' };

export default async function LogInPage({
  searchParams,
}: {
  searchParams: Promise<{ e?: string; reset?: string; verified?: string }>;
}) {
  if (await getSignedInMember()) redirect('/');

  const { e, reset, verified } = await searchParams;
  const notice = e ? NOTICES[e] : reset ? NOTICES.reset : verified ? NOTICES.verified : undefined;

  return (
    <AuthCard title="Log in" notice={notice}>
      <Form action={logIn}>
        <TextField name="email" label="Email" type="email" autoComplete="username" />
        <TextField
          name="password"
          label="Password"
          type="password"
          autoComplete="current-password"
        />
        <PendingButton pendingLabel="Logging in">Log in</PendingButton>
      </Form>
      <NavLink href="/forgot-password">Forgot password</NavLink>
      <NavLink href="/sign-up">Create account</NavLink>
    </AuthCard>
  );
}
