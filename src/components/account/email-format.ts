// The email format check for the form. It matches the server's check (server/auth/email.ts),
// which this file cannot import. The server runs it again on every sign-up.
export const EMAIL_MESSAGE = 'Enter a valid email address';

export function isValidEmail(raw: string): boolean {
  const email = raw.trim().toLowerCase();
  return email.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}
