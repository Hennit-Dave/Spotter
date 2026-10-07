import { Form, NavLink, PendingButton, Text, TextField } from './AuthCard';
import { AuthFrame } from './AuthFrame';
import { requestPasswordReset } from '@/app/(account)/auth/actions';

export function ForgotPasswordView({ sent }: { sent?: string }) {
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
      <NavLink href="/auth?view=log-in">Back to log in</NavLink>
    </AuthFrame>
  );
}
