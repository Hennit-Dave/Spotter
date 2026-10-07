import { Form, NavLink, TextField, type AuthNotice } from './AuthCard';
import { AuthFrame } from './AuthFrame';
import { SubmitWhenValid } from './SubmitWhenValid';
import { logIn } from '@/app/(account)/auth/actions';

const NOTICES: Record<string, AuthNotice> = {
  invalid: { tone: 'error', text: 'That email and password did not match.' },
  paused: {
    tone: 'error',
    text: 'Too many tries. Wait ten minutes and try again.',
  },
  reset: { tone: 'info', text: 'Your password is changed. Log in.' },
  verified: { tone: 'info', text: 'Your account is ready. Log in.' },
};

export function LogInView({
  e,
  reset,
  verified,
}: {
  e?: string;
  reset?: string;
  verified?: string;
}) {
  const notice = e ? NOTICES[e] : reset ? NOTICES.reset : verified ? NOTICES.verified : undefined;

  return (
    <AuthFrame title="Log in" notice={notice}>
      <Form action={logIn}>
        <TextField
          name="email"
          label="Email"
          type="email"
          autoComplete="username"
          checkEmail
        />
        <TextField
          name="password"
          label="Password"
          type="password"
          autoComplete="current-password"
        />
        <SubmitWhenValid pendingLabel="Logging in">Log in</SubmitWhenValid>
      </Form>
      <NavLink href="/auth?view=forgot-password">Forgot password</NavLink>
      <NavLink href="/auth?view=sign-up">Create account</NavLink>
    </AuthFrame>
  );
}
