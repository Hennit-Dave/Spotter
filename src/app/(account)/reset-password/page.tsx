import type { Metadata } from 'next';
import {
  AuthCard,
  Form,
  NavLink,
  PendingButton,
  Text,
  TextField,
  type AuthNotice,
} from '@/components/account/AuthCard';
import { getDb } from '@/server/db';
import { findUsableToken } from '@/server/auth/tokens';
import { resetPassword } from './actions';

// The link carries the token in the address, so it must not be passed on as a referrer.
export const metadata: Metadata = {
  title: 'Reset password',
  referrer: 'no-referrer',
  robots: { index: false, follow: false },
};

const NOTICES: Record<string, AuthNotice> = {
  short: { tone: 'error', text: 'Use at least 8 characters.' },
  mismatch: { tone: 'error', text: 'The two passwords do not match.' },
};

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string; e?: string }>;
}) {
  const { token, e } = await searchParams;
  const usable = token ? await findUsableToken(getDb(), token, 'RESET') : null;

  if (!token || !usable?.accountId) {
    return (
      <AuthCard title="This link no longer works">
        <Text>It has expired or was already used. Ask for a new one.</Text>
        <NavLink href="/forgot-password">Send a new link</NavLink>
      </AuthCard>
    );
  }

  return (
    <AuthCard title="Choose a new password" notice={e ? NOTICES[e] : undefined}>
      <Text>Use at least 8 characters. Choosing a new password logs you out everywhere else.</Text>
      <Form action={resetPassword}>
        <input type="hidden" name="token" value={token} />
        <TextField
          name="password"
          label="New password"
          type="password"
          autoComplete="new-password"
        />
        <TextField
          name="confirm"
          label="Type it again"
          type="password"
          autoComplete="new-password"
        />
        <PendingButton pendingLabel="Saving">Set password</PendingButton>
      </Form>
    </AuthCard>
  );
}
