// The full-name rule for the form: at least two characters, in at least two names separated by
// a space. The server runs the same rule again (server/auth/signup.ts).
export const FULL_NAME_MESSAGE = 'Enter your first and last name';

export function isFullName(raw: string): boolean {
  const name = raw.trim().replace(/\s+/g, ' ');
  return name.length >= 2 && name.split(' ').length >= 2;
}
