import { redirect } from 'next/navigation';
import {
  AuthCard,
  Form,
  NavLink,
  SubmitButton,
  TextField,
  type AuthNotice,
} from '@/components/admin/AuthCard';
import { getAdminStaff } from '@/server/auth/admin-session';
import { signIn } from './actions';

const NOTICES: Record<string, AuthNotice> = {
  invalid: { tone: 'error', text: 'That email and password did not match.' },
  paused: {
    tone: 'error',
    text: 'Too many tries. Wait ten minutes and try again.',
  },
  reset: { tone: 'info', text: 'Your password is set. Sign in.' },
};

export default async function AdminLogInPage({
  searchParams,
}: {
  searchParams: Promise<{ e?: string; reset?: string }>;
}) {
  if (await getAdminStaff()) redirect('/admin');

  const { e, reset } = await searchParams;
  const notice = e ? NOTICES[e] : reset ? NOTICES.reset : undefined;

  return (
    <AuthCard title="Sign in to Spotter desk" notice={notice}>
      <Form action={signIn}>
        <TextField name="email" label="Email" type="email" autoComplete="username" />
        <TextField
          name="password"
          label="Password"
          type="password"
          autoComplete="current-password"
        />
        <SubmitButton>Sign in</SubmitButton>
      </Form>
      <NavLink href="/admin/forgot-password">Forgot password</NavLink>
    </AuthCard>
  );
}
