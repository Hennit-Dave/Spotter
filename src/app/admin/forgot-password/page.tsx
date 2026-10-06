import type { Metadata } from 'next';
import {
  AuthCard,
  Form,
  NavLink,
  SubmitButton,
  Text,
  TextField,
} from '@/components/admin/AuthCard';
import { requestPasswordReset } from './actions';

export const metadata: Metadata = { title: 'Forgot password' };

export default async function AdminForgotPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ sent?: string }>;
}) {
  const { sent } = await searchParams;

  return (
    <AuthCard
      title="Forgot password"
      notice={
        sent
          ? {
              tone: 'info',
              text: 'If that email belongs to a desk account, a link is on its way. It works once and expires in one hour.',
            }
          : undefined
      }
    >
      <Text>
        Enter your email. A new account has no password yet, so use this to set one.
      </Text>
      <Form action={requestPasswordReset}>
        <TextField name="email" label="Email" type="email" autoComplete="username" />
        <SubmitButton>Send link</SubmitButton>
      </Form>
      <NavLink href="/admin/log-in">Back to sign in</NavLink>
    </AuthCard>
  );
}
