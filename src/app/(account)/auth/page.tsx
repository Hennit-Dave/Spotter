import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { ForgotPasswordView } from '@/components/account/ForgotPasswordView';
import { LogInView } from '@/components/account/LogInView';
import { SignUpView } from '@/components/account/SignUpView';
import { getSignedInMember } from '@/server/auth/member-session';

type AuthParams = {
  view?: string;
  e?: string;
  sent?: string;
  again?: string;
  reset?: string;
  verified?: string;
};

type AuthProps = { searchParams: Promise<AuthParams> };

type AuthView = 'sign-up' | 'log-in' | 'forgot-password';

// Any other value, or none, opens log in.
function authView(view: string | undefined): AuthView {
  return view === 'sign-up' || view === 'forgot-password' ? view : 'log-in';
}

export async function generateMetadata({ searchParams }: AuthProps): Promise<Metadata> {
  const { view, sent } = await searchParams;
  switch (authView(view)) {
    case 'sign-up':
      return { title: sent ? 'Check your email' : 'Create account' };
    case 'forgot-password':
      return { title: 'Forgot password' };
    default:
      return { title: 'Log in' };
  }
}

export default async function AuthPage({ searchParams }: AuthProps) {
  const params = await searchParams;
  const view = authView(params.view);

  if (view !== 'forgot-password' && (await getSignedInMember())) redirect('/');

  switch (view) {
    case 'sign-up':
      return <SignUpView e={params.e} sent={params.sent} again={params.again} />;
    case 'forgot-password':
      return <ForgotPasswordView sent={params.sent} />;
    default:
      return <LogInView e={params.e} reset={params.reset} verified={params.verified} />;
  }
}
