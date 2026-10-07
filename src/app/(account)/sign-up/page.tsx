import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import {
  Form,
  NavLink,
  PendingButton,
  Text,
  TextField,
  type AuthNotice,
} from '@/components/account/AuthCard';
import { AuthFrame } from '@/components/account/AuthFrame';
import { RadioField } from '@/components/account/RadioField';
import { getSignedInMember } from '@/server/auth/member-session';
import { resendLink, signUp } from './actions';

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<{ sent?: string }>;
}): Promise<Metadata> {
  const { sent } = await searchParams;
  return { title: sent ? 'Check your email' : 'Create account' };
}

const NOTICES: Record<string, AuthNotice> = {
  name: { tone: 'error', text: 'Enter your name.' },
  email: { tone: 'error', text: 'Enter a valid email address.' },
  phone: {
    tone: 'error',
    text: 'Enter a phone number we can use, for example 0807 465 2543 or +234 807 465 2543.',
  },
  answer: { tone: 'error', text: 'Choose Yes or No.' },
};

export default async function SignUpPage({
  searchParams,
}: {
  searchParams: Promise<{ e?: string; sent?: string; again?: string }>;
}) {
  if (await getSignedInMember()) redirect('/');

  const { e, sent, again } = await searchParams;

  if (sent) {
    return (
      <AuthFrame
        title="Check your email"
        notice={
          again
            ? {
                tone: 'info',
                text: 'If we can send a new link, it is on its way.',
              }
            : undefined
        }
      >
        <Text>
          We have emailed you a link. Open it to check your details and choose a password. The link
          works once and expires in 24 hours.
        </Text>
        <Text>Nothing arrived? Enter your email and we will send a new link.</Text>
        <Form action={resendLink}>
          <TextField name="email" label="Email" type="email" autoComplete="email" />
          <PendingButton pendingLabel="Sending">Send a new link</PendingButton>
        </Form>
        <NavLink href="/log-in">Log in</NavLink>
      </AuthFrame>
    );
  }

  return (
    <AuthFrame title="Create account" notice={e ? NOTICES[e] : undefined}>
      <Form action={signUp}>
        <TextField name="name" label="Name" type="text" autoComplete="name" maxLength={100} />
        <TextField name="email" label="Email" type="email" autoComplete="email" />
        <TextField name="phone" label="Phone" type="tel" autoComplete="tel" maxLength={30} />
        <RadioField
          name="answer"
          legend="Already a member at the gym?"
          options={[
            { value: 'yes', label: 'Yes' },
            { value: 'no', label: 'No' },
          ]}
        />
        <PendingButton pendingLabel="Creating">Create account</PendingButton>
      </Form>
      <NavLink href="/log-in">Log in</NavLink>
    </AuthFrame>
  );
}
