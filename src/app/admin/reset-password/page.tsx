import type { Metadata } from 'next';
import {
  AuthCard,
  Form,
  NavLink,
  SubmitButton,
  Text,
  TextField,
  type AuthNotice,
} from '@/components/admin/AuthCard';
import { getDb } from '@/server/db';
import { findUsableToken } from '@/server/auth/tokens';
import { resetPassword } from './actions';

// The link carries the token in the address, so it must not be passed on as a referrer.
export const metadata: Metadata = { referrer: 'no-referrer' };

const NOTICES: Record<string, AuthNotice> = {
  short: { tone: 'error', text: 'Use at least 8 characters.' },
  mismatch: { tone: 'error', text: 'The two passwords do not match.' },
};

export default async function AdminResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string; e?: string }>;
}) {
  const { token, e } = await searchParams;
  const usable = token
    ? await findUsableToken(getDb(), token, 'RESET')
    : null;

  if (!token || !usable?.staffId) {
    return (
      <AuthCard title="This link no longer works">
        <Text>It has expired or was already used. Ask for a new one.</Text>
        <NavLink href="/admin/forgot-password">Send a new link</NavLink>
      </AuthCard>
    );
  }

  return (
    <AuthCard title="Set a password" notice={e ? NOTICES[e] : undefined}>
      <Text>Use at least 8 characters.</Text>
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
        <SubmitButton>Set password</SubmitButton>
      </Form>
    </AuthCard>
  );
}
