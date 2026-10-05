import { Resend } from 'resend';

export type AccountEmailKind = 'verify' | 'reset';

export function normaliseEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function isPlausibleEmail(email: string): boolean {
  return email.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// Builds a link on the app's own trusted address. The request's Host header is not used,
// because a forged one could point a reset link at someone else's site.
export function buildLink(path: string, token: string): string {
  const base = process.env.APP_URL;
  if (!base) {
    throw new Error('APP_URL is not set');
  }
  const url = new URL(path, base);
  url.searchParams.set('token', token);
  return url.toString();
}

const SUBJECTS: Record<AccountEmailKind, string> = {
  verify: 'Confirm your Spotter email',
  reset: 'Reset your Spotter password',
};

function body(kind: AccountEmailKind, link: string): string {
  if (kind === 'verify') {
    return `Open this link to confirm your email. It works once and expires in 24 hours.\n\n${link}\n\nIf you did not create a Spotter account, ignore this email.`;
  }
  return `Open this link to set a new Spotter password. It works once and expires in one hour.\n\n${link}\n\nIf you did not ask for this, ignore this email.`;
}

// The only function in the app that sends email. It sends exactly the two kinds the person
// just asked for. Returns whether the provider accepted it. It never logs the link or the key.
export async function sendAccountEmail(
  kind: AccountEmailKind,
  to: string,
  link: string,
): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;
  if (!apiKey || !from) {
    console.error('Account email not sent: RESEND_API_KEY or EMAIL_FROM is not set');
    return false;
  }
  const { error } = await new Resend(apiKey).emails.send({
    from,
    to,
    subject: SUBJECTS[kind],
    text: body(kind, link),
  });
  if (error) {
    console.error(`Account email not sent: provider error ${error.name}`);
    return false;
  }
  return true;
}
