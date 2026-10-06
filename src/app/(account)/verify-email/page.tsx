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
import { RadioField } from '@/components/account/RadioField';
import { getDb } from '@/server/db';
import { loadVerificationDetails } from '@/server/auth/verify';
import { verifyEmail } from './actions';

// The link carries the token in the address, so it must not be passed on as a referrer.
export const metadata: Metadata = {
  title: 'Verify email',
  referrer: 'no-referrer',
  robots: { index: false, follow: false },
};

const NOTICES: Record<string, AuthNotice> = {
  name: { tone: 'error', text: 'Enter your name.' },
  phone: {
    tone: 'error',
    text: 'Enter a phone number we can use, for example 0807 465 2543 or +234 807 465 2543.',
  },
  answer: { tone: 'error', text: 'Choose Yes or No.' },
  short: {
    tone: 'error',
    text: 'Use at least 8 characters for your password.',
  },
  mismatch: { tone: 'error', text: 'The two passwords do not match.' },
};

export default async function VerifyEmailPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string; e?: string }>;
}) {
  const { token, e } = await searchParams;
  const details = token ? await loadVerificationDetails(getDb(), token) : null;

  // A used, expired or unknown link shows nothing about any account.
  if (!token || !details) {
    return (
      <AuthCard title="This link no longer works">
        <Text>It has expired or was already used. Ask for a new one.</Text>
        <NavLink href="/sign-up?sent=1">Send a new link</NavLink>
        <NavLink href="/log-in">Log in</NavLink>
      </AuthCard>
    );
  }

  return (
    <AuthCard title="Check your details" notice={e ? NOTICES[e] : undefined}>
      <Text>Correct anything that is wrong, then choose a password.</Text>
      <Form action={verifyEmail}>
        <input type="hidden" name="token" value={token} />
        <TextField
          name="name"
          label="Name"
          type="text"
          autoComplete="name"
          maxLength={100}
          defaultValue={details.name}
        />
        <TextField
          name="phone"
          label="Phone"
          type="tel"
          autoComplete="tel"
          maxLength={30}
          defaultValue={details.phone}
        />
        <RadioField
          name="answer"
          legend="Already a member at the gym?"
          defaultValue={details.claimsExistingMember ? 'yes' : 'no'}
          options={[
            { value: 'yes', label: 'Yes' },
            { value: 'no', label: 'No' },
          ]}
        />
        <TextField name="password" label="Password" type="password" autoComplete="new-password" />
        <TextField
          name="confirm"
          label="Type it again"
          type="password"
          autoComplete="new-password"
        />
        <PendingButton pendingLabel="Saving">Confirm and create my account</PendingButton>
      </Form>
    </AuthCard>
  );
}
