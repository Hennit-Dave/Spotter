import type { Metadata } from 'next';
import {
  Form,
  NavLink,
  PendingButton,
  Text,
  TextField,
} from '@/components/account/AuthCard';
import { AuthFrame } from '@/components/account/AuthFrame';
import { requestPasswordReset } from './actions';

export const metadata: Metadata = { title: 'Forgot password' };

export default async function ForgotPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ sent?: string }>;
}) {
  const { sent } = await searchParams;

  return (
    <AuthFrame
      title="Forgot password"
      notice={
        sent
          ? {
              tone: 'info',
              text: 'If that email belongs to an account, a link is on its way. It works once and expires in one hour.',
            }
          : undefined
      }
    >
      <Text>Enter your email and we will send a link to choose a new password.</Text>
      <Form action={requestPasswordReset}>
        <TextField name="email" label="Email" type="email" autoComplete="username" />
        <PendingButton pendingLabel="Sending">Send link</PendingButton>
      </Form>
      <NavLink href="/log-in">Back to log in</NavLink>
    </AuthFrame>
  );
}
